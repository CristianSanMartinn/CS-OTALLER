/* Pruebas de reglas de negocio mock, sin navegador ni backend. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const { workSuggestions, workOptions, interventionSummary, isEngineOil } = load(
  "features/shared/services/interventions",
);
test("Buscador distingue embrague por mantenimiento y por falla", () => {
  const options = workSuggestions("EMBRAGUE");
  assert.ok(options.some((x) => x.interventionType === "MAINTENANCE"));
  assert.ok(options.some((x) => x.interventionType === "REPAIR"));
  assert.ok(
    workOptions("Cambio de embrague").includes(
      "Rectificación de volante de inercia",
    ),
  );
});
test("Búsqueda tolera tildes y sinónimos sin inventar trabajos", () => {
  assert.ok(
    workSuggestions("bateria").some((x) => x.name === "Cambio de batería"),
  );
  assert.ok(
    workSuggestions("balatas").some(
      (x) => x.name === "Cambio de pastillas de freno",
    ),
  );
  assert.ok(
    workSuggestions("sensor map").some(
      (x) => x.name === "Cambio de sensor MAP",
    ),
  );
  assert.equal(workSuggestions("trabajo inventado").length, 0);
});
test("Resumen conserva texto personalizado y clasificación elegida", () => {
  const text = interventionSummary("Trabajo personalizado", {
    interventionType: "REPAIR",
    interventionReason: "FAULT",
    workDetails: ["Detalle propio"],
  });
  assert.ok(text.includes("Reparación"));
  assert.ok(text.includes("Detalle propio"));
  assert.ok(text.includes("Trabajo personalizado"));
  assert.ok(isEngineOil("Cambio de aceite"));
  assert.ok(!isEngineOil("Cambio de aceite de caja"));
});
test("Reparación sin intervalo no oculta el próximo mantenimiento programado", () => {
  const planned = {
    id: "planned",
    type: "Embrague",
    date: "2026-01-01",
    mileage: 10000,
    nextMileage: 30000,
    nextDate: "2027-01-01",
    interventionType: "MAINTENANCE",
  };
  const repair = {
    ...planned,
    id: "repair",
    date: "2026-02-01",
    interventionType: "REPAIR",
    nextMileage: 0,
    nextDate: "",
  };
  const result = summarize([planned, repair], 20000, "2026-10-13");
  assert.equal(result.next.record.id, "planned");
});
console.log("\n" + count + " pruebas completadas.");

const {
  maintenanceCategories,
  maintenanceTypeCode,
  maintenanceGroupKey,
  maintenanceState,
  latestMaintenanceByType,
} = load("features/shared/services/maintenanceRules");

test("El código de aceite conserva la ficha aunque el título sea personalizado", () => {
  assert.ok(isEngineOil("Servicio premium del motor", "OIL_CHANGE"));
  assert.ok(!isEngineOil("Cambio de aceite", "OTHER"));
  assert.equal(
    maintenanceTypeCode({ type: "  Cambio   de ACEITE y filtro  " }),
    "OIL_CHANGE",
  );
  assert.equal(
    maintenanceTypeCode({ type: "Cambio de aceite de caja" }),
    "OTHER",
  );
  assert.equal(
    maintenanceTypeCode({ type: "Cambio de filtro de aire" }),
    "AIR_FILTER",
  );
});

test("Un aceite nuevo con otro nombre retira el aviso vencido sin borrar el historial", () => {
  const old = {
    ...maintenanceFixture,
    id: "oil-old",
    type: "Cambio de aceite",
    date: "2025-01-01",
    nextMileage: 60000,
  };
  const current = {
    ...maintenanceFixture,
    id: "oil-new",
    type: "Servicio premium y filtro",
    maintenanceTypeCode: "OIL_CHANGE",
  };
  const records = [old, current];
  assert.equal(summarize(records, 85000, "2026-10-04").status, "Al día");
  assert.deepEqual(
    Array.from(latestMaintenance(records), (r) => r.id),
    ["oil-new"],
  );
  assert.equal(records.length, 2);
});

test("Clasificar aceite no cancela frenos, embrague ni servicios de otro taller", () => {
  const first = {
    ...maintenanceFixture,
    workshopId: "one",
    vehicleId: "one",
    type: "Frenos",
    maintenanceTypeCode: "OTHER",
  };
  const clutch = { ...first, id: "clutch", type: "Embrague" };
  const otherWorkshop = { ...first, id: "foreign", workshopId: "two" };
  assert.notEqual(maintenanceGroupKey(first), maintenanceGroupKey(clutch));
  assert.equal(
    latestMaintenanceByType([first, clutch, otherWorkshop]).length,
    3,
  );
  const current = {
    ...first,
    id: "new-oil",
    type: "Servicio motor",
    maintenanceTypeCode: "OIL_CHANGE",
  };
  const overdueBrake = { ...first, id: "old-brake", nextMileage: 60000 };
  assert.equal(
    summarize([current, overdueBrake], 85000, "2026-10-04").status,
    "Vencida",
  );
});

test("Portal y recordatorios usan los mismos límites de fecha y kilometraje", () => {
  const record = { ...maintenanceFixture, nextDate: "2027-03-01" };
  for (const [mileage, day, status, portal, reminder] of [
    [92499, "2026-10-04", "AL_DIA", "Al día", "scheduled"],
    [92500, "2026-10-04", "PROXIMA", "Próxima", "soon"],
    [95000, "2026-10-04", "VENCIDA", "Vencida", "due"],
    [85000, "2027-01-30", "PROXIMA", "Próxima", "soon"],
    [85000, "2027-03-01", "VENCIDA", "Vencida", "due"],
  ]) {
    assert.equal(maintenanceState(record, mileage, day).status, status);
    assert.equal(summarize([record], mileage, day).status, portal);
    assert.equal(maintenanceReminder(record, mileage, day).status, reminder);
  }
});

test("Los umbrales parametrizados coinciden y los intervalos vacíos no se anuncian al día", () => {
  const limits = { nearMileage: 1000, nearDays: 7 };
  assert.equal(
    summarize([maintenanceFixture], 93500, "2026-10-04", limits).status,
    "Al día",
  );
  assert.equal(
    maintenanceReminder(maintenanceFixture, 93500, "2026-10-04", limits).status,
    "scheduled",
  );
  const unscheduled = { ...maintenanceFixture, nextMileage: 0, nextDate: "" };
  assert.equal(
    maintenanceState(unscheduled, 85000, "2026-10-04").status,
    "UNSCHEDULED",
  );
  assert.equal(
    maintenanceReminder(unscheduled, 85000, "2026-10-04").status,
    "unscheduled",
  );
});

test("Empates de fecha y kilometraje conservan el registro más reciente recibido de la API", () => {
  const newest = {
    ...maintenanceFixture,
    id: "a-new",
    maintenanceTypeCode: "OIL_CHANGE",
  };
  const older = { ...newest, id: "z-old", nextDate: "2025-01-01" };
  assert.equal(latestMaintenanceByType([newest, older])[0].id, "a-new");
  assert.equal(
    summarize([newest, older], 85000, "2026-10-04").status,
    "Al día",
  );
});
console.log(count + " pruebas totales completadas.");

const { workshopWorkHistory } = load("features/shared/services/workHistory");
const { maintenanceOrderContext } = load(
  "features/mantenciones/services/maintenanceContext",
);
const { oilSuggestions, oilSelection, validateOilSelection } = load(
  "features/mantenciones/services/oilSuggestions",
);
const sampleOil = {
  id: "lm",
  brand: "LIQUI MOLY",
  product: "Molygen New Generation",
  viscosity: "5W-30",
  oilType: "Sintético",
};

test("Homocinética ofrece mantenimiento, desgaste y falla incluso con error habitual de escritura", () => {
  const suggestions = workSuggestions("homicinetica");
  assert.ok(suggestions.some((s) => s.interventionReason === "SCHEDULED"));
  assert.ok(suggestions.some((s) => s.interventionReason === "WEAR"));
  assert.ok(suggestions.some((s) => s.interventionReason === "FAULT"));
});

test("Las sugerencias priorizan trabajos guardados del taller y conservan sus detalles", () => {
  const history = [
    {
      name: "Ajuste especial del taller",
      interventionType: "REPAIR",
      interventionReason: "WEAR",
      workDetails: ["Verificar fuelle"],
    },
  ];
  const suggestions = workSuggestions("", [...history, ...history]);
  assert.equal(suggestions[0].name, "Ajuste especial del taller");
  assert.equal(suggestions[0].uses, 2);
  assert.equal(suggestions[0].workDetails[0], "Verificar fuelle");
  const scoped = workshopWorkHistory(
    {
      ...data,
      orders: [
        {
          ...order,
          services: [{ ...order.services[0], name: "Privado de otro taller" }],
          workshopId: "foreign",
        },
      ],
      maintenance: [],
    },
    admin.workshopId,
  );
  assert.equal(scoped.length, 0);
});

test("La orden recupera el trabajo clasificado; una orden con varios trabajos no elige por el mecánico", () => {
  const service = {
    ...order.services[0],
    name: "Cambio de embrague",
    interventionType: "REPAIR",
    interventionReason: "FAULT",
    workDetails: ["Kit completo"],
  };
  const context = maintenanceOrderContext({ ...order, services: [service] });
  assert.equal(context.type, service.name);
  assert.equal(context.interventionReason, "FAULT");
  assert.equal(context.orderId, order.id);
  assert.equal(
    maintenanceOrderContext({ ...order, services: [service, service] }).type,
    undefined,
  );
  assert.equal(
    maintenanceOrderContext({
      ...order,
      services: [],
      reason: "Ruido al acelerar",
    }).interventionReason,
    undefined,
  );
});

test("El buscador de aceite reconoce marca y viscosidad y prioriza productos usados sin copiar litros", () => {
  assert.equal(oilSuggestions([sampleOil], "liquy moly 5w30", []).length, 1);
  assert.equal(oilSuggestions([sampleOil], "Mobil", []).length, 0);
  const selection = oilSelection(sampleOil);
  assert.equal(selection.oilProductName, "Molygen New Generation");
  assert.equal("quantity" in selection, false);
  assert.equal("filter" in selection, false);
  const records = [
    {
      ...data.maintenance[0],
      brand: sampleOil.brand,
      oilProductName: sampleOil.product,
      viscosity: sampleOil.viscosity,
    },
  ];
  assert.equal(oilSuggestions([sampleOil], "", records)[0].uses, 1);
});

test("El formulario rechaza aceite incompatible con su producto y permite productos manuales completos", () => {
  const value = {
    ...data.maintenance[0],
    ...oilSelection(sampleOil),
    quantity: 5,
    filter: "Referencia",
    filterBrand: "Marca",
  };
  assert.equal(validateOilSelection(value, [sampleOil]), "");
  assert.ok(
    validateOilSelection({ ...value, viscosity: "10W-40" }, [sampleOil]),
  );
  assert.ok(validateOilSelection({ ...value, brand: "Mobil" }, [sampleOil]));
  assert.ok(validateOilSelection({ ...value, quantity: 0 }, [sampleOil]));
  assert.equal(
    validateOilSelection(
      {
        ...value,
        brand: "Marca local",
        oilProductName: "Producto no incluido",
      },
      [sampleOil],
    ),
    "",
  );
});
console.log(count + " pruebas totales del registro asistido completadas.");

const { summarizeMaintenance } = load(
  "features/shared/services/maintenanceRules",
);
const { dashboardMaintenanceSummary } = load(
  "features/dashboard/services/maintenanceSummary",
);
test("Dashboard y portal coinciden al sustituir aceite vencido con un cambio nuevo", () => {
  const vehicle = {
    ...data.vehicles[0],
    id: "dash-car",
    workshopId: "dash",
    mileage: 10000,
  };
  const old = {
    ...data.maintenance[0],
    id: "old",
    workshopId: "dash",
    vehicleId: vehicle.id,
    maintenanceTypeCode: "OIL_CHANGE",
    type: "Aceite antiguo",
    date: "2026-01-01",
    mileage: 5000,
    nextMileage: 9000,
    nextDate: "2026-02-01",
  };
  const fresh = {
    ...old,
    id: "fresh",
    type: "Aceite y filtro nuevo",
    date: "2026-10-20",
    mileage: 10000,
    nextMileage: 20000,
    nextDate: "2027-10-20",
  };
  const counts = dashboardMaintenanceSummary(
    [vehicle],
    [fresh, old],
    "dash",
    "2026-10-20",
  );
  assert.equal(counts.overdue, 0);
  assert.equal(counts.current, 1);
  assert.equal(
    summarizeMaintenance([fresh, old], vehicle.mileage, "2026-10-20").tone,
    "current",
  );
  const brakes = {
    ...fresh,
    id: "brakes",
    maintenanceTypeCode: "BRAKE_FLUID",
    nextMileage: 10000,
  };
  assert.equal(
    dashboardMaintenanceSummary(
      [vehicle],
      [fresh, old, brakes],
      "dash",
      "2026-10-20",
    ).overdue,
    1,
  );
});
test("Dashboard conserva los límites compartidos, separa falta de historial y no mezcla talleres", () => {
  const vehicle = {
    ...data.vehicles[0],
    id: "dash-car",
    workshopId: "dash",
    mileage: 10000,
  };
  const record = {
    ...data.maintenance[0],
    workshopId: "dash",
    vehicleId: vehicle.id,
    maintenanceTypeCode: "OIL_CHANGE",
    date: "2026-10-20",
    nextMileage: 12500,
    nextDate: "2027-10-20",
  };
  const counts = dashboardMaintenanceSummary(
    [vehicle],
    [record],
    "dash",
    "2026-10-20",
  );
  assert.equal(counts.soon, 1);
  assert.equal(
    dashboardMaintenanceSummary(
      [vehicle],
      [{ ...record, nextMileage: 12501 }],
      "dash",
      "2026-10-20",
    ).current,
    1,
  );
  assert.equal(
    dashboardMaintenanceSummary([vehicle], [record], "dash", "2026-10-20", {
      nearMileage: 100,
      nearDays: 1,
    }).current,
    1,
  );
  const foreignVehicle = {
    ...vehicle,
    id: "foreign-car",
    workshopId: "foreign",
  };
  const foreignRecord = { ...record, workshopId: "foreign", nextMileage: 1 };
  const empty = dashboardMaintenanceSummary(
    [vehicle, foreignVehicle],
    [foreignRecord],
    "dash",
    "2026-10-20",
  );
  assert.equal(empty.withoutHistory, 1);
  assert.equal(empty.overdue, 0);
  const unscheduled = dashboardMaintenanceSummary(
    [vehicle],
    [{ ...record, nextMileage: 0, nextDate: "" }],
    "dash",
    "2026-10-20",
  );
  assert.equal(unscheduled.unscheduled, 1);
  assert.equal(unscheduled.current, 0);
});
console.log(count + " pruebas totales con dashboard completadas.");

// Exercise the actual form handlers with isolated hooks and child components.
// This does not replace browser tests of React rendering or accessibility.
function mountMaintenanceForm(orders = [], orderId = "") {
  const state = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const result = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(
      path.join(
        root,
        "features/mantenciones/components/forms/MaintenanceForm.tsx",
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const fakeData = { ...data, orders };
  const stubs = {
    react: {
      useState(initial) {
        const slot = cursor++;
        if (!(slot in state))
          state[slot] = typeof initial === "function" ? initial() : initial;
        return [
          state[slot],
          (value) => {
            state[slot] =
              typeof value === "function" ? value(state[slot]) : value;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "./MaintenanceForm.module.css": { default: {} },
    "../../hooks/useOilCatalog": {
      useOilCatalog: () => ({ products: [], loading: false, error: "" }),
    },
    "@/features/shared/components/store/StoreProvider": {
      useStore: () => ({
        data: fakeData,
        user: admin,
        saveMaintenance: () => {
          throw new Error("Unexpected save");
        },
      }),
    },
    "@/components/ui/primitives": {
      Field: "Field",
      SelectField: "SelectField",
      TextField: "TextField",
    },
    "../oil/OilChangeForm": { OilChangeForm: "OilChangeForm" },
    "@/components/InterventionEditor/InterventionEditor": {
      InterventionEditor: "InterventionEditor",
    },
  };
  vm.runInNewContext(source, {
    exports: result.exports,
    module: result,
    require: (request) =>
      request in stubs
        ? stubs[request]
        : load(
            request.startsWith("@/")
              ? request.slice(2)
              : path.relative(
                  root,
                  path.resolve(
                    root,
                    "features/mantenciones/components/forms",
                    request,
                  ),
                ),
          ),
  });
  const render = () => {
    cursor = 0;
    return result.exports.MaintenanceForm({
      orderId,
      onSave() {},
      onCancel() {},
    });
  };
  function find(node, predicate) {
    if (!node || typeof node !== "object") return undefined;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = find(child, predicate);
        if (found) return found;
      }
      return undefined;
    }
    if (predicate(node)) return node;
    return (
      find(node.props?.children, predicate) ??
      find(node.props?.extraClassification, predicate)
    );
  }
  const select = (predicate) => find(render(), predicate);
  return {
    editor: () => select((node) => node.type === "InterventionEditor"),
    field: (label) => select((node) => node.props?.label === label),
    hasOilFields: () => !!select((node) => node.type === "OilChangeForm"),
    category: () =>
      select((node) => node.props?.label === "Categoría del servicio").props
        .value,
  };
}

test("El contexto conserva el código explícito aunque el nombre del servicio sea personalizado", () => {
  const service = {
    ...order.services[0],
    name: "Servicio premium del motor",
    maintenanceTypeCode: "OIL_CHANGE",
  };
  const context = maintenanceOrderContext({ ...order, services: [service] });
  assert.equal(context.maintenanceTypeCode, "OIL_CHANGE");
  assert.equal(context.type, service.name);
  assert.equal(service.maintenanceTypeCode, "OIL_CHANGE");
});

test("OTHER explícito prevalece y las órdenes antiguas mantienen la inferencia", () => {
  const service = {
    ...order.services[0],
    name: "Cambio de aceite",
    maintenanceTypeCode: "OTHER",
  };
  assert.equal(
    maintenanceOrderContext({ ...order, services: [service] })
      .maintenanceTypeCode,
    "OTHER",
  );
  const { maintenanceTypeCode: omitted, ...legacy } = service;
  assert.equal(
    maintenanceOrderContext({ ...order, services: [legacy] })
      .maintenanceTypeCode,
    "OIL_CHANGE",
  );
  assert.equal(
    maintenanceOrderContext({
      ...order,
      services: [{ ...legacy, name: "Trabajo personalizado" }],
    }).maintenanceTypeCode,
    "OTHER",
  );
  assert.equal(
    maintenanceOrderContext(undefined).maintenanceTypeCode,
    undefined,
  );
  assert.equal(
    maintenanceOrderContext({ ...order, services: [] }).maintenanceTypeCode,
    undefined,
  );
  assert.equal(
    maintenanceOrderContext({ ...order, services: [service, legacy] })
      .maintenanceTypeCode,
    undefined,
  );
});

test("Una sugerencia con código conserva aceite y sus campos al editar varias veces el label", () => {
  const form = mountMaintenanceForm();
  form.editor().props.onChoose({
    name: "Servicio premium del motor",
    maintenanceTypeCode: "OIL_CHANGE",
    interventionType: "MAINTENANCE",
    interventionReason: "SCHEDULED",
  });
  form.editor().props.onChange({ name: "Servicio especial" });
  form.editor().props.onChange({ name: "Servicio especial y filtro" });
  assert.equal(form.category(), "OIL_CHANGE");
  assert.equal(form.editor().props.value.name, "Servicio especial y filtro");
  assert.ok(form.hasOilFields());
});

test("La categoría manual permanece al renombrar y solo cambia al elegir otra", () => {
  const form = mountMaintenanceForm();
  form
    .field("Categoría del servicio")
    .props.onChange({ target: { value: "OIL_CHANGE" } });
  form.editor().props.onChange({ name: "Servicio personalizado" });
  assert.equal(form.category(), "OIL_CHANGE");
  form
    .field("Categoría del servicio")
    .props.onChange({ target: { value: "OTHER" } });
  form.editor().props.onChange({ name: "Cambio de aceite" });
  assert.equal(form.category(), "OTHER");
  assert.ok(!form.hasOilFields());
});

test("La escritura y las sugerencias sin código siguen usando la inferencia anterior", () => {
  const form = mountMaintenanceForm();
  form.editor().props.onChange({ name: "Cambio de aceite" });
  assert.equal(form.category(), "OIL_CHANGE");
  form.editor().props.onChange({ name: "Bujías" });
  assert.equal(form.category(), "SPARK_PLUGS");
  form.editor().props.onChoose({
    name: "Cambio de aceite",
    interventionType: "MAINTENANCE",
    interventionReason: "SCHEDULED",
  });
  form.editor().props.onChange({ name: "Refrigerante" });
  assert.equal(form.category(), "COOLANT");
});

test("Al abrir Mantenciones desde una orden se protege su código explícito", () => {
  const linked = {
    ...order,
    services: [
      {
        ...order.services[0],
        name: "Servicio premium",
        maintenanceTypeCode: "OIL_CHANGE",
      },
    ],
  };
  const form = mountMaintenanceForm([linked], linked.id);
  form.editor().props.onChange({ name: "Otro título visible" });
  assert.equal(form.category(), "OIL_CHANGE");
  assert.ok(form.hasOilFields());
});

test("Cambiar entre órdenes explícitas y antiguas actualiza la categoría sin arrastrar la anterior", () => {
  const explicit = {
    ...order,
    id: "explicit",
    services: [
      {
        ...order.services[0],
        name: "Servicio premium",
        maintenanceTypeCode: "OIL_CHANGE",
      },
    ],
  };
  const legacy = {
    ...order,
    id: "legacy",
    services: [{ ...order.services[0], name: "Refrigerante" }],
  };
  const other = {
    ...order,
    id: "other",
    services: [
      {
        ...order.services[0],
        name: "Cambio de aceite",
        maintenanceTypeCode: "OTHER",
      },
    ],
  };
  const form = mountMaintenanceForm([explicit, legacy, other]);
  form
    .field("Orden vinculada")
    .props.onChange({ target: { value: explicit.id } });
  form.editor().props.onChange({ name: "Trabajo especial" });
  assert.equal(form.category(), "OIL_CHANGE");
  form
    .field("Orden vinculada")
    .props.onChange({ target: { value: legacy.id } });
  assert.equal(form.category(), "COOLANT");
  form.editor().props.onChange({ name: "Bujías" });
  assert.equal(form.category(), "SPARK_PLUGS");
  form.field("Orden vinculada").props.onChange({ target: { value: other.id } });
  form.editor().props.onChange({ name: "Cambio de aceite y filtro" });
  assert.equal(form.category(), "OTHER");
});

test("Seleccionar vehículo recupera el código explícito de su única orden activa", () => {
  const vehicle = data.vehicles[0];
  const linked = {
    ...order,
    vehicleId: vehicle.id,
    status: "RECEIVED",
    services: [
      {
        ...order.services[0],
        name: "Servicio premium",
        maintenanceTypeCode: "OIL_CHANGE",
      },
    ],
  };
  const form = mountMaintenanceForm([linked]);
  form.field("Vehículo").props.onChange({ target: { value: vehicle.id } });
  form.editor().props.onChange({ name: "Servicio personalizado del vehículo" });
  assert.equal(form.category(), "OIL_CHANGE");
});

console.log(
  count + " pruebas totales con conservación de categoría completadas.",
);

function mountServicesSection(initialOrder) {
  let current = structuredClone(initialOrder);
  const saved = structuredClone(initialOrder);
  const jsx = (type, props) => ({ type, props });
  const result = { exports: {} };
  const relative =
    "features/ordenes/components/editor/sections/ServicesSection.tsx";
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, relative), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const stubs = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": { Plus: "Plus", Trash2: "Trash2" },
    "@/components/ui/primitives": {
      Panel: "Panel",
      Field: "Field",
      SelectField: "SelectField",
    },
    "@/components/InterventionEditor/InterventionEditor": {
      InterventionEditor: "InterventionEditor",
    },
    "@/features/shared/components/store/StoreProvider": {
      useStore: () => ({ data: { ...data, orders: [saved] }, user: admin }),
    },
  };
  vm.runInNewContext(source, {
    module: result,
    exports: result.exports,
    require: (request) =>
      request in stubs
        ? stubs[request]
        : load(
            request.startsWith("@/")
              ? request.slice(2)
              : path.relative(
                  root,
                  path.resolve(root, path.dirname(relative), request),
                ),
          ),
  });
  const render = () =>
    result.exports.ServicesSection({
      order: current,
      onChange: (patch) => {
        current = { ...current, ...patch };
      },
    });
  function findAll(node, predicate) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node))
      return node.flatMap((child) => findAll(child, predicate));
    return [
      ...(predicate(node) ? [node] : []),
      ...findAll(node.props?.children, predicate),
      ...findAll(node.props?.action, predicate),
    ];
  }
  return {
    editor: (index = 0) =>
      findAll(render(), (node) => node.type === "InterventionEditor")[index],
    description: () =>
      findAll(render(), (node) => node.props?.label === "Descripción")[0],
    add: () =>
      findAll(
        render(),
        (node) =>
          node.type === "button" &&
          node.props.children.some?.(
            (child) =>
              typeof child === "string" && child.includes("Agregar trabajo"),
          ),
      )[0].props.onClick(),
    current: () => current,
  };
}

test("Servicios captura el código de la sugerencia y lo incluye en el payload sin perderlo al editar", () => {
  const form = mountServicesSection({
    ...order,
    services: [{ ...order.services[0], workDetails: ["Anterior"] }],
  });
  form
    .editor()
    .props.onChoose({
      name: "Servicio premium del motor",
      maintenanceTypeCode: "OIL_CHANGE",
      interventionType: "MAINTENANCE",
      interventionReason: "SCHEDULED",
      workDetails: ["Filtro instalado"],
    });
  form.editor().props.onChange({ name: "Servicio personalizado y filtro" });
  form
    .description()
    .props.onChange({ target: { value: "Descripción actualizada" } });
  const payload = JSON.parse(
    JSON.stringify({ services: form.current().services }),
  );
  assert.equal(payload.services[0].maintenanceTypeCode, "OIL_CHANGE");
  assert.equal(payload.services[0].name, "Servicio personalizado y filtro");
  assert.equal(payload.services[0].description, "Descripción actualizada");
  assert.deepEqual(payload.services[0].workDetails, ["Filtro instalado"]);
  assert.equal(payload.services[0].id, order.services[0].id);
  assert.equal(payload.services[0].price, order.services[0].price);
});

test("Otra sugerencia cambia el código; OTHER explícito prevalece y se conserva el comportamiento de detalles", () => {
  const form = mountServicesSection({
    ...order,
    services: [
      {
        ...order.services[0],
        name: "Refrigerante",
        workDetails: ["Detalle conservado"],
      },
    ],
  });
  form
    .editor()
    .props.onChoose({
      name: "Refrigerante",
      interventionType: "MAINTENANCE",
      interventionReason: "SCHEDULED",
    });
  assert.equal(form.current().services[0].maintenanceTypeCode, "COOLANT");
  assert.deepEqual(Array.from(form.current().services[0].workDetails), [
    "Detalle conservado",
  ]);
  form
    .editor()
    .props.onChoose({
      name: "Cambio de aceite",
      maintenanceTypeCode: "OTHER",
      interventionType: "REPAIR",
      interventionReason: "FAULT",
    });
  assert.equal(form.current().services[0].maintenanceTypeCode, "OTHER");
  assert.equal(form.current().services[0].workDetails.length, 0);
  form.editor().props.onChange({ name: "Cambio de aceite y filtro" });
  assert.equal(form.current().services[0].maintenanceTypeCode, "OTHER");
});

test("Escribir un servicio sin selección y agregar uno vacío no impone un código a las órdenes antiguas", () => {
  const legacy = { ...order.services[0] };
  delete legacy.maintenanceTypeCode;
  const form = mountServicesSection({ ...order, services: [legacy] });
  form.editor().props.onChange({ name: "Cambio de aceite" });
  assert.equal(
    Object.hasOwn(form.current().services[0], "maintenanceTypeCode"),
    false,
  );
  form.add();
  assert.equal(form.current().services.length, 2);
  assert.equal(
    Object.hasOwn(form.current().services[1], "maintenanceTypeCode"),
    false,
  );
});

test("Elegir categoría en un servicio no modifica el código ni los datos de otro", () => {
  const first = { ...order.services[0], maintenanceTypeCode: "OIL_CHANGE" };
  const second = {
    ...order.services[0],
    id: "other-service",
    name: "Servicio independiente",
  };
  const form = mountServicesSection({ ...order, services: [first, second] });
  form
    .editor(1)
    .props.onChoose({
      name: "Bujías",
      maintenanceTypeCode: "SPARK_PLUGS",
      interventionType: "MAINTENANCE",
      interventionReason: "SCHEDULED",
    });
  assert.equal(form.current().services[0].maintenanceTypeCode, "OIL_CHANGE");
  assert.equal(form.current().services[0].name, first.name);
  assert.equal(form.current().services[1].maintenanceTypeCode, "SPARK_PLUGS");
});

console.log(
  count +
    " pruebas totales con persistencia de clasificación en órdenes completadas.",
);

test("Filtros: equivalencias exactas separan aire, cabina y combustible sin reclasificar códigos explícitos", () => {
  for (const [name, code] of [
    ["filtro de aire", "AIR_FILTER"],
    ["  CAMBIO   DE FILTRO DE AIRE  ", "AIR_FILTER"],
    ["filtro de cabina", "CABIN_FILTER"],
    ["Cambio de filtro de cabina", "CABIN_FILTER"],
    ["filtro combustible", "FUEL_FILTER"],
    ["filtro de combustible", "FUEL_FILTER"],
    ["Cambio de filtro de combustible", "FUEL_FILTER"],
  ])
    assert.equal(maintenanceTypeCode({ type: name }), code);
  assert.equal(
    maintenanceTypeCode({
      type: "Filtro de aire",
      maintenanceTypeCode: "FILTERS",
    }),
    "FILTERS",
  );
  assert.equal(
    maintenanceTypeCode({
      type: "Filtro de aire",
      maintenanceTypeCode: "CABIN_FILTER",
    }),
    "CABIN_FILTER",
  );
  for (const type of ["Filtros", "Filtro de aire y cabina", "Filtro de aceite"])
    assert.equal(maintenanceTypeCode({ type }), "OTHER");
});

test("AIR_FILTER no reemplaza CABIN_FILTER y CABIN_FILTER no reemplaza FUEL_FILTER", () => {
  const records = ["AIR_FILTER", "CABIN_FILTER", "FUEL_FILTER", "FILTERS"].map(
    (code, index) => ({
      ...maintenanceFixture,
      id: code,
      workshopId: "filter-shop",
      vehicleId: "filter-car",
      maintenanceTypeCode: code,
      type: "Nombre visible compartido",
      date: "2026-10-" + (10 + index),
    }),
  );
  assert.deepEqual(
    Array.from(latestMaintenanceByType(records), (r) => r.id).sort(),
    records.map((r) => r.id).sort(),
  );
  const fresh = {
    ...records[0],
    id: "air-new",
    type: "Servicio de admisión",
    date: "2026-10-20",
  };
  assert.deepEqual(
    Array.from(
      latestMaintenanceByType([...records, fresh]),
      (r) => r.id,
    ).sort(),
    ["air-new", "CABIN_FILTER", "FUEL_FILTER", "FILTERS"].sort(),
  );
  assert.equal(records.length, 4);
});

test("Programación de filtros sigue aislada por taller y vehículo", () => {
  const first = {
    ...maintenanceFixture,
    id: "one",
    workshopId: "one",
    vehicleId: "one",
    maintenanceTypeCode: "AIR_FILTER",
  };
  const records = [
    first,
    { ...first, id: "other-shop", workshopId: "two" },
    { ...first, id: "other-car", vehicleId: "two" },
  ];
  assert.equal(latestMaintenanceByType(records).length, 3);
});

test("Formulario ofrece filtros específicos y conserva FILTERS solo cuando viene heredado", () => {
  const form = mountMaintenanceForm();
  const optionCodes = () =>
    form
      .editor()
      .props.extraClassification.props.children.map(
        (option) => option.props.value,
      );
  assert.equal(optionCodes().includes("FILTERS"), false);
  for (const code of ["AIR_FILTER", "CABIN_FILTER", "FUEL_FILTER"]) {
    assert.ok(optionCodes().includes(code));
    form
      .editor()
      .props.extraClassification.props.onChange({ target: { value: code } });
    form.editor().props.onChange({ name: "Nombre personalizado" });
    assert.equal(form.category(), code);
    assert.equal(form.hasOilFields(), false);
  }
  const legacy = {
    ...order,
    services: [
      {
        ...order.services[0],
        name: "Filtro de aire",
        maintenanceTypeCode: "FILTERS",
      },
    ],
  };
  const inherited = mountMaintenanceForm([legacy], legacy.id);
  assert.equal(inherited.category(), "FILTERS");
  assert.ok(
    inherited
      .editor()
      .props.extraClassification.props.children.some(
        (option) => option.props.value === "FILTERS",
      ),
  );
  inherited.editor().props.onChange({ name: "Cambio de filtro de cabina" });
  assert.equal(inherited.category(), "FILTERS");
});

test("Seleccionar servicios de filtros conserva los tres códigos hacia el contexto de Mantenciones", () => {
  for (const [name, code] of [
    ["Filtro de aire", "AIR_FILTER"],
    ["Filtro de cabina", "CABIN_FILTER"],
    ["Filtro combustible", "FUEL_FILTER"],
  ]) {
    const form = mountServicesSection({
      ...order,
      services: [{ ...order.services[0] }],
    });
    form
      .editor()
      .props.onChoose({
        name,
        interventionType: "MAINTENANCE",
        interventionReason: "SCHEDULED",
      });
    const payload = JSON.parse(JSON.stringify(form.current()));
    assert.equal(payload.services[0].maintenanceTypeCode, code);
    assert.equal(maintenanceOrderContext(payload).maintenanceTypeCode, code);
  }
});

test("La inferencia solo utiliza aliases propios y devuelve categorías válidas", () => {
  const validCodes = new Set(
    maintenanceCategories.map((category) => category.code),
  );
  for (const [type, expected] of [
    ["Cambio de aceite", "OIL_CHANGE"],
    ["  CAMBIO  DE LÍQUIDO DE FRENOS  ", "BRAKE_FLUID"],
    ["Servicio personalizado", "OTHER"],
    ["constructor", "OTHER"],
    ["__proto__", "OTHER"],
    ["toString", "OTHER"],
  ]) {
    const code = maintenanceTypeCode({ type });
    assert.equal(code, expected);
    assert.ok(validCodes.has(code));
  }
  for (const code of validCodes) {
    assert.equal(
      maintenanceTypeCode({ type: "constructor", maintenanceTypeCode: code }),
      code,
    );
  }
});

test("Las órdenes antiguas sin código conservan inferencia propia y fallback seguro", () => {
  const { maintenanceTypeCode: omitted, ...legacy } = order.services[0];
  for (const [name, expected] of [
    ["Cambio de aceite", "OIL_CHANGE"],
    ["Filtro de aire", "AIR_FILTER"],
    ["Filtro de cabina", "CABIN_FILTER"],
    ["Filtro combustible", "FUEL_FILTER"],
    ["Servicio personalizado", "OTHER"],
    ["constructor", "OTHER"],
    ["__proto__", "OTHER"],
    ["toString", "OTHER"],
  ]) {
    const service = { ...legacy, name };
    const context = maintenanceOrderContext({ ...order, services: [service] });
    assert.equal(context.maintenanceTypeCode, expected);
    assert.equal(context.type, name);
    assert.equal(Object.hasOwn(service, "maintenanceTypeCode"), false);
  }
});

console.log(count + " pruebas totales con filtros independientes completadas.");

// Freeze the same instant in separate processes with genuinely different zones.
const maintenanceDateWorker = String.raw`
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
const instant = process.argv[1];
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [instant])); }
  static now() { return Date.parse(instant); }
}
const root = process.cwd();
const cache = new Map();
function load(relative) {
  const filename = path.resolve(root, relative + ".ts");
  if (cache.has(filename)) return cache.get(filename);
  const result = { exports: {} };
  cache.set(filename, result.exports);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports: result.exports, module: result, Date: FixedDate, Intl,
    require: (request) => load(request.startsWith("@/") ? request.slice(2) :
      path.relative(root, path.resolve(path.dirname(filename), request))),
  });
  return result.exports;
}
const { todayInSantiago, today } = load("utils/format");
const { maintenanceState, summarizeMaintenance } = load("features/shared/services/maintenanceRules");
const { vehicleMaintenanceSummary } = load("features/portal-cliente/services/vehicleMaintenanceSummary");
const { dashboardMaintenanceSummary } = load("features/dashboard/services/maintenanceSummary");
const { maintenanceReminder } = load("features/mantenciones/services/reminderService");
const day = todayInSantiago();
const base = { id: "m", workshopId: "w", vehicleId: "v", type: "Aceite",
  maintenanceTypeCode: "OIL_CHANGE", date: "2026-10-01", mileage: 10000,
  nextMileage: 0, nextDate: "" };
const cases = {};
for (const [name, patch] of Object.entries({
  thirty: { nextDate: "2026-11-21" },
  thirtyOne: { nextDate: "2026-11-22" },
  zero: { nextDate: "2026-10-22" },
  tomorrow: { nextDate: "2026-10-23" },
  kmOnly: { nextMileage: 12500 },
  kmOutside: { nextMileage: 12501 },
  unscheduled: {},
})) {
  const record = { ...base, ...patch };
  cases[name] = {
    state: maintenanceState(record, 10000, day),
    summary: summarizeMaintenance([record], 10000).status,
    portal: vehicleMaintenanceSummary([record], 10000).status,
    dashboard: dashboardMaintenanceSummary([{ id: "v", workshopId: "w", mileage: 10000 }], [record], "w", day),
    reminder: maintenanceReminder(record, 10000, day).status,
  };
}
console.log(JSON.stringify({ day, deviceDay: today(), cases,
  explicitDay: summarizeMaintenance([{ ...base, nextDate: "2026-10-22" }], 10000, "2026-10-21").status }));
`;
const maintenanceDateRuns = new Map();
function maintenanceAt(instant, zone = "America/Santiago") {
  const key = instant + zone;
  if (!maintenanceDateRuns.has(key)) {
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", maintenanceDateWorker, instant], {
      cwd: root, env: { ...process.env, TZ: zone }, encoding: "utf8",
    });
    assert.equal(child.status, 0, child.stderr);
    maintenanceDateRuns.set(key, JSON.parse(child.stdout));
  }
  return maintenanceDateRuns.get(key);
}
const beforeSantiagoMidnight = "2026-10-23T02:59:59.999Z";
const afterSantiagoMidnight = "2026-10-23T03:00:00.000Z";

test("Los estados de mantención coinciden en Santiago, UTC, Tokio y Honolulu", () => {
  const reference = maintenanceAt(beforeSantiagoMidnight);
  const deviceDays = new Set();
  for (const zone of ["America/Santiago", "UTC", "Asia/Tokyo", "Pacific/Honolulu"]) {
    const result = maintenanceAt(beforeSantiagoMidnight, zone);
    assert.equal(result.day, "2026-10-22");
    assert.deepEqual(result.cases, reference.cases);
    deviceDays.add(result.deviceDay);
  }
  assert.equal(deviceDays.size, 2);
});
test("Dashboard, Portal, resumen y recordatorios conservan los mismos estados", () => {
  const { cases } = maintenanceAt(beforeSantiagoMidnight);
  for (const [name, state, label, reminder, countKey] of [
    ["thirty", "PROXIMA", "Próxima", "soon", "soon"],
    ["thirtyOne", "AL_DIA", "Al día", "scheduled", "current"],
    ["zero", "VENCIDA", "Vencida", "due", "overdue"],
    ["unscheduled", "UNSCHEDULED", "Sin programación", "unscheduled", "unscheduled"],
  ]) {
    assert.equal(cases[name].state.status, state);
    assert.equal(cases[name].summary, label);
    assert.equal(cases[name].portal, label);
    assert.equal(cases[name].reminder, reminder);
    assert.equal(cases[name].dashboard[countKey], 1);
  }
});
test("El borde de 30 días es inclusivo y cambia según la medianoche de Santiago", () => {
  const before = maintenanceAt(beforeSantiagoMidnight).cases;
  const after = maintenanceAt(afterSantiagoMidnight).cases;
  assert.equal(before.thirty.state.days, 30);
  assert.equal(before.thirty.state.status, "PROXIMA");
  assert.equal(before.thirtyOne.state.days, 31);
  assert.equal(before.thirtyOne.state.status, "AL_DIA");
  assert.equal(after.thirtyOne.state.days, 30);
  assert.equal(after.thirtyOne.state.status, "PROXIMA");
});
test("La fecha objetivo vence exactamente al llegar al día de Santiago", () => {
  const before = maintenanceAt(beforeSantiagoMidnight).cases;
  const after = maintenanceAt(afterSantiagoMidnight).cases;
  assert.equal(before.tomorrow.state.days, 1);
  assert.equal(before.tomorrow.state.status, "PROXIMA");
  assert.equal(after.tomorrow.state.days, 0);
  assert.equal(after.tomorrow.state.status, "VENCIDA");
  assert.equal(before.zero.state.status, "VENCIDA");
});
test("El día de mantención cambia en Santiago aunque el dispositivo ya esté en el día siguiente", () => {
  const before = maintenanceAt(beforeSantiagoMidnight, "Asia/Tokyo");
  const after = maintenanceAt(afterSantiagoMidnight, "Asia/Tokyo");
  assert.equal(before.deviceDay, after.deviceDay);
  assert.equal(before.day, "2026-10-22");
  assert.equal(after.day, "2026-10-23");
});
test("Sin próxima fecha el cálculo conserva los límites de kilometraje", () => {
  const before = maintenanceAt(beforeSantiagoMidnight).cases;
  const after = maintenanceAt(afterSantiagoMidnight).cases;
  assert.equal(before.kmOnly.state.days, null);
  assert.equal(before.kmOnly.state.remaining, 2500);
  assert.equal(before.kmOnly.state.status, "PROXIMA");
  assert.equal(before.kmOutside.state.status, "AL_DIA");
  assert.deepEqual(before.kmOnly, after.kmOnly);
});
test("Sin próximo kilometraje el estado utiliza únicamente la próxima fecha", () => {
  const { state } = maintenanceAt(beforeSantiagoMidnight).cases.thirty;
  assert.equal(state.remaining, null);
  assert.equal(state.days, 30);
  assert.equal(state.status, "PROXIMA");
});
test("El día explícito de una consulta histórica sigue respetándose", () => {
  assert.equal(maintenanceAt(afterSantiagoMidnight).explicitDay, "Próxima");
});
console.log(count + " pruebas totales con fecha de Santiago completadas.");

const { maintenanceRecordSummary } = load(
  "features/portal-cliente/services/vehicleMaintenanceSummary",
);
const portalHistoricalDay = "2026-10-22";
const portalHistoricalFixture = {
  id: "historical-oil", workshopId: "workshop-a", vehicleId: "vehicle-a",
  type: "Cambio de aceite", maintenanceTypeCode: "OIL_CHANGE",
  interventionType: "MAINTENANCE", date: "2026-01-01", mileage: 5000,
  nextMileage: 12000, nextDate: "2026-06-01", notes: "Notas originales",
  workDetails: ["Filtro reemplazado"],
};
const portalCurrentFixture = {
  ...portalHistoricalFixture, id: "current-oil", type: "Aceite personalizado",
  date: "2026-10-01", mileage: 15000, nextMileage: 25000, nextDate: "2027-01-01",
};
test("Portal: un registro sustituido no genera alerta actual aunque sus objetivos estén vencidos", () => {
  const records = [portalHistoricalFixture, portalCurrentFixture];
  assert.equal(maintenanceState(portalHistoricalFixture, 15000, portalHistoricalDay).status, "VENCIDA");
  assert.equal(maintenanceRecordSummary(records, portalHistoricalFixture.id, 15000, portalHistoricalDay), null);
  assert.equal(maintenanceRecordSummary(records, portalCurrentFixture.id, 15000, portalHistoricalDay).tone, "current");
});
test("Portal: la mantención vigente conserva sus estados al día, próxima y vencida", () => {
  for (const [mileage, expected] of [[15000, "Al día"], [22500, "Próxima"], [25000, "Vencida"]]) {
    assert.equal(maintenanceRecordSummary([portalHistoricalFixture, portalCurrentFixture], portalCurrentFixture.id, mileage, portalHistoricalDay).status, expected);
  }
});
test("Portal: categorías diferentes conservan sus programaciones independientes", () => {
  const air = { ...portalHistoricalFixture, id: "air", maintenanceTypeCode: "AIR_FILTER", type: "Filtro aire" };
  const cabin = { ...portalCurrentFixture, id: "cabin", maintenanceTypeCode: "CABIN_FILTER", type: "Filtro cabina" };
  const records = [air, cabin];
  assert.equal(maintenanceRecordSummary(records, air.id, 15000, portalHistoricalDay).status, "Vencida");
  assert.equal(maintenanceRecordSummary(records, cabin.id, 15000, portalHistoricalDay).status, "Al día");
});
test("Portal: un registro antiguo sin reemplazo sigue siendo vigente", () => {
  assert.equal(maintenanceRecordSummary([portalHistoricalFixture], portalHistoricalFixture.id, 15000, portalHistoricalDay).status, "Vencida");
});
test("Portal: OTHER conserva agrupación por nombre y FILTERS sigue independiente de filtros específicos", () => {
  const oldOther = { ...portalHistoricalFixture, id: "old-other", maintenanceTypeCode: "OTHER", type: "Trabajo especial" };
  const newOther = { ...portalCurrentFixture, id: "new-other", maintenanceTypeCode: "OTHER", type: "  trabajo   especial " };
  const separate = { ...portalHistoricalFixture, id: "different-other", maintenanceTypeCode: "OTHER", type: "Otra reparación" };
  assert.equal(maintenanceRecordSummary([oldOther, newOther, separate], oldOther.id, 15000, portalHistoricalDay), null);
  assert.equal(maintenanceRecordSummary([oldOther, newOther, separate], separate.id, 15000, portalHistoricalDay).status, "Vencida");
  const legacyFilter = { ...portalHistoricalFixture, id: "legacy-filter", maintenanceTypeCode: "FILTERS", type: "Filtros" };
  const air = { ...portalCurrentFixture, id: "new-air", maintenanceTypeCode: "AIR_FILTER", type: "Filtro aire" };
  assert.equal(maintenanceRecordSummary([legacyFilter, air], legacyFilter.id, 15000, portalHistoricalDay).status, "Vencida");
});
test("Portal: registros antiguos sin código mantienen la inferencia y selección compartidas", () => {
  const legacy = { ...portalHistoricalFixture, maintenanceTypeCode: undefined };
  assert.equal(maintenanceRecordSummary([legacy, portalCurrentFixture], legacy.id, 15000, portalHistoricalDay), null);
  assert.equal(maintenanceRecordSummary([legacy], legacy.id, 15000, portalHistoricalDay).status, "Vencida");
});
test("Portal: una reparación sin programación no sustituye el mantenimiento vigente", () => {
  const repair = { ...portalCurrentFixture, id: "repair", interventionType: "REPAIR", nextMileage: 0, nextDate: "" };
  assert.equal(maintenanceRecordSummary([portalHistoricalFixture, repair], portalHistoricalFixture.id, 15000, portalHistoricalDay).status, "Vencida");
  assert.equal(maintenanceRecordSummary([portalHistoricalFixture, repair], repair.id, 15000, portalHistoricalDay), null);
});
test("Portal: seleccionar históricos no cambia el resumen general ni los datos originales", () => {
  const records = [portalHistoricalFixture, portalCurrentFixture];
  const original = JSON.stringify(records);
  const before = summarizeMaintenance(records, 15000, portalHistoricalDay);
  maintenanceRecordSummary(records, portalHistoricalFixture.id, 15000, portalHistoricalDay);
  maintenanceRecordSummary(records, portalCurrentFixture.id, 15000, portalHistoricalDay);
  assert.deepEqual(summarize(records, 15000, portalHistoricalDay), before);
  assert.equal(JSON.stringify(records), original);
  assert.equal(records.length, 2);
  assert.equal(summarize, summarizeMaintenance);
});
test("Portal: mantenciones de otros talleres o vehículos no sustituyen el registro seleccionado", () => {
  const otherWorkshop = { ...portalCurrentFixture, id: "other-workshop", workshopId: "workshop-b" };
  const otherVehicle = { ...portalCurrentFixture, id: "other-vehicle", vehicleId: "vehicle-b" };
  assert.equal(maintenanceRecordSummary([portalHistoricalFixture, otherWorkshop, otherVehicle], portalHistoricalFixture.id, 15000, portalHistoricalDay).status, "Vencida");
});
console.log(count + " pruebas totales con contexto histórico del Portal completadas.");

const defensiveDay = "2026-10-22";
const defensiveRecord = {
  id: "defensive", type: "Cambio de aceite", maintenanceTypeCode: "OIL_CHANGE",
  date: "2026-10-01", mileage: 10000, nextMileage: null, nextDate: null,
};
function assertDefensiveState(record, mileage, expected) {
  const state = maintenanceState(record, mileage, defensiveDay);
  assert.equal(state.status, expected);
  const summary = summarizeMaintenance([record], mileage, defensiveDay);
  const labels = { UNSCHEDULED: "Sin programación", AL_DIA: "Al día", PROXIMA: "Próxima", VENCIDA: "Vencida" };
  assert.equal(summary.status, labels[expected]);
  if (expected === "UNSCHEDULED") {
    assert.equal(summary.next, undefined);
    assert.equal(summary.tone, "neutral");
  } else {
    assert.equal(summary.next.record, record);
    assert.equal(summary.next.days, state.days ?? Infinity);
    assert.equal(summary.next.distance, state.remaining ?? Infinity);
  }
  return state;
}
test("Fechas inválidas, vacías o inexistentes sin km no generan programación", () => {
  for (const nextDate of [undefined, null, "", "incorrecta", "2026-02-30", "2026-13-01", "2026-1-01", "2026-10-22T00:00:00Z", 123, {}]) {
    const state = assertDefensiveState({ ...defensiveRecord, nextDate }, 10000, "UNSCHEDULED");
    assert.equal(state.days, null);
    assert.equal(state.remaining, null);
  }
});
test("Una fecha inválida no impide evaluar un objetivo válido de kilometraje", () => {
  for (const [nextMileage, expected] of [[10000, "VENCIDA"], [12500, "PROXIMA"], [12501, "AL_DIA"]]) {
    const state = assertDefensiveState({ ...defensiveRecord, nextDate: "2026-02-30", nextMileage }, 10000, expected);
    assert.equal(state.days, null);
    assert.equal(state.remaining, nextMileage - 10000);
  }
});
test("Kilometraje actual inválido ignora solo km y conserva evaluación por fecha", () => {
  for (const mileage of [undefined, null, NaN, Infinity, -1, "10000", "", {}]) {
    for (const [nextDate, expected] of [["2026-10-22", "VENCIDA"], ["2026-11-21", "PROXIMA"], ["2026-11-22", "AL_DIA"]]) {
      const state = assertDefensiveState({ ...defensiveRecord, nextMileage: 20000, nextDate }, mileage, expected);
      assert.equal(state.remaining, null);
    }
  }
});
test("Sin fecha válida ni comparación válida de km el estado es UNSCHEDULED", () => {
  for (const mileage of [undefined, null, NaN, Infinity, "10000", -1]) {
    assertDefensiveState({ ...defensiveRecord, nextMileage: 20000, nextDate: "inválida" }, mileage, "UNSCHEDULED");
  }
});
test("Objetivos de kilometraje ausentes, cero, negativos o inválidos no se convierten en cero", () => {
  for (const nextMileage of [undefined, null, 0, -1, NaN, Infinity, "20000", {}]) {
    assertDefensiveState({ ...defensiveRecord, nextMileage }, 10000, "UNSCHEDULED");
    const state = assertDefensiveState({ ...defensiveRecord, nextMileage, nextDate: "2026-11-21" }, 10000, "PROXIMA");
    assert.equal(state.remaining, null);
  }
});
test("Los límites de 0 y 2500 km se conservan sin fecha y cero km actuales es válido", () => {
  for (const [nextMileage, mileage, expected, remaining] of [
    [10000, 10000, "VENCIDA", 0], [10000, 10001, "VENCIDA", -1],
    [12500, 10000, "PROXIMA", 2500], [12501, 10000, "AL_DIA", 2501],
    [2500, 0, "PROXIMA", 2500],
  ]) {
    assert.equal(assertDefensiveState({ ...defensiveRecord, nextMileage }, mileage, expected).remaining, remaining);
  }
});
test("Los límites de 0 y 30 días se conservan sin kilometraje", () => {
  for (const [nextDate, expected, days] of [
    ["2026-10-21", "VENCIDA", -1], ["2026-10-22", "VENCIDA", 0],
    ["2026-11-21", "PROXIMA", 30], ["2026-11-22", "AL_DIA", 31],
  ]) {
    assert.equal(assertDefensiveState({ ...defensiveRecord, nextDate }, 10000, expected).days, days);
  }
});
test("La validación de calendario acepta el día bisiesto y descarta fechas normalizadas", () => {
  assert.equal(maintenanceState({ nextDate: "2028-02-29", nextMileage: null }, 0, "2028-02-28").days, 1);
  assert.equal(maintenanceState({ nextDate: "2027-02-29", nextMileage: null }, 0, "2027-02-28").status, "UNSCHEDULED");
  assert.equal(maintenanceState({ nextDate: "2026-11-21", nextMileage: 12500 }, 10000, "inválida").status, "PROXIMA");
});
test("Un objetivo inválido vigente no reactiva una programación histórica sustituida", () => {
  const old = { ...defensiveRecord, id: "old", date: "2026-01-01", nextMileage: 5000 };
  const current = { ...defensiveRecord, id: "current", nextDate: "inválida" };
  const records = [old, current];
  assert.equal(latestMaintenanceByType(records)[0], current);
  assert.equal(summarizeMaintenance(records, 10000, defensiveDay).status, "Sin programación");
});
test("El resumen con datos válidos conserva prioridad, distancias, fechas y datos originales", () => {
  const oil = { ...defensiveRecord, nextMileage: 20000, nextDate: "2027-01-01" };
  const air = { ...defensiveRecord, id: "air-valid", maintenanceTypeCode: "AIR_FILTER", type: "Filtro de aire", nextMileage: 12500, nextDate: "2026-11-22" };
  const records = [oil, air];
  const original = JSON.stringify(records);
  const summary = summarizeMaintenance(records, 10000, defensiveDay);
  assert.equal(summary.lastDate, "2026-10-01");
  assert.equal(summary.status, "Próxima");
  assert.equal(summary.tone, "soon");
  assert.equal(summary.next.record, air);
  assert.equal(summary.next.distance, 2500);
  assert.equal(summary.next.days, 31);
  assert.equal(summary.next.rank, 1);
  assert.equal(JSON.stringify(records), original);
  assert.equal(summarizeMaintenance([], 10000, defensiveDay).status, "Sin historial");
});
console.log(count + " pruebas totales con validación defensiva de mantenciones completadas.");

// Exercise the actual order component and submit handler with the existing domain rules.
function mountReceptionOrder({ id, initialVehicleId = "", actor = admin, store = data } = {}) {
  const hooks = [];
  let cursor = 0;
  let currentData = structuredClone(store);
  const submissions = [], navigation = [];
  const jsx = (type, props) => ({ type, props });
  const relative = "features/ordenes/components/editor/WorkOrderForm.tsx";
  const result = { exports: {} };
  const names = ["WorkOrderAssignment", "WorkOrderHeader", "OrderRegistrationModal", "CustomerSection", "VehicleSection", "ReceptionSection", "DiagnosisSection", "ScannerCodesSection", "ServicesSection", "PartsSection", "PhotoEvidenceSection", "ObservationsSection", "WorkOrderSummary", "MaintenanceSection", "CancelVisitDialog", "CancellationDetails"];
  const stubs = {
    react: { useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial; return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }]; } },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "@/components/Modal/Modal": { Modal: "Modal" },
    "next/link": { default: "Link" },
    "next/navigation": { useRouter: () => ({ push: (url) => navigation.push(url) }) },
    "@/components/ui/primitives": { Field: "Field", Panel: "Panel", EmptyState: "EmptyState" },
    "@/features/shared/components/store/StoreProvider": { useStore: () => ({
      data: currentData, user: actor, notify() {},
      async saveWorkOrder(payload, editing) {
        submissions.push({ payload: structuredClone(payload), editing });
        const next = saveOrder(currentData, actor, payload);
        let saved = next.orders.find((item) => item.id === payload.id);
        if (!editing) {
          saved = { ...saved, id: "persisted-reception-id", number: "OT-9001" };
          next.orders = next.orders.map((item) => item.id === payload.id ? saved : item);
        }
        currentData = next;
        return saved;
      },
    }) },
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, {
    exports: result.exports, module: result, structuredClone,
    window: { scrollTo() {} },
    require(request) {
      if (request in stubs) return stubs[request];
      if (request.endsWith(".module.css")) return { default: { orderEditor: "orderEditor", quickReception: "quickReception" } };
      const name = names.find((item) => request.endsWith("/" + item));
      if (name) return { [name]: name };
      return load(request.startsWith("@/") ? request.slice(2) : path.relative(root, path.resolve(root, path.dirname(relative), request)));
    },
  });
  function all(node, predicate) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap((child) => all(child, predicate));
    return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  }
  const render = () => { cursor = 0; return result.exports.WorkOrderForm({ id, initialVehicleId }); };
  const child = (name) => all(render(), (node) => node.type === name)[0];
  return {
    child, submissions, navigation,
    has: (name) => !!child(name),
    current: () => child("ReceptionSection")?.props.order,
    change: (patch) => {
      const { mileage, ...rest } = patch;
      if (Object.hasOwn(patch, "mileage")) child("ReceptionSection").props.onMileageChange(mileage === undefined ? "" : String(mileage));
      child("ReceptionSection").props.onChange(rest);
    },
    reading: () => child("ReceptionSection").props.mileageInput,
    reference: () => child("ReceptionSection").props.referenceMileage,
    usePrevious: () => child("ReceptionSection").props.onUsePreviousMileage(),
    pending: () => !!child("Modal"),
    cancelSelection: () => child("Modal").props.onClose(),
    confirmSelection(clear = false) { all(render(), n => n.type === "button" && n.props.children === (clear ? "Cambiar e ingresar nueva lectura" : "Cambiar y conservar lectura"))[0].props.onClick(); },
    async submit() { const form = child("form"); await form.props.onSubmit({ preventDefault() {}, nativeEvent: { submitter: null } }); },
    error: () => all(render(), (node) => node.props?.role === "alert")[0]?.props.children,
  };
}
async function receptionTest(name, run) { await run(); count++; console.log("✓ " + name); }

await receptionTest("Recepción rápida muestra solo ingreso y no exige secciones técnicas ni costos", async () => {
  const vehicle = data.vehicles.find((v) => v.workshopId === admin.workshopId);
  const form = mountReceptionOrder({ initialVehicleId: vehicle.id });
  assert.equal(form.child("ReceptionSection").props.receptionOnly, true);
  for (const component of ["DiagnosisSection", "ScannerCodesSection", "ServicesSection", "PartsSection", "PhotoEvidenceSection", "MaintenanceSection", "ObservationsSection", "WorkOrderSummary"]) assert.equal(form.has(component), false);
  form.change({ reason: "Ruido al frenar", mechanicId: worker.id, mileage: vehicle.mileage });
  await form.submit();
  assert.equal(form.submissions[0].editing, false);
  const payload = form.submissions[0].payload;
  assert.equal(payload.diagnosis, ""); assert.equal(payload.status, "RECEIVED");
  for (const key of ["services", "parts", "photos", "codes"]) assert.deepEqual(payload[key], []);
  assert.equal(form.current().id, "persisted-reception-id");
  assert.equal(form.current().number, "OT-9001");
  assert.equal(form.navigation[0], "/ordenes/persisted-reception-id");
});
await receptionTest("Órdenes guardadas conservan todas las secciones y no borran datos técnicos al guardar recepción", async () => {
  const enriched = { ...structuredClone(order), updatedAt: "2026-10-22T12:00:00Z" };
  enriched.services[0].maintenanceTypeCode = "OIL_CHANGE";
  const store = { ...data, orders: data.orders.map((item) => item.id === enriched.id ? enriched : item) };
  const form = mountReceptionOrder({ id: enriched.id, store });
  for (const component of ["DiagnosisSection", "ServicesSection", "PartsSection", "PhotoEvidenceSection", "MaintenanceSection", "WorkOrderSummary"]) assert.equal(form.has(component), true);
  form.change({ reason: "Motivo corregido" }); await form.submit();
  const payload = form.submissions[0].payload;
  for (const key of ["diagnosis", "findings", "symptoms", "observations", "codes", "services", "parts", "photos", "updatedAt", "status"]) assert.deepEqual(payload[key], enriched[key]);
  assert.equal(payload.services[0].maintenanceTypeCode, "OIL_CHANGE");
  assert.equal(form.submissions[0].editing, true); assert.deepEqual(form.navigation, []);
});
await receptionTest("Editar distintas secciones y volver a recepción mantiene todos los cambios en la misma orden", async () => {
  const form = mountReceptionOrder({ id: order.id });
  form.child("DiagnosisSection").props.onChange({ diagnosis: "Diagnóstico en curso" });
  form.child("ServicesSection").props.onChange({ services: [{ ...order.services[0], maintenanceTypeCode: "AIR_FILTER", description: "Detalle técnico" }] });
  form.child("ReceptionSection").props.onChange({ reason: "Motivo aclarado" });
  assert.equal(form.child("DiagnosisSection").props.order.diagnosis, "Diagnóstico en curso");
  await form.submit();
  assert.equal(form.submissions[0].payload.id, order.id);
  assert.equal(form.submissions[0].payload.services[0].maintenanceTypeCode, "AIR_FILTER");
  assert.equal(form.submissions[0].payload.diagnosis, "Diagnóstico en curso");
});
await receptionTest("Órdenes antiguas sin clasificación siguen editándose sin inventar códigos", async () => {
  const legacy = structuredClone(order); delete legacy.assignmentType;
  for (const service of legacy.services) delete service.maintenanceTypeCode;
  const form = mountReceptionOrder({ id: legacy.id, store: { ...data, orders: [legacy] } });
  await form.submit();
  assert.equal(form.error(), undefined);
  assert.deepEqual(form.submissions[0].payload.services, legacy.services);
  assert.equal(form.submissions[0].payload.status, legacy.status);
});
await receptionTest("Recepción mantiene las validaciones de motivo, kilometraje y asignación", async () => {
  const vehicle = data.vehicles.find((v) => v.workshopId === admin.workshopId);
  for (const patch of [{ reason: "" }, { mileage: -1 }, { mechanicId: "" }]) {
    const form = mountReceptionOrder({ initialVehicleId: vehicle.id });
    form.change({ reason: "Recepción", mechanicId: worker.id, mileage: vehicle.mileage, ...patch });
    await form.submit(); assert.ok(form.error()); assert.equal(form.navigation.length, 0);
  }
});
await receptionTest("Un trabajador conserva sus permisos y no obtiene registro administrativo ni entrega", async () => {
  const form = mountReceptionOrder({ id: order.id, actor: worker });
  assert.equal(form.has("OrderRegistrationModal"), false);
  assert.equal(form.child("WorkOrderHeader").props.canMarkReady, false);
  form.change({ status: "DELIVERED" }); await form.submit();
  assert.match(form.error(), /permiso/);
});
await receptionTest("Una orden compartida desactualizada conserva el rechazo de concurrencia", async () => {
  const shared = { ...structuredClone(order), assignmentType: "TEAM", mechanicId: "", updatedAt: "2026-10-22T12:00:00Z" };
  const form = mountReceptionOrder({ id: shared.id, store: { ...data, orders: [shared] } });
  form.change({ updatedAt: "2026-10-22T11:00:00Z" }); await form.submit();
  assert.match(form.error(), /Otra persona actualizó/);
});
await receptionTest("Crear recepción y editar una orden no modifica el historial de mantenciones", async () => {
  const original = JSON.stringify(data.maintenance);
  const form = mountReceptionOrder({ id: order.id }); await form.submit();
  assert.equal(JSON.stringify(data.maintenance), original);
  assert.equal(form.child("MaintenanceSection").props.orderId, order.id);
});
console.log(count + " pruebas totales con recepción rápida completadas.");

test("La sección de recepción conserva los cuatro campos obligatorios y oculta solo síntomas al crear", () => {
  const result = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(fs.readFileSync(path.join(root, "features/ordenes/components/editor/sections/ReceptionSection.tsx"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports: result.exports, module: result, require(request) {
    if (request === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (request === "@/components/ui/primitives") return { Panel: "Panel", Field: "Field", TextField: "TextField" };
    if (request === "@/utils/format") return { km: value => value + " km" };
    throw new Error("Unexpected reception import: " + request);
  } });
  function fields(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(fields);
    return [...(node.type === "Field" || node.type === "TextField" ? [node.props] : []), ...fields(node.props?.children)];
  }
  const quick = fields(result.exports.ReceptionSection({ order, onChange() {}, receptionOnly: true }));
  assert.deepEqual(quick.map((field) => field.label), ["Fecha de ingreso", "Hora", "Kilometraje de ingreso", "Motivo de ingreso"]);
  assert.ok(quick.every((field) => field.required));
  const complete = fields(result.exports.ReceptionSection({ order, onChange() {} }));
  assert.equal(complete.length, 5);
  assert.equal(complete[4].label, "Síntomas informados por el cliente");
  assert.equal(complete[4].value, order.symptoms);
});
console.log(count + " pruebas totales con campos de recepción verificados.");

// Exercise the existing customer form's submit path in both reception and full modes.
function mountQuickClient({ client, mode, live = true, failure } = {}) {
  const state = []; let cursor = 0;
  const savedCalls = [], callbacks = [];
  const jsx = (type, props) => ({ type, props });
  const relative = "features/clientes/components/forms/ClientForm.tsx";
  const result = { exports: {} };
  const stubs = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (v) => { state[i] = typeof v === "function" ? v(state[i]) : v; }]; } },
    "./ClientForm.module.css": { default: { additionalDetails: "additionalDetails" } },
    "@/components/ImageUploader/ImageUploader": { ImageUploader: "ImageUploader" },
    "@/components/ui/primitives": { Field: "Field", TextField: "TextField", Panel: "Panel" },
    "../reminders/ReminderPreferenceFields": { ReminderPreferenceFields: "ReminderPreferenceFields" },
    "@/features/shared/components/store/StoreProvider": { useStore: () => ({ data, user: admin, live, async saveCustomer(customer, editing) { savedCalls.push({ customer, editing }); if (failure) throw Error(failure); return { ...customer, id: "server-customer-id" }; } }) },
    "@/utils/format": { today: () => "2026-10-22", uid: () => "client-test-id" },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: result.exports, module: result,
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? null; } },
    require(request) { if (request in stubs) return stubs[request]; return load(path.relative(root, path.resolve(root, path.dirname(relative), request))); },
  });
  const nodes = (node, predicate) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(n => nodes(n, predicate)) : [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
  const render = () => { cursor = 0; return result.exports.ClientForm({ client, mode, onSave: value => callbacks.push(value), onCancel() {} }); };
  return {
    savedCalls, callbacks, render,
    fields: () => nodes(render(), n => n.type === "Field" || n.type === "TextField"),
    details: () => nodes(render(), n => n.type === "details"),
    error: () => nodes(render(), n => n.props?.role === "alert")[0]?.props.children,
    async submit(values) { await render().props.onSubmit({ preventDefault() {}, currentTarget: values }); },
  };
}
await receptionTest("Cliente rápido: solo nombre requerido y guardado usa el cliente devuelto por el servidor", async () => {
  const form = mountQuickClient({ mode: "reception" });
  assert.deepEqual(form.fields().filter(n => n.props.required).map(n => n.props.name), ["name"]);
  assert.equal(form.details().length, 1); assert.equal(form.details()[0].props.open, undefined);
  await form.submit({ name: "  Cliente de recepción  " });
  assert.equal(form.savedCalls.length, 1); assert.equal(form.savedCalls[0].editing, false);
  assert.equal(form.savedCalls[0].customer.name, "Cliente de recepción");
  assert.equal(form.savedCalls[0].customer.workshopId, admin.workshopId);
  for (const key of ["rut", "phone", "email", "address", "notes"]) assert.equal(form.savedCalls[0].customer[key], "");
  assert.equal(form.callbacks[0].id, "server-customer-id");
});
await receptionTest("Cliente rápido: nombre vacío y RUT duplicado normalizado no llaman al guardado", async () => {
  const empty = mountQuickClient({ mode: "reception" }); await empty.submit({ name: "   " });
  assert.equal(empty.savedCalls.length, 0); assert.match(empty.error(), /nombre completo/);
  const existing = data.customers.find(c => c.rut);
  const duplicate = mountQuickClient({ mode: "reception" });
  await duplicate.submit({ name: "Otra persona", rut: existing.rut.replace(/[.\s-]/g, "").toUpperCase() });
  assert.equal(duplicate.savedCalls.length, 0); assert.match(duplicate.error(), /Ya existe/);
});
await receptionTest("Cliente rápido: datos opcionales se envían completos y el error de API conserva el formulario", async () => {
  const form = mountQuickClient({ mode: "reception", failure: "Conflicto al guardar" });
  await form.submit({ name: "Cliente", email: "cliente@example.test", address: "Dirección de prueba", notes: "Observación de prueba", phone: "+56912345678" });
  assert.equal(form.savedCalls[0].customer.email, "cliente@example.test");
  assert.equal(form.savedCalls[0].customer.address, "Dirección de prueba");
  assert.equal(form.savedCalls[0].customer.notes, "Observación de prueba");
  assert.equal(form.callbacks.length, 0); assert.match(form.error(), /Conflicto/);
  assert.equal(form.details().length, 1);
});
await receptionTest("Cliente completo y edición conservan teléfono obligatorio, fotos, notas y consentimiento", async () => {
  const original = structuredClone(data.customers[0]);
  for (const mode of [undefined, "reception"]) {
    const form = mountQuickClient({ client: original, mode });
    assert.equal(form.details().length, 0);
    assert.equal(form.fields().find(n => n.props.name === "phone").props.required, true);
    await form.submit({ name: original.name, rut: original.rut, phone: original.phone, email: original.email, address: original.address, notes: original.notes });
    assert.equal(form.savedCalls[0].editing, true);
    assert.equal(form.savedCalls[0].customer.id, original.id);
    assert.deepEqual(structuredClone(form.savedCalls[0].customer.photos), original.photos ?? []);
    assert.equal(form.savedCalls[0].customer.publicAccessToken, original.publicAccessToken ?? "demo-client-" + original.id);
    assert.equal(form.savedCalls[0].customer.notes, original.notes);
  }
});
await receptionTest("Registrar cliente y vehículo en recepción conserva motivo, asignación y datos de la orden", async () => {
  const form = mountReceptionOrder();
  form.change({ reason: "Ruido en frenos", mechanicId: worker.id, time: "09:15" });
  const before = structuredClone(form.current());
  form.child("CustomerSection").props.onCreate();
  form.child("OrderRegistrationModal").props.onCustomerSave({ id: "saved-client" });
  assert.equal(form.current().customerId, "saved-client");
  assert.equal(form.child("OrderRegistrationModal").props.kind, "vehicle");
  assert.equal(form.child("OrderRegistrationModal").props.customerId, "saved-client");
  form.child("OrderRegistrationModal").props.onVehicleSave({ ...data.vehicles[0], id: "saved-vehicle", customerId: "saved-client", workshopId: admin.workshopId, mileage: 100 });
  assert.equal(form.current().vehicleId, "saved-vehicle");
  assert.equal(form.has("OrderRegistrationModal"), false);
  for (const key of ["id", "reason", "mechanicId", "time", "date", "status"]) assert.equal(form.current()[key], before[key]);
});
console.log(count + " pruebas totales con registro rápido de clientes completadas.");

function mountQuickVehicle({ vehicle, ownerId, failure } = {}) {
  const state = []; let cursor = 0;
  const savedCalls = [], callbacks = [];
  const jsx = (type, props) => ({ type, props });
  const relative = "features/vehiculos/components/forms/VehicleForm.tsx";
  const result = { exports: {} };
  const stubs = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useRef(initial) { const i=cursor++;return state[i] ?? (state[i]={current:initial}); }, useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (v) => { state[i] = typeof v === "function" ? v(state[i]) : v; }]; } },
    "../../services/registrationReview": {},
    "../../hooks/usePlateRegistrationCheck": { usePlateRegistrationCheck: () => ({ busy: false, blocked: false, check() {} }) },
    "./PrivateRegistrationCapture": { PrivateRegistrationCapture: "PrivateRegistrationCapture" },
    "./PlateRegistrationCheck": { PlateRegistrationCheck: "PlateRegistrationCheck" },
    "./VehicleForm.module.css": { default: { technicalDetails: "technicalDetails" } },
    "@/components/ui/primitives": { Field: "Field", SelectField: "SelectField" },
    "@/features/shared/components/store/StoreProvider": { useStore: () => ({ data, user: admin, async saveVehicle(value, editing) { savedCalls.push({ vehicle: value, editing }); if (failure) throw Error(failure); return { ...value, id: "server-vehicle-id" }; } }) },
    "@/utils/format": { uid: () => "vehicle-test-id" },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: result.exports, module: result,
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? null; } },
    require(request) { if (request in stubs) return stubs[request]; throw Error("Unexpected vehicle form import: " + request); },
  });
  const nodes = (node, predicate) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(n => nodes(n, predicate)) : [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
  const render = () => { cursor = 0; return result.exports.VehicleForm({ vehicle, ownerId, onSave: value => callbacks.push(value), onCancel() {} }); };
  return {
    savedCalls, callbacks,
    fields: () => nodes(render(), n => n.type === "Field" || n.type === "SelectField"),
    details: () => nodes(render(), n => n.type === "details"),
    options: (name) => nodes(nodes(render(), n => n.type === "SelectField" && n.props.name === name)[0], n => n.type === "option"),
    error: () => nodes(render(), n => n.props?.role === "alert")[0]?.props.children,
    async submit(values) { await render().props.onSubmit({ preventDefault() {}, currentTarget: values }); },
  };
}
const quickVehicleValues = { customerId: data.customers[0].id, plate: "ZZQA123", brand: "Marca QA", model: "Modelo QA", year: "2020", mileage: "85000" };
await receptionTest("Vehículo rápido: propietario fijado por recepción prevalece sobre valores enviados por el formulario", async () => {
  const ownerId = data.customers[0].id;
  const form = mountQuickVehicle({ ownerId });
  const owner = form.fields().find(n => n.props.name === "customerId");
  assert.equal(owner.props.defaultValue, ownerId); assert.equal(owner.props.disabled, true);
  await form.submit({ ...quickVehicleValues, customerId: "foreign-client" });
  assert.equal(form.savedCalls[0].vehicle.customerId, ownerId);
  assert.equal(form.savedCalls[0].vehicle.workshopId, admin.workshopId);
  assert.equal(form.callbacks[0].id, "server-vehicle-id");
});
await receptionTest("Vehículo: patente, marca, modelo, año y kilometraje vacíos no llaman al guardado", async () => {
  for (const field of ["plate", "brand", "model", "year", "mileage"]) {
    for (const value of ["", "   ", undefined]) {
      const form = mountQuickVehicle({ ownerId: data.customers[0].id });
      await form.submit({ ...quickVehicleValues, [field]: value });
      assert.equal(form.savedCalls.length, 0, field + " must not be converted to a default");
      assert.ok(form.error()); assert.equal(form.callbacks.length, 0);
    }
  }
});
await receptionTest("Vehículo: cero real se conserva y números inválidos, decimales y fuera de rango se rechazan", async () => {
  const valid = mountQuickVehicle(); await valid.submit({ ...quickVehicleValues, mileage: "0" });
  assert.equal(valid.savedCalls[0].vehicle.mileage, 0);
  assert.equal(valid.savedCalls[0].vehicle.year, 2020);
  for (const [field, value] of [["mileage", "-1"], ["mileage", "1.5"], ["mileage", "NaN"], ["mileage", "Infinity"], ["mileage", "2147483648"], ["year", "1899"], ["year", "2020.5"], ["year", "desconocido"], ["year", String(new Date().getFullYear() + 2)]]) {
    const form = mountQuickVehicle(); await form.submit({ ...quickVehicleValues, [field]: value });
    assert.equal(form.savedCalls.length, 0); assert.ok(form.error());
  }
});
await receptionTest("Vehículo rápido: datos técnicos permanecen montados dentro del desplegable y se incluyen en el guardado", async () => {
  const form = mountQuickVehicle({ ownerId: data.customers[0].id });
  assert.equal(form.details().length, 1); assert.equal(form.details()[0].props.open, undefined);
  for (const name of ["version", "vin", "engine", "fuel", "transmission", "color"]) assert.ok(form.fields().some(n => n.props.name === name));
  const values = { ...quickVehicleValues, version: "Versión QA", vin: "VIN-QA", engine: "Motor QA", fuel: "Diésel", transmission: "Automática", color: "Azul" };
  await form.submit(values);
  for (const key of ["version", "vin", "engine", "fuel", "transmission", "color"]) assert.equal(form.savedCalls[0].vehicle[key], values[key]);
});
await receptionTest("Vehículos nuevos: combustible y transmisión comienzan vacíos en recepción y formulario completo", async () => {
  for (const ownerId of [undefined, data.customers[0].id]) {
    const form = mountQuickVehicle({ ownerId });
    for (const name of ["fuel", "transmission"]) {
      assert.equal(form.fields().find(n => n.props.name === name).props.defaultValue, "");
      assert.equal(form.options(name)[0].props.value, "");
    }
    await form.submit(quickVehicleValues);
    assert.equal(form.savedCalls[0].vehicle.fuel, ""); assert.equal(form.savedCalls[0].vehicle.transmission, "");
  }
});
await receptionTest("Edición de vehículo conserva datos técnicos, fotos y opciones históricas fuera del catálogo", async () => {
  const original = { ...structuredClone(data.vehicles[0]), version: "Histórica", vin: "VIN-HISTORICO", engine: "Motor histórico", fuel: "GLP", transmission: "CVT", color: "Rojo", photos: [{ id: "existing-photo", url: "data:image/png;base64,AA", category: "BEFORE", description: "Original", date: "2026-10-22", userId: admin.id }] };
  const form = mountQuickVehicle({ vehicle: original });
  assert.equal(form.details().length, 0);
  assert.equal(form.fields().length, 12);
  for (const name of ["fuel", "transmission"]) {
    assert.equal(form.fields().find(n => n.props.name === name).props.defaultValue, original[name]);
    assert.ok(form.options(name).some(n => n.props.value === original[name]));
  }
  await form.submit({ ...original, year: String(original.year), mileage: String(original.mileage) });
  assert.equal(form.savedCalls[0].editing, true);
  for (const key of ["id", "customerId", "version", "vin", "engine", "fuel", "transmission", "color"]) assert.equal(form.savedCalls[0].vehicle[key], original[key]);
  assert.deepEqual(form.savedCalls[0].vehicle.photos, original.photos);
});
await receptionTest("Vehículo: patente duplicada sigue bloqueada y un fallo de API no dispara selección de vehículo", async () => {
  const duplicate = mountQuickVehicle(); await duplicate.submit({ ...quickVehicleValues, plate: data.vehicles[0].plate });
  assert.equal(duplicate.savedCalls.length, 0); assert.match(duplicate.error(), /ya está registrada/);
  const failed = mountQuickVehicle({ failure: "El propietario no pertenece a tu taller." }); await failed.submit(quickVehicleValues);
  assert.equal(failed.callbacks.length, 0); assert.match(failed.error(), /propietario/);
});
console.log(count + " pruebas totales con registro manual rápido de vehículos completadas.");

const plateSearch = load("features/vehiculos/services/vehiclePlateSearch.ts");
const plateBase = data.vehicles.find(v => v.workshopId === admin.workshopId);
const localPlateVehicles = [
  { ...plateBase, id: "partial", plate: "XABCD12", customerId: "other-owner" },
  { ...plateBase, id: "exact", plate: "AB-CD-12" },
  { ...plateBase, id: "other", plate: "ABCD99", customerId: "other-owner" },
  { ...plateBase, id: "foreign", plate: "ABCD12", workshopId: "foreign-workshop" },
  { ...plateBase, id: "inactive", plate: "ABCD12", active: false },
];
test("Búsqueda de patente normaliza igual que API y prioriza exactas sobre parciales", () => {
  for (const value of [" ab-cd-12 ", "AB CD 12", "abcd12", "AB.CD.12"]) assert.equal(plateSearch.normalizePlate(value), "ABCD12");
  assert.equal(plateSearch.normalizePlate("---"), "");
  const index = plateSearch.indexVehiclePlates(localPlateVehicles, admin.workshopId);
  const result = plateSearch.searchVehiclePlates(index, "ab cd 12");
  assert.deepEqual(result.results.map(v => v.id), ["exact", "partial"]);
  assert.equal(result.exactCount, 1);
});
test("Índice local excluye otros talleres e inactivos y limita resultados sin ocultar ambigüedad", () => {
  const list = Array.from({ length: 8 }, (_, i) => ({ ...plateBase, id: "candidate-" + i, plate: "AB-CD-12" }));
  const index = plateSearch.indexVehiclePlates([...list, ...localPlateVehicles], admin.workshopId);
  const result = plateSearch.searchVehiclePlates(index, "abcd12");
  assert.equal(result.results.length, 5); assert.equal(result.exactCount, 9); assert.equal(result.total, 10);
  assert.ok(!result.results.some(v => ["foreign", "inactive"].includes(v.id)));
  assert.equal(plateSearch.searchVehiclePlates(index, "").total, 0);
});
function mountPlateSection({ searchVehicles = localPlateVehicles, customerId = plateBase.customerId, disabled = false, selectedValue = "", onSelect } = {}) {
  const hooks = []; let cursor = 0; const selections = [];
  const jsx = (type, props) => ({ type, props }); const result = { exports: {} };
  const relative = "features/ordenes/components/editor/sections/VehicleSection.tsx";
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: result.exports, module: result,
    require(request) {
      if (request.endsWith("/usePlateRegistrationCheck")) return { usePlateRegistrationCheck: () => ({ busy: false, blocked: false, check() {} }) };
      if (request.endsWith("/PlateRegistrationCheck")) return { PlateRegistrationCheck: "PlateRegistrationCheck" };
      if (request === "react") return { useEffect() {}, useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value; }]; }, useMemo: run => run() };
      if (request === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (request === "@/components/ui/primitives") return { Field: "Field", SelectField: "SelectField" };
      if (request.endsWith(".module.css")) return { default: {} };
      if (request.endsWith("/vehiclePlateSearch")) return plateSearch;
      throw Error("Unexpected search import: " + request);
    },
  });
  const nodes = (node, predicate) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(n => nodes(n, predicate)) : [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
  const render = () => { cursor = 0; return result.exports.VehicleSection({ vehicles: searchVehicles.filter(v => v.customerId === customerId), searchVehicles, customerId, workshopId: admin.workshopId, value: selectedValue, onChange: id => { selections.push(id); onSelect?.(id); }, disabled }); };
  const field = () => nodes(render(), n => n.type === "Field")[0];
  return { selections,
    search(value) { field().props.onChange({ target: { value } }); },
    key(key) { let prevented = false; field().props.onKeyDown({ key, preventDefault() { prevented = true; } }); return prevented; },
    buttons: () => nodes(render(), n => n.type === "button"),
    statuses: () => nodes(render(), n => n.props?.role === "status"),
    text: () => JSON.stringify(render()),
  };
}
test("Buscar no selecciona automáticamente; reutilizar una coincidencia requiere acción explícita", () => {
  const section = mountPlateSection(); section.search("ab-cd-12");
  assert.deepEqual(section.selections, []);
  const button = section.buttons().find(n => n.props["aria-label"] === "Seleccionar AB-CD-12");
  assert.ok(button); assert.equal(button.props.type, "button"); button.props.onClick();
  assert.deepEqual(section.selections, ["exact"]);
});
test("Coincidencia de otro propietario advierte sin ofrecer selección ni revelar datos personales", () => {
  const section = mountPlateSection(); section.search("abcd99");
  assert.match(section.text(), /Asociado a otro cliente/);
  assert.equal(section.buttons().some(n => n.props["aria-label"]?.startsWith("Seleccionar ")), false);
  assert.deepEqual(section.selections, []);
});
test("Coincidencias normalizadas ambiguas requieren selección manual y no eligen la primera", () => {
  const section = mountPlateSection({ searchVehicles: [...localPlateVehicles, { ...plateBase, id: "legacy", plate: "ABCD12" }] });
  section.search("abcd12"); assert.match(section.text(), /Varias fichas coinciden/);
  assert.deepEqual(section.selections, []);
});
test("Sin coincidencias solo informa disponibilidad local y advierte límite de inactivos y permisos", () => {
  const section = mountPlateSection(); section.search("ZZ9999");
  assert.match(section.text(), /No encontrado entre los vehículos disponibles/);
  assert.match(section.text(), /no confirma que la patente esté libre/);
  assert.match(section.text(), /inactivos ni fuera de tu acceso/);
});
test("Limpiar, cerrar, Enter y Escape no seleccionan vehículo ni envían el formulario", () => {
  const section = mountPlateSection(); section.search("abcd12");
  assert.equal(section.key("Enter"), true); assert.equal(section.statuses().length, 1);
  assert.equal(section.key("Escape"), true); assert.equal(section.statuses().length, 0);
  section.search("abcd12"); section.buttons().find(n => n.props.children === "Cerrar resultados").props.onClick();
  assert.equal(section.statuses().length, 0);
  section.search("abcd12"); section.buttons().find(n => n.props.children === "Limpiar búsqueda").props.onClick();
  assert.equal(section.statuses().length, 0); assert.deepEqual(section.selections, []);
});
await receptionTest("Selección de vehículo conserva kilometraje escrito, incluido cero, y los demás datos de recepción", async () => {
  const first = { ...plateBase }, second = { ...plateBase, id: "another-vehicle", mileage: 20000 };
  const form = mountReceptionOrder({ initialVehicleId: first.id, store: { ...data, vehicles: [first, second] } });
  for (const mileage of [98765, 0]) {
    form.change({ mileage, reason: "Motivo conservado", time: "10:30", mechanicId: worker.id });
    const before = structuredClone(form.current());
    const next = before.vehicleId === second.id ? first.id : second.id;
    form.child("VehicleSection").props.onChange(next);
    assert.equal(form.pending(), true);
    assert.deepEqual(structuredClone(form.current()), before);
    form.confirmSelection();
    assert.equal(form.current().vehicleId, next); assert.equal(form.reading(), String(mileage));
    for (const key of Object.keys(before).filter(k => k !== "vehicleId")) assert.deepEqual(structuredClone(form.current()[key]), before[key]);
    form.child("VehicleSection").props.onChange(""); form.confirmSelection(); assert.equal(form.reading(), String(mileage));
  }
});
await receptionTest("Sin lectura manual la selección muestra referencia sin confirmarla; elegir el mismo vehículo no altera la lectura", async () => {
  const first = { ...plateBase }, second = { ...plateBase, id: "another-vehicle", mileage: 20000 };
  const form = mountReceptionOrder({ initialVehicleId: first.id, store: { ...data, vehicles: [first, second] } });
  form.child("VehicleSection").props.onChange(second.id); assert.equal(form.reading(), ""); assert.equal(form.reference(), 20000);
  form.change({ mileage: 25000 }); form.child("VehicleSection").props.onChange(second.id); assert.equal(form.reading(), "25000"); assert.equal(form.pending(), false);
});
await receptionTest("Búsqueda recibe solo vehículos autorizados por permisos existentes y el taller actual", async () => {
  const form = mountReceptionOrder({ actor: worker });
  const expected = scopedData(data, worker).vehicles.map(v => v.id);
  assert.equal(JSON.stringify(form.child("VehicleSection").props.searchVehicles.map(v => v.id)), JSON.stringify(expected));
  assert.ok(form.child("VehicleSection").props.searchVehicles.every(v => v.workshopId === worker.workshopId));
});
await receptionTest("Seleccionar ID ajeno o de otro cliente no cambia la orden; registrar vehículo tampoco borra km manual", async () => {
  const otherOwner = { ...plateBase, id: "other-owner-vehicle", customerId: "different-owner" };
  const form = mountReceptionOrder({ initialVehicleId: plateBase.id, store: { ...data, vehicles: [...data.vehicles, otherOwner] } });
  form.change({ mileage: 98765 }); const before = structuredClone(form.current());
  for (const id of [otherOwner.id, "nonexistent-id"]) { form.child("VehicleSection").props.onChange(id); assert.deepEqual(structuredClone(form.current()), before); }
  form.child("VehicleSection").props.onCreate();
  form.child("OrderRegistrationModal").props.onVehicleSave({ ...plateBase, id: "created-vehicle", mileage: 100 });
  assert.equal(form.pending(), true); form.confirmSelection();
  assert.equal(form.reading(), "98765"); assert.equal(form.current().vehicleId, "created-vehicle");
});
console.log(count + " pruebas totales con búsqueda local de patentes completadas.");

await receptionTest("Nueva orden con vehículo conocido mantiene lectura pendiente y no construye ni envía WorkOrder incompleto", async () => {
  const form = mountReceptionOrder({ initialVehicleId: plateBase.id });
  assert.equal(form.reading(), ""); assert.equal(form.reference(), plateBase.mileage);
  assert.equal(Object.hasOwn(form.current(), "mileage"), false);
  form.change({ reason: "Recepción", mechanicId: worker.id });
  await form.submit(); assert.equal(form.submissions.length, 0); assert.match(form.error(), /Confirma el kilometraje/);
});
await receptionTest("Usar kilometraje anterior es explícito y genera un payload numérico compatible", async () => {
  const form = mountReceptionOrder({ initialVehicleId: plateBase.id });
  form.change({ reason: "Recepción", mechanicId: worker.id });
  assert.equal(form.reading(), ""); form.usePrevious(); assert.equal(form.reading(), String(plateBase.mileage));
  await form.submit(); assert.equal(form.submissions.length, 1);
  assert.equal(form.submissions[0].payload.mileage, plateBase.mileage);
  assert.equal(typeof form.submissions[0].payload.mileage, "number");
  assert.equal(Object.hasOwn(form.submissions[0].payload, "mileageInput"), false);
});
await receptionTest("Lectura vacía no es cero; cero real escrito expresamente se guarda y borrar vuelve a pendiente", async () => {
  const vehicle = { ...plateBase, mileage: 0 };
  const store = { ...data, vehicles: data.vehicles.map(v => v.id === vehicle.id ? vehicle : v) };
  const form = mountReceptionOrder({ initialVehicleId: vehicle.id, store });
  form.change({ reason: "Recepción", mechanicId: worker.id });
  await form.submit(); assert.equal(form.submissions.length, 0);
  form.change({ mileage: 0 }); assert.equal(form.reading(), "0"); await form.submit();
  assert.equal(form.submissions[0].payload.mileage, 0);
  const editing = mountReceptionOrder({ id: order.id }); editing.change({ mileage: undefined });
  assert.equal(editing.reading(), ""); await editing.submit(); assert.equal(editing.submissions.length, 0);
});
await receptionTest("Edición carga lectura guardada aunque difiera del histórico y conserva datos al guardar", async () => {
  const vehicle = data.vehicles.find(v => v.id === order.vehicleId);
  const form = mountReceptionOrder({ id: order.id, store: { ...data, vehicles: data.vehicles.map(v => v.id === vehicle.id ? { ...v, mileage: v.mileage + 1000 } : v) } });
  assert.equal(form.reading(), String(order.mileage));
  await form.submit(); assert.equal(form.submissions.length, 1);
  assert.equal(form.submissions[0].payload.mileage, order.mileage);
  for (const key of ["services", "parts", "photos", "status", "date", "customerId", "vehicleId"]) assert.deepEqual(form.submissions[0].payload[key], structuredClone(order[key]));
});
await receptionTest("Cancelar cambio de vehículo conserva el borrador completo y su lectura exacta", async () => {
  const second = { ...plateBase, id: "different-vehicle", mileage: 20000 };
  const form = mountReceptionOrder({ initialVehicleId: plateBase.id, store: { ...data, vehicles: [...data.vehicles, second] } });
  form.change({ mileage: 98765, reason: "Motivo", date: "2026-10-22", time: "09:45", mechanicId: worker.id });
  const before = structuredClone(form.current());
  form.child("VehicleSection").props.onChange(second.id); assert.equal(form.pending(), true);
  assert.deepEqual(structuredClone(form.current()), before); assert.equal(form.reading(), "98765");
  await form.submit(); assert.equal(form.submissions.length, 0);
  form.cancelSelection(); assert.deepEqual(structuredClone(form.current()), before); assert.equal(form.reading(), "98765");
});
await receptionTest("Confirmar cambio permite conservar lectura o dejarla pendiente sin alterar los demás datos", async () => {
  const second = { ...plateBase, id: "different-vehicle", mileage: 20000 };
  for (const clear of [false, true]) {
    const form = mountReceptionOrder({ initialVehicleId: plateBase.id, store: { ...data, vehicles: [...data.vehicles, second] } });
    form.change({ mileage: 98765, reason: "Motivo", time: "09:45", mechanicId: worker.id });
    const before = structuredClone(form.current());
    form.child("VehicleSection").props.onChange(second.id); form.confirmSelection(clear);
    assert.equal(form.current().vehicleId, second.id); assert.equal(form.reading(), clear ? "" : "98765");
    assert.equal(form.reference(), 20000);
    for (const key of Object.keys(before).filter(k => k !== "vehicleId")) assert.deepEqual(structuredClone(form.current()[key]), before[key]);
  }
});
await receptionTest("Lecturas inválidas no llegan al store y el límite de kilometraje decreciente se conserva", async () => {
  for (const value of [" ", "NaN", "Infinity", "1.5", "-1", "2147483648"]) {
    const form = mountReceptionOrder({ initialVehicleId: plateBase.id });
    form.child("ReceptionSection").props.onMileageChange(value); await form.submit();
    assert.equal(form.submissions.length, 0); assert.ok(form.error());
  }
  const form = mountReceptionOrder({ initialVehicleId: plateBase.id });
  form.change({ reason: "Recepción", mechanicId: worker.id, mileage: plateBase.mileage - 1 });
  await form.submit(); assert.match(form.error(), /kilometraje no puede ser menor/); assert.deepEqual(form.navigation, []);
});
test("VehicleSection no ejecuta callback para la coincidencia que ya está seleccionada", () => {
  const section = mountPlateSection({ selectedValue: "exact" }); section.search("ABCD12");
  section.buttons().find(n => n.props["aria-label"] === "Seleccionar AB-CD-12").props.onClick();
  assert.deepEqual(section.selections, []);
});
test("ReceptionSection entrega texto vacío o cero literal y el histórico se aplica solo mediante botón", () => {
  const result = { exports: {} }; const changes = []; let uses = 0;
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, "features/ordenes/components/editor/sections/ReceptionSection.tsx"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: result.exports, module: result, require(request) {
      if (request === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (request === "@/components/ui/primitives") return { Panel: "Panel", Field: "Field", TextField: "TextField" };
      if (request === "@/utils/format") return { km: value => value + " km" };
      throw Error(request);
    },
  });
  const node = result.exports.ReceptionSection({ order, onChange() {}, mileageInput: "", onMileageChange: value => changes.push(value), referenceMileage: 0, onUsePreviousMileage: () => uses++ });
  const nodes = (n, p) => !n || typeof n !== "object" ? [] : Array.isArray(n) ? n.flatMap(c => nodes(c, p)) : [...(p(n) ? [n] : []), ...nodes(n.props?.children, p)];
  const field = nodes(node, n => n.type === "Field" && n.props.label === "Kilometraje de ingreso")[0];
  assert.equal(field.props.value, ""); field.props.onChange({ target: { value: "" } }); field.props.onChange({ target: { value: "0" } });
  assert.deepEqual(changes, ["", "0"]); assert.equal(uses, 0);
  const button = nodes(node, n => n.type === "button")[0]; assert.equal(button.props.type, "button"); button.props.onClick(); assert.equal(uses, 1);
});
console.log(count + " pruebas totales con borrador y confirmación de kilometraje completadas.");


await receptionTest("Patente y recepción integradas: cancelar conserva todo y confirmar reutiliza ID con lectura manual", async () => {
  const first = { ...plateBase }, second = { ...plateBase, id: "plate-confirmed", plate: "ZZXY99", mileage: 20000 };
  const form = mountReceptionOrder({ initialVehicleId: first.id, store: { ...data, vehicles: [first, second] } });
  form.change({ mileage: 98765, reason: "Ingreso sin pérdidas", time: "11:40", mechanicId: worker.id });
  const before = structuredClone(form.current());
  const section = mountPlateSection({ searchVehicles: [first, second], selectedValue: first.id, onSelect: id => form.child("VehicleSection").props.onChange(id) });
  section.search("zz-xy-99"); assert.deepEqual(structuredClone(form.current()), before);
  section.buttons().find(n => n.props["aria-label"] === "Seleccionar ZZXY99").props.onClick();
  assert.equal(form.pending(), true); assert.deepEqual(structuredClone(form.current()), before); assert.equal(form.reading(), "98765");
  form.cancelSelection(); assert.deepEqual(structuredClone(form.current()), before); assert.equal(form.reading(), "98765");
  section.search("ZZXY99"); section.buttons().find(n => n.props["aria-label"] === "Seleccionar ZZXY99").props.onClick(); form.confirmSelection();
  assert.equal(form.current().vehicleId, second.id); assert.equal(form.reading(), "98765");
  for (const key of Object.keys(before).filter(k => k !== "vehicleId")) assert.deepEqual(structuredClone(form.current()[key]), before[key]);
});

await receptionTest("Buscar patente sin lectura no confirma el kilometraje histórico; limpiar no cambia la recepción", async () => {
  const vehicle = { ...plateBase, plate: "ZXCV12", mileage: 12345 };
  const form = mountReceptionOrder({ store: { ...data, vehicles: [vehicle] } });
  form.change({ customerId: vehicle.customerId, reason: "Solo referencia" });
  const section = mountPlateSection({ searchVehicles: [vehicle], onSelect: id => form.child("VehicleSection").props.onChange(id) });
  section.search("zx-cv-12"); section.buttons().find(n => n.props["aria-label"] === "Seleccionar ZXCV12").props.onClick();
  assert.equal(form.current().vehicleId, vehicle.id); assert.equal(form.reading(), ""); assert.equal(form.reference(), 12345); assert.equal(form.pending(), false);
  const before = structuredClone(form.current()); section.search("ZXCV"); section.buttons().find(n => n.props.children === "Limpiar búsqueda").props.onClick();
  assert.deepEqual(structuredClone(form.current()), before); assert.equal(form.reading(), "");
  form.usePrevious(); assert.equal(form.reading(), "12345");
});
console.log(count + " pruebas totales con búsqueda y confirmación integradas completadas.");
