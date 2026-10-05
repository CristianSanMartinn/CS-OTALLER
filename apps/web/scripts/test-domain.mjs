/* Pruebas de reglas de negocio mock, sin navegador ni backend. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
const browserStorage = new Map();
const localStorage = {
  getItem: (key) => browserStorage.get(key) ?? null,
  setItem: (key, value) => browserStorage.set(key, value),
};
function load(relative) {
  const filename = path.resolve(
    root,
    relative.endsWith(".ts") ? relative : relative + ".ts",
  );
  if (cache.has(filename)) return cache.get(filename);
  const result = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const requireLocal = (request) => {
    const target = request.startsWith("@/")
      ? request.slice(2)
      : path.relative(root, path.resolve(path.dirname(filename), request));
    return load(target);
  };
  vm.runInNewContext(source, {
    exports: result.exports,
    module: result,
    require: requireLocal,
    crypto: webcrypto,
    Date,
    Intl,
    URL,
    console,
    localStorage,
    window: {},
  });
  cache.set(filename, result.exports);
  return result.exports;
}
const { createMockData } = load("features/shared/services/mockData");
const { scopedData, canChangeStatus } = load(
  "features/shared/services/permissions",
);
const { saveOrder } = load("features/ordenes/services/orderService");
const { authService, DEMO_PASSWORD } = load(
  "features/auth/services/authService",
);
let count = 0;
function test(name, run) {
  run();
  count++;
  console.log("✓ " + name);
}
const data = createMockData();
const admin = data.users.find((u) => u.role === "ADMIN");
const worker = data.users.find((u) => u.id === "u2");
const order = data.orders.find((o) => o.id === "o1");
test("El mecánico solo ve sus órdenes y vehículos relacionados", () => {
  const scoped = scopedData(data, worker);
  assert.ok(scoped.orders.length > 0);
  assert.ok(scoped.orders.every((o) => o.mechanicId === worker.id));
  assert.ok(
    scoped.vehicles.every((v) =>
      scoped.orders.some((o) => o.vehicleId === v.id),
    ),
  );
  assert.equal(
    scoped.orders.some((o) => o.id === "o2"),
    false,
  );
});
test("Ni administrador ni mecánico reciben entidades de otro taller", () => {
  const foreign = {
    ...data,
    customers: [
      ...data.customers,
      { ...data.customers[0], id: "foreign", workshopId: "another" },
    ],
    orders: [
      ...data.orders,
      { ...order, id: "foreign", workshopId: "another" },
    ],
  };
  for (const user of [admin, worker]) {
    const scoped = scopedData(foreign, user);
    assert.ok(scoped.customers.every((c) => c.workshopId === user.workshopId));
    assert.ok(scoped.orders.every((o) => o.workshopId === user.workshopId));
  }
});
test("El mecánico puede marcar su reparación como lista, pero no entregarla", () => {
  assert.equal(canChangeStatus(worker, order, "READY"), true);
  assert.equal(canChangeStatus(worker, order, "DELIVERED"), false);
  assert.throws(() =>
    saveOrder(data, worker, { ...order, status: "DELIVERED" }),
  );
});
test("Un trabajador no puede editar una orden ajena ni reasignársela", () => {
  const foreign = data.orders.find((o) => o.id === "o2");
  assert.throws(() =>
    saveOrder(data, worker, { ...foreign, mechanicId: worker.id }),
  );
});
test("Se rechaza la relación incorrecta entre propietario y vehículo", () => {
  assert.throws(() => saveOrder(data, admin, { ...order, customerId: "c2" }));
});
test("No se puede retroceder el kilometraje registrado", () => {
  assert.throws(() =>
    saveOrder(data, admin, { ...order, mileage: order.mileage - 1 }),
  );
});
test("Guardar una orden actualiza el kilometraje y registra actividad", () => {
  const next = saveOrder(data, worker, {
    ...order,
    mileage: order.mileage + 10,
    status: "READY",
  });
  assert.equal(
    next.vehicles.find((v) => v.id === order.vehicleId).mileage,
    order.mileage + 10,
  );
  assert.equal(next.orders.find((o) => o.id === order.id).status, "READY");
  assert.equal(next.activity.length, data.activity.length + 1);
  assert.equal(data.orders.find((o) => o.id === order.id).status, "IN_REPAIR");
});
test("El administrador puede completar la entrega", () => {
  const next = saveOrder(data, admin, { ...order, status: "DELIVERED" });
  assert.equal(next.orders.find((o) => o.id === order.id).status, "DELIVERED");
});
test("El trabajador no puede modificar importes existentes", () => {
  const next = saveOrder(data, worker, {
    ...order,
    services: order.services.map((s) => ({ ...s, price: 999999 })),
  });
  assert.equal(
    next.orders.find((o) => o.id === order.id).services[0].price,
    order.services[0].price,
  );
});
test("La numeración se calcula con todas las órdenes del taller", () => {
  const next = saveOrder(data, worker, {
    ...order,
    id: "new-order",
    number: "OT-1048",
    status: "RECEIVED",
  });
  assert.equal(next.orders[0].number, "OT-1049");
  assert.equal(
    new Set(next.orders.map((o) => o.number)).size,
    next.orders.length,
  );
});
test("Los precios negativos y cantidades inválidas son rechazados", () => {
  assert.throws(() =>
    saveOrder(data, admin, {
      ...order,
      parts: [{ ...order.parts[0], quantity: 0 }],
    }),
  );
  assert.throws(() =>
    saveOrder(data, admin, {
      ...order,
      services: [{ ...order.services[0], price: -1 }],
    }),
  );
});
test("El login rechaza contraseñas incorrectas y cuentas inactivas", () => {
  assert.equal(
    authService.login(admin.email, DEMO_PASSWORD, data.users).id,
    admin.id,
  );
  assert.throws(() => authService.login(admin.email, "wrong", data.users));
  assert.throws(() =>
    authService.login("andres@otaller.cl", DEMO_PASSWORD, data.users),
  );
});
test("Las credenciales temporales se mantienen fuera del modelo de usuario", () => {
  const user = { ...worker, id: "new-user", email: "new@example.test" };
  authService.registerCredential(user.id, "Temporal123!");
  assert.equal(
    authService.login(user.email, "Temporal123!", [user]).id,
    user.id,
  );
  assert.throws(() => authService.login(user.email, DEMO_PASSWORD, [user]));
  assert.equal("password" in user, false);
});

const { latestMaintenance, maintenanceReminder } = load(
  "features/mantenciones/services/reminderService",
);
const { customerVehicle } = load(
  "features/portal-cliente/services/customerPortalService",
);
test("Recordatorios distinguen vencido, cercano y programado por fecha o km", () => {
  const m = {
    ...data.maintenance[0],
    nextDate: "2026-11-01",
    nextMileage: 170000,
  };
  assert.equal(maintenanceReminder(m, 150000, "2026-11-01").status, "due");
  assert.equal(maintenanceReminder(m, 170000, "2026-09-01").status, "due");
  assert.equal(maintenanceReminder(m, 150000, "2026-10-02").status, "soon");
  assert.equal(maintenanceReminder(m, 169000, "2026-09-01").status, "soon");
  assert.equal(
    maintenanceReminder(m, 150000, "2026-09-01").status,
    "scheduled",
  );
});
test("La nueva mantención reemplaza el aviso anterior solo para su tipo y vehículo", () => {
  const first = data.maintenance[0];
  const current = {
    ...first,
    id: "new",
    date: "2026-10-01",
    nextDate: "2027-04-01",
  };
  const brakes = { ...first, id: "brakes", type: "Pastillas de freno" };
  const other = { ...first, id: "other", vehicleId: "v2" };
  const latest = latestMaintenance([first, current, brakes, other]);
  assert.equal(latest.length, 3);
  assert.ok(!latest.some((m) => m.id === first.id));
});
test("La ficha cliente no expone precios ni datos administrativos del propietario", () => {
  const view = customerVehicle(data, "demo-v1");
  assert.ok(view);
  assert.equal(view.vehicle.id, "v1");
  assert.equal("customers" in view, false);
  assert.equal("customerId" in view.vehicle, false);
  assert.equal("price" in view.orders[0].services[0], false);
  assert.equal("mechanicId" in view.orders[0], false);
  assert.equal("userId" in (view.photos[0] ?? {}), false);
  assert.ok(view.orders.every((o) => o.id === "o1"));
  assert.equal(customerVehicle(data, "invalid"), null);
  assert.equal(customerVehicle(data, "demo-unknown"), null);
});
test("La ficha cliente excluye registros con el mismo vehículo pero de otro taller", () => {
  const foreign = {
    ...data,
    orders: [
      ...data.orders,
      { ...data.orders[0], id: "foreign", workshopId: "other" },
    ],
    maintenance: [
      ...data.maintenance,
      { ...data.maintenance[0], id: "foreign", workshopId: "other" },
    ],
  };
  const view = customerVehicle(foreign, "demo-v1");
  assert.ok(view);
  assert.equal(
    view.orders.some((o) => o.id === "foreign"),
    false,
  );
  assert.equal(
    view.maintenance.some((m) => m.id === "foreign"),
    false,
  );
});
test("La galería cliente reúne fotos del vehículo y sus órdenes sin identificar trabajadores", () => {
  const p = {
    id: "vp",
    url: "data:image/png;base64,test",
    category: "BEFORE",
    description: "Recepción",
    date: "2026-10-01",
    userId: "u1",
  };
  const mock = {
    ...data,
    vehicles: data.vehicles.map((v) =>
      v.id === "v1" ? { ...v, photos: [p] } : v,
    ),
    orders: data.orders.map((o) =>
      o.id === "o1"
        ? { ...o, photos: [{ ...p, id: "op", category: "AFTER" }] }
        : o,
    ),
  };
  const view = customerVehicle(mock, "demo-v1");
  assert.equal(view.photos.length, 2);
  assert.ok(view.photos.every((p) => !("userId" in p)));
});

const { clientAccessToken, clientAccessPath, clientAccess, clientVehicle } =
  load("features/portal-cliente/services/clientAccessService");
const {
  defaultReminderPreferences,
  validateReminderPreferences,
  withConsentTimestamp,
} = load("features/clientes/services/reminderPreferences");
const { buildReminderPreview } = load(
  "features/clientes/services/reminderPreviewService",
);
test("El QR del cliente muestra Toyota y Mazda sin datos personales", () => {
  const client = data.customers.find((c) => c.id === "c1");
  const view = clientAccess(data, clientAccessToken(client));
  assert.equal(view.vehicles.length, 2);
  assert.ok(view.vehicles.some((v) => v.id === "v1"));
  assert.ok(view.vehicles.some((v) => v.id === "v7"));
  for (const field of [
    "name",
    "rut",
    "phone",
    "email",
    "address",
    "reminderPreferences",
  ])
    assert.equal(field in view, false);
  assert.equal(
    view.vehicles.some((v) => v.id === "v2"),
    false,
  );
});
test("Cada cliente tiene un código diferente que no cambia por patente, RUT o mantención", () => {
  const client = data.customers[0];
  assert.notEqual(
    clientAccessToken(client),
    clientAccessToken(data.customers[1]),
  );
  assert.equal(
    clientAccessPath(client),
    clientAccessPath({ ...client, rut: "otro", email: "nuevo@example.test" }),
  );
  const next = {
    ...data,
    vehicles: data.vehicles.map((v) =>
      v.id === "v1" ? { ...v, plate: "NUEVA-1" } : v,
    ),
    maintenance: [
      ...data.maintenance,
      { ...data.maintenance[0], id: "later", date: "2027-01-01" },
    ],
  };
  assert.equal(
    clientAccess(next, clientAccessToken(client)).vehicles.find(
      (v) => v.id === "v1",
    ).plate,
    "NUEVA-1",
  );
  assert.equal(
    clientVehicle(next, clientAccessToken(client), "v1").maintenance.length,
    2,
  );
  assert.equal(
    clientAccessToken({
      ...client,
      publicAccessToken: "custom-code",
      rut: "changed",
    }),
    "custom-code",
  );
});
test("Cambiar vehículo en la URL no permite ver otro cliente ni otro taller", () => {
  assert.ok(clientVehicle(data, "demo-client-c1", "v1"));
  assert.ok(clientVehicle(data, "demo-client-c1", "v7"));
  assert.equal(clientVehicle(data, "demo-client-c1", "v2"), null);
  assert.equal(clientAccess(data, "unknown"), null);
  const foreign = {
    ...data,
    vehicles: [
      ...data.vehicles,
      { ...data.vehicles[0], id: "foreign", workshopId: "other" },
    ],
  };
  assert.equal(clientVehicle(foreign, "demo-client-c1", "foreign"), null);
});
test("Las preferencias requieren consentimiento y contacto válido por canal", () => {
  const contact = { email: "cliente@example.test", phone: "+56 9 1234 5678" };
  assert.equal(
    validateReminderPreferences(defaultReminderPreferences, contact),
    null,
  );
  assert.ok(
    validateReminderPreferences(
      { ...defaultReminderPreferences, emailEnabled: true },
      contact,
    ),
  );
  assert.ok(
    validateReminderPreferences(
      { ...defaultReminderPreferences, consent: true, emailEnabled: true },
      { ...contact, email: "incorrecto" },
    ),
  );
  assert.ok(
    validateReminderPreferences(
      { ...defaultReminderPreferences, consent: true, whatsappEnabled: true },
      { ...contact, phone: "123" },
    ),
  );
  assert.equal(
    validateReminderPreferences(
      {
        ...defaultReminderPreferences,
        consent: true,
        emailEnabled: true,
        whatsappEnabled: true,
      },
      contact,
    ),
    null,
  );
});
test("Revocar autorización elimina la fecha y bloquea la simulación", () => {
  const previous = {
    ...defaultReminderPreferences,
    emailEnabled: true,
    consent: true,
    consentAt: "2026-10-01T12:00:00Z",
  };
  assert.equal(
    withConsentTimestamp(previous, previous).consentAt,
    previous.consentAt,
  );
  assert.equal(
    withConsentTimestamp({ ...previous, consent: false }, previous).consentAt,
    undefined,
  );
  const client = {
    ...data.customers[0],
    reminderPreferences: { ...previous, consent: false },
  };
  assert.equal(
    buildReminderPreview(
      client,
      data.vehicles[0],
      data.maintenance[0],
      "email",
      "http://localhost:3000",
    ).eligible,
    false,
  );
});
test("La vista previa calcula anticipación y usa el mismo enlace de cliente en ambos canales", () => {
  const client = {
    ...data.customers[0],
    reminderPreferences: {
      ...defaultReminderPreferences,
      emailEnabled: true,
      whatsappEnabled: true,
      consent: true,
      daysBefore: 7,
    },
  };
  const record = { ...data.maintenance[0], nextDate: "2026-11-01" };
  const email = buildReminderPreview(
    client,
    data.vehicles[0],
    record,
    "email",
    "https://demo.example",
  );
  const whatsapp = buildReminderPreview(
    client,
    data.vehicles[0],
    record,
    "whatsapp",
    "https://demo.example",
  );
  assert.equal(email.scheduledDate, "2026-10-25");
  assert.equal(email.eligible, true);
  assert.equal(whatsapp.eligible, true);
  assert.equal(email.url, whatsapp.url);
  assert.equal(email.url, "https://demo.example/mi-taller/demo-client-c1");
  assert.ok(email.text.includes(data.vehicles[0].plate));
  assert.ok(email.text.includes(email.url));
  assert.equal(email.destination, client.email);
});
test("El borrador de recordatorio rechaza asociaciones cruzadas", () => {
  assert.throws(() =>
    buildReminderPreview(
      data.customers[1],
      data.vehicles[0],
      data.maintenance[0],
      "email",
      "http://localhost:3000",
    ),
  );
  assert.throws(() =>
    buildReminderPreview(
      data.customers[0],
      data.vehicles[0],
      { ...data.maintenance[0], workshopId: "other" },
      "email",
      "http://localhost:3000",
    ),
  );
});

const { profileFields, saveUserProfile, persistProfile, restoreProfiles } =
  load("features/perfil/services/profileService");
test("Editar el perfil mantiene el rol y no cambia otros usuarios", () => {
  const updated = saveUserProfile(data, worker, {
    ...profileFields(worker),
    name: "Nuevo nombre",
    role: "ADMIN",
    active: false,
    workshopId: "other",
  });
  const own = updated.users.find((u) => u.id === worker.id);
  assert.equal(own.name, "Nuevo nombre");
  assert.equal(own.role, "WORKER");
  assert.equal(own.active, worker.active);
  assert.equal(own.workshopId, worker.workshopId);
  assert.equal(
    updated.users.find((u) => u.id === admin.id),
    admin,
  );
  assert.equal(data.users.find((u) => u.id === worker.id).name, worker.name);
});
test("El perfil rechaza asociaciones de otro taller y correos duplicados", () => {
  assert.throws(() =>
    saveUserProfile(
      data,
      { ...worker, workshopId: "other" },
      profileFields(worker),
    ),
  );
  assert.throws(() =>
    saveUserProfile(data, worker, {
      ...profileFields(worker),
      email: admin.email,
    }),
  );
  assert.throws(() =>
    saveUserProfile(data, worker, {
      ...profileFields(worker),
      avatarUrl: "data:image/svg+xml;base64,PHN2Zz4=",
    }),
  );
});
test("El perfil se conserva al restaurar sin guardar permisos ni contraseñas", () => {
  browserStorage.clear();
  const updated = saveUserProfile(data, admin, {
    ...profileFields(admin),
    name: "Perfil guardado",
    email: "perfil@otaller.cl",
  });
  persistProfile(updated.users.find((u) => u.id === admin.id));
  const restored = restoreProfiles(createMockData());
  assert.equal(
    restored.users.find((u) => u.id === admin.id).name,
    "Perfil guardado",
  );
  assert.equal(
    restored.users.find((u) => u.id === admin.id).email,
    "perfil@otaller.cl",
  );
  const stored = JSON.parse(browserStorage.get("otaller.profiles.v1"))[0]
    .profile;
  assert.equal("role" in stored, false);
  assert.equal("password" in stored, false);
  browserStorage.set("otaller.profiles.v1", "{broken");
  assert.equal(restoreProfiles(data), data);
  browserStorage.clear();
});

const { vehicleMaintenanceSummary: summarize } = load(
  "features/portal-cliente/services/vehicleMaintenanceSummary",
);
const maintenanceFixture = {
  id: "m1",
  type: "Aceite",
  date: "2026-09-01",
  mileage: 85000,
  nextMileage: 95000,
  nextDate: "2027-03-01",
};
test("El portal distingue historial vacío y mantenciones sin programación", () => {
  assert.equal(summarize([], 85000, "2026-10-04").status, "Sin historial");
  assert.equal(
    summarize(
      [{ ...maintenanceFixture, nextMileage: null, nextDate: null }],
      85000,
      "2026-10-04",
    ).status,
    "Sin programación",
  );
});
test("La próxima mantención considera kilometraje y fecha", () => {
  assert.equal(
    summarize([maintenanceFixture], 85000, "2026-10-04").status,
    "Al día",
  );
  assert.equal(
    summarize([maintenanceFixture], 92500, "2026-10-04").status,
    "Próxima",
  );
  assert.equal(
    summarize([maintenanceFixture], 95000, "2026-10-04").status,
    "Vencida",
  );
  assert.equal(
    summarize(
      [{ ...maintenanceFixture, nextDate: "2026-10-01" }],
      85000,
      "2026-10-04",
    ).status,
    "Vencida",
  );
});
test("Una mantención nueva reemplaza la anterior del mismo tipo y conserva otros servicios pendientes", () => {
  const old = {
    ...maintenanceFixture,
    id: "old",
    date: "2025-01-01",
    nextMileage: 60000,
  };
  assert.equal(
    summarize([old, maintenanceFixture], 85000, "2026-10-04").status,
    "Al día",
  );
  assert.equal(
    summarize(
      [{ ...old, type: "Frenos" }, maintenanceFixture],
      85000,
      "2026-10-04",
    ).status,
    "Vencida",
  );
});

test("Órdenes de equipo visibles para ambos mecánicos sin mezclar talleres", () => {
  const shared = { ...order, assignmentType: "TEAM", mechanicId: "" };
  const store = {
    ...data,
    orders: [
      ...data.orders.filter((item) => item.id !== order.id),
      shared,
      { ...shared, id: "other-team", workshopId: "other-workshop" },
    ],
  };
  for (const mechanic of data.users.filter((item) => item.role === "WORKER")) {
    const visible = scopedData(store, mechanic);
    assert.ok(visible.orders.some((item) => item.id === shared.id));
    assert.ok(visible.vehicles.some((item) => item.id === shared.vehicleId));
    assert.ok(
      visible.orders.every((item) => item.workshopId === mechanic.workshopId),
    );
    assert.ok(
      visible.orders.every(
        (item) =>
          item.assignmentType === "TEAM" || item.mechanicId === mechanic.id,
      ),
    );
  }
});
test("Trabajador registra avances en una orden compartida sin cambiar precios", () => {
  const shared = {
    ...order,
    assignmentType: "TEAM",
    mechanicId: "",
    updatedAt: "2026-10-05T12:00:00.000Z",
  };
  const store = {
    ...data,
    orders: data.orders.map((item) => (item.id === shared.id ? shared : item)),
  };
  const saved = saveOrder(store, worker, {
    ...shared,
    diagnosis: "Revisión del equipo",
    services: shared.services.map((item) => ({ ...item, price: 1 })),
  }).orders.find((item) => item.id === shared.id);
  assert.equal(saved.diagnosis, "Revisión del equipo");
  assert.equal(saved.assignmentType, "TEAM");
  assert.deepEqual(
    saved.services.map((item) => item.price),
    shared.services.map((item) => item.price),
  );
});
test("Solo el administrador puede cambiar entre equipo y asignación individual", () => {
  const shared = { ...order, assignmentType: "TEAM", mechanicId: "" };
  const store = {
    ...data,
    orders: data.orders.map((item) => (item.id === shared.id ? shared : item)),
  };
  assert.throws(() =>
    saveOrder(store, worker, {
      ...shared,
      assignmentType: "INDIVIDUAL",
      mechanicId: worker.id,
    }),
  );
  assert.throws(() =>
    saveOrder(data, worker, {
      ...order,
      assignmentType: "TEAM",
      mechanicId: "",
    }),
  );
  assert.equal(canChangeStatus(worker, shared, "DELIVERED"), false);
  const assigned = saveOrder(store, admin, {
    ...shared,
    assignmentType: "INDIVIDUAL",
    mechanicId: worker.id,
  }).orders.find((item) => item.id === shared.id);
  assert.equal(assigned.mechanicId, worker.id);
});
test("Ficha compartida desactualizada no sobrescribe avances de otra persona", () => {
  const shared = {
    ...order,
    assignmentType: "TEAM",
    mechanicId: "",
    updatedAt: "2026-10-05T12:00:00.000Z",
  };
  const store = {
    ...data,
    orders: data.orders.map((item) => (item.id === shared.id ? shared : item)),
  };
  assert.throws(
    () =>
      saveOrder(store, worker, {
        ...shared,
        updatedAt: "2026-10-05T11:00:00.000Z",
      }),
    /actualizó/,
  );
});
console.log("\n" + count + " pruebas completadas.");
