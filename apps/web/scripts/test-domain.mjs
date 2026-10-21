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
