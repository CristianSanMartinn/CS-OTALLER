const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
require("@nestjs/config").ConfigModule.forRoot({
  envFilePath: [
    path.join(__dirname, "../.env.local"),
    path.join(__dirname, "../.env"),
  ],
});
const {
  MaintenanceService,
} = require("../dist/maintenance/maintenance.service.js");
const { PortalService } = require("../dist/portal/portal.service.js");
const {
  readMaintenanceTypeCode,
} = require("../dist/common/maintenance-type.js");

const {
  WorkOrdersService,
} = require("../dist/work-orders/work-orders.service.js");
const vm = require("node:vm");
const ts = require(
  path.resolve(__dirname, "../../web/node_modules/typescript"),
);
const webRoot = path.resolve(__dirname, "../../web");
const webModules = new Map();
function loadWeb(relative) {
  const file = path.resolve(webRoot, relative + ".ts");
  if (webModules.has(file)) return webModules.get(file);
  const result = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module: result,
    exports: result.exports,
    require: (request) =>
      loadWeb(
        request.startsWith("@/")
          ? request.slice(2)
          : path.relative(webRoot, path.resolve(path.dirname(file), request)),
      ),
  });
  webModules.set(file, result.exports);
  return result.exports;
}

async function main() {
  const connection = new URL(process.env.DATABASE_URL);
  assert.ok(
    [
      "ep-broad-credit-b66osj7i.c-2.sa-east-1.aws.neon.tech",
      "ep-broad-credit-b66osj7i-pooler.c-2.sa-east-1.aws.neon.tech",
    ].includes(connection.hostname) && connection.pathname === "/neondb",
    "Esta prueba solo puede ejecutarse en la base de restauracion de pruebas.",
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  let count = 0;
  const check = (name) => {
    count++;
    console.log("OK: " + name);
  };
  try {
    await client.query("BEGIN");
    const db = {
      query: (sql, params) => client.query(sql, params),
      transaction: async (run) => {
        await client.query("SAVEPOINT maintenance_type_test");
        try {
          const result = await run(client);
          await client.query("RELEASE SAVEPOINT maintenance_type_test");
          return result;
        } catch (error) {
          await client.query("ROLLBACK TO SAVEPOINT maintenance_type_test");
          await client.query("RELEASE SAVEPOINT maintenance_type_test");
          throw error;
        }
      },
    };
    const marker = crypto.randomUUID();
    const workshop = (
      await client.query(
        "INSERT INTO workshops(name) VALUES($1) RETURNING id",
        ["QA fase 2 " + marker],
      )
    ).rows[0].id;
    const user = (
      await client.query(
        "INSERT INTO users(workshop_id,first_name,last_name,email,password_hash,role) VALUES($1,'QA','Admin',$2,'unused','ADMIN') RETURNING id",
        [workshop, marker + "@example.invalid"],
      )
    ).rows[0].id;
    const customer = (
      await client.query(
        "INSERT INTO customers(workshop_id,first_name,last_name) VALUES($1,'QA','Prueba') RETURNING id",
        [workshop],
      )
    ).rows[0].id;
    const vehicle = (
      await client.query(
        "INSERT INTO vehicles(workshop_id,customer_id,license_plate,brand,model,year,mileage) VALUES($1,$2,$3,'QA','QA',2020,1000) RETURNING id",
        [workshop, customer, "QA" + marker.slice(0, 8)],
      )
    ).rows[0].id;
    const admin = { id: user, workshopId: workshop, role: "ADMIN" };
    const service = new MaintenanceService(db);
    const portal = new PortalService(db);
    const base = {
      vehicleId: vehicle,
      orderId: "",
      mechanicId: user,
      type: "Servicio premium del motor",
      oilProductName: "Producto QA",
      maintenanceTypeCode: "OIL_CHANGE",
      interventionType: "MAINTENANCE",
      interventionReason: "SCHEDULED",
      workDetails: [],
      mileage: 2000,
      date: "2026-10-16",
      nextMileage: 12000,
      nextDate: "2027-04-16",
      oilType: "Sintético",
      viscosity: "5W-30",
      brand: "QA",
      quantity: 5,
      filter: "Filtro QA",
      filterBrand: "QA",
      notes: "",
    };
    const saved = await service.create(admin, base);
    const stored = (
      await client.query(
        "SELECT m.maintenance_type,m.maintenance_type_code,o.liters_used FROM maintenance_records m JOIN oil_change_details o ON o.maintenance_id=m.id AND o.workshop_id=m.workshop_id WHERE m.id=$1",
        [saved.id],
      )
    ).rows[0];
    assert.equal(stored.maintenance_type, base.type);
    assert.equal(stored.maintenance_type_code, "OIL_CHANGE");
    assert.equal(Number(stored.liters_used), 5);
    assert.equal(
      (
        await client.query(
          "SELECT product_name FROM oil_change_details WHERE maintenance_id=$1",
          [saved.id],
        )
      ).rows[0].product_name,
      "Producto QA",
    );
    check("Titulo libre con OIL_CHANGE conserva nombre y ficha de aceite");

    await assert.rejects(
      () => service.create(admin, { ...base, nextMileage: 0, nextDate: "" }),
      (e) => e.getStatus() === 400,
    );
    await assert.rejects(
      () => service.create(admin, { ...base, maintenanceTypeCode: "UNKNOWN" }),
      (e) => e.getStatus() === 400,
    );
    await assert.rejects(
      () => service.create(admin, { ...base, maintenanceTypeCode: null }),
      (e) => e.getStatus() === 400,
    );
    check("Aceite exige intervalo y la API rechaza codigos invalidos");

    const other = await service.create(admin, {
      ...base,
      type: "Cambio de aceite",
      maintenanceTypeCode: "OTHER",
      nextMileage: 0,
      nextDate: "",
    });
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM oil_change_details WHERE maintenance_id=$1",
          [other.id],
        )
      ).rows[0].count,
      0,
    );
    const transmission = await service.create(admin, {
      ...base,
      type: "Cambio de aceite de caja",
      maintenanceTypeCode: undefined,
      nextMileage: 0,
      nextDate: "",
    });
    assert.equal(
      (
        await client.query(
          "SELECT maintenance_type_code FROM maintenance_records WHERE id=$1",
          [transmission.id],
        )
      ).rows[0].maintenance_type_code,
      "OTHER",
    );
    const legacy = await service.create(admin, {
      ...base,
      type: "Cambio de aceite y filtro",
      maintenanceTypeCode: undefined,
    });
    assert.equal(
      (
        await client.query(
          "SELECT maintenance_type_code FROM maintenance_records WHERE id=$1",
          [legacy.id],
        )
      ).rows[0].maintenance_type_code,
      "OIL_CHANGE",
    );
    check(
      "Codigo explicito prevalece; clientes antiguos compatibles sin confundir aceite de caja",
    );

    const listing = await service.findAll(admin);
    assert.equal(
      listing.find((r) => r.id === saved.id).maintenanceTypeCode,
      "OIL_CHANGE",
    );
    const token = (await portal.ensure(workshop, customer)).token;
    const cards = await portal.vehicles(token);
    assert.equal(
      cards.vehicles[0].maintenance.find((r) => r.id === saved.id)
        .maintenanceTypeCode,
      "OIL_CHANGE",
    );
    const detail = await portal.vehicle(token, vehicle);
    assert.equal(
      detail.maintenance.find((r) => r.id === saved.id).maintenanceTypeCode,
      "OIL_CHANGE",
    );
    assert.equal(
      detail.maintenance.find((r) => r.id === saved.id).type,
      base.type,
    );
    assert.equal(
      (await service.findAll({ ...admin, workshopId: crypto.randomUUID() }))
        .length,
      0,
    );
    check(
      "Listado y portal QR reciben codigo y mantienen aislamiento de taller",
    );

    // Exercise the real migration with legacy rows inside the rolled-back transaction.
    await client.query(
      "ALTER TABLE maintenance_records ALTER COLUMN maintenance_type_code DROP NOT NULL",
    );
    await client.query(
      "UPDATE maintenance_records SET maintenance_type_code=NULL WHERE workshop_id=$1",
      [workshop],
    );
    const before = (
      await client.query(
        "SELECT id,maintenance_type FROM maintenance_records WHERE workshop_id=$1 ORDER BY id",
        [workshop],
      )
    ).rows;
    const migration = fs
      .readFileSync(
        path.join(
          __dirname,
          "../../../database/migrations/20261016_maintenance_type_code.sql",
        ),
        "utf8",
      )
      .replace(/^BEGIN;\s*/, "")
      .replace(/COMMIT;\s*$/, "");
    await client.query(migration);
    const first = (
      await client.query(
        "SELECT id,maintenance_type,maintenance_type_code FROM maintenance_records WHERE workshop_id=$1 ORDER BY id",
        [workshop],
      )
    ).rows;
    assert.equal(
      first.find((r) => r.id === saved.id).maintenance_type_code,
      "OIL_CHANGE",
    );
    assert.equal(
      first.find((r) => r.id === transmission.id).maintenance_type_code,
      "OTHER",
    );
    assert.deepEqual(
      first.map(({ id, maintenance_type }) => ({ id, maintenance_type })),
      before,
    );
    await client.query(migration);
    assert.deepEqual(
      (
        await client.query(
          "SELECT id,maintenance_type,maintenance_type_code FROM maintenance_records WHERE workshop_id=$1 ORDER BY id",
          [workshop],
        )
      ).rows,
      first,
    );
    assert.throws(
      () => readMaintenanceTypeCode("NO_CODE", "Servicio"),
      (e) => e.getStatus() === 400,
    );
    check("Migracion clasifica por ficha, conserva nombres y puede repetirse");

    const orders = new WorkOrdersService(db);
    const { maintenanceOrderContext } = loadWeb(
      "features/mantenciones/services/maintenanceContext",
    );
    // Clone JSON requests because service validation normalizes its input object.
    const request = (body) => JSON.parse(JSON.stringify(body));
    const orderBody = {
      customerId: customer,
      vehicleId: vehicle,
      mechanicId: user,
      assignmentType: "INDIVIDUAL",
      date: "2026-10-20",
      time: "10:00",
      mileage: 2000,
      reason: "Servicio QA",
      symptoms: "",
      diagnosis: "",
      findings: "",
      observations: "",
      status: "RECEIVED",
      codes: [],
      parts: [],
      photos: [],
      services: [
        {
          id: crypto.randomUUID(),
          name: "Servicio premium del motor",
          description: "QA",
          maintenanceTypeCode: "OIL_CHANGE",
          mechanicId: user,
          price: 15000,
          status: "Pendiente",
          interventionType: "MAINTENANCE",
          interventionReason: "SCHEDULED",
          workDetails: ["Revisión QA"],
        },
      ],
    };
    const createdOrder = await orders.save(admin, request(orderBody));
    const reload = async (id) =>
      (await orders.findAll(admin)).find((o) => o.id === id);
    let reloaded = await reload(createdOrder.id);
    assert.equal(reloaded.services[0].maintenanceTypeCode, "OIL_CHANGE");
    assert.equal(reloaded.services[0].name, orderBody.services[0].name);
    const orderContext = maintenanceOrderContext(reloaded);
    assert.equal(orderContext.maintenanceTypeCode, "OIL_CHANGE");
    const linkedMaintenance = await service.create(admin, {
      ...base,
      ...orderContext,
      date: "2026-10-20",
    });
    const linkedRow = (
      await client.query(
        "SELECT m.work_order_id,m.maintenance_type,m.maintenance_type_code,o.maintenance_id AS oil_id FROM maintenance_records m LEFT JOIN oil_change_details o ON o.maintenance_id=m.id AND o.workshop_id=m.workshop_id WHERE m.id=$1 AND m.workshop_id=$2",
        [linkedMaintenance.id, workshop],
      )
    ).rows[0];
    assert.equal(linkedRow.work_order_id, createdOrder.id);
    assert.equal(linkedRow.maintenance_type_code, "OIL_CHANGE");
    assert.equal(linkedRow.maintenance_type, orderBody.services[0].name);
    assert.equal(linkedRow.oil_id, linkedMaintenance.id);
    check(
      "Orden POST -> recarga real -> contexto frontend -> mantencion y ficha de aceite conservan OIL_CHANGE",
    );

    const oldClientService = {
      ...orderBody.services[0],
      name: "Nombre editado por cliente antiguo",
    };
    delete oldClientService.maintenanceTypeCode;
    await orders.save(
      admin,
      request({ ...orderBody, services: [oldClientService] }),
      createdOrder.id,
    );
    reloaded = await reload(createdOrder.id);
    assert.equal(reloaded.services[0].maintenanceTypeCode, "OIL_CHANGE");
    assert.equal(reloaded.services[0].name, oldClientService.name);
    check(
      "PATCH sin campo mantiene el codigo existente del mismo service.id aunque cambie el label",
    );

    await orders.save(
      admin,
      request({
        ...orderBody,
        services: [
          {
            ...orderBody.services[0],
            name: "Cambio de aceite",
            maintenanceTypeCode: "OTHER",
          },
        ],
      }),
      createdOrder.id,
    );
    reloaded = await reload(createdOrder.id);
    assert.equal(reloaded.services[0].maintenanceTypeCode, "OTHER");
    const otherContext = maintenanceOrderContext(reloaded);
    assert.equal(otherContext.maintenanceTypeCode, "OTHER");
    const linkedOther = await service.create(admin, {
      ...base,
      ...otherContext,
      date: "2026-10-20",
      nextDate: "",
      nextMileage: 0,
    });
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM oil_change_details WHERE maintenance_id=$1 AND workshop_id=$2",
          [linkedOther.id, workshop],
        )
      ).rows[0].count,
      0,
    );
    check(
      "PATCH explicito cambia el codigo; OTHER no activa aceite por el nombre",
    );

    const newUnclassified = {
      ...oldClientService,
      id: crypto.randomUUID(),
      name: "Cambio de aceite",
    };
    await orders.save(
      admin,
      request({ ...orderBody, services: [oldClientService, newUnclassified] }),
      createdOrder.id,
    );
    reloaded = await reload(createdOrder.id);
    assert.equal(
      reloaded.services.find((s) => s.id === oldClientService.id)
        .maintenanceTypeCode,
      "OTHER",
    );
    assert.equal(
      reloaded.services.find((s) => s.id === newUnclassified.id)
        .maintenanceTypeCode,
      undefined,
    );
    assert.equal(
      (
        await client.query(
          "SELECT maintenance_type_code FROM work_order_services WHERE id=$1 AND workshop_id=$2",
          [newUnclassified.id, workshop],
        )
      ).rows[0].maintenance_type_code,
      null,
    );
    check(
      "Servicios distintos conservan su identidad: el nuevo sin codigo queda NULL y no hereda el del anterior",
    );

    const legacyBody = {
      ...orderBody,
      services: [{ ...newUnclassified, id: crypto.randomUUID() }],
    };
    const legacyRequest = request(legacyBody);
    const legacyOrder = await orders.save(admin, legacyRequest);
    assert.equal(
      Object.hasOwn(legacyRequest.services[0], "maintenanceTypeCode"),
      false,
    );
    await orders.save(admin, request(legacyBody), legacyOrder.id);
    const legacyReloaded = await reload(legacyOrder.id);
    assert.equal(legacyReloaded.services[0].maintenanceTypeCode, undefined);
    const legacyContext = maintenanceOrderContext(legacyReloaded);
    assert.equal(legacyContext.maintenanceTypeCode, "OIL_CHANGE");
    const legacyLinked = await service.create(admin, {
      ...base,
      ...legacyContext,
      date: "2026-10-20",
    });
    assert.equal(
      (await service.findAll(admin)).find((m) => m.id === legacyLinked.id)
        .maintenanceTypeCode,
      "OIL_CHANGE",
    );
    check(
      "POST y PATCH antiguos sin codigo siguen guardando NULL; Mantenciones conserva el fallback historico",
    );

    const beforeInvalid = await reload(createdOrder.id);
    for (const invalid of [null, "", "UNKNOWN", 42]) {
      await assert.rejects(
        () =>
          orders.save(
            admin,
            request({
              ...orderBody,
              services: [
                { ...orderBody.services[0], maintenanceTypeCode: invalid },
              ],
            }),
            createdOrder.id,
          ),
        (e) => e.getStatus() === 400,
      );
    }
    assert.deepEqual(
      (await reload(createdOrder.id)).services,
      beforeInvalid.services,
    );
    await client.query("SAVEPOINT invalid_service_code");
    await assert.rejects(
      () =>
        client.query(
          "UPDATE work_order_services SET maintenance_type_code='INVALID' WHERE id=$1 AND workshop_id=$2",
          [oldClientService.id, workshop],
        ),
      (e) => e.code === "23514",
    );
    await client.query("ROLLBACK TO SAVEPOINT invalid_service_code");
    await client.query("RELEASE SAVEPOINT invalid_service_code");
    check(
      "Codigos invalidos se rechazan en API y CHECK; no se guardan cambios parciales",
    );

    await assert.rejects(
      () =>
        orders.save(
          { ...admin, workshopId: crypto.randomUUID() },
          request(orderBody),
          createdOrder.id,
        ),
      (e) => e.getStatus() === 404,
    );
    const workerId = (
      await client.query(
        "INSERT INTO users(workshop_id,first_name,last_name,email,password_hash,role) VALUES($1,'QA','Worker',$2,'unused','MECHANIC') RETURNING id",
        [workshop, crypto.randomUUID() + "@example.invalid"],
      )
    ).rows[0].id;
    const worker = { id: workerId, workshopId: workshop, role: "WORKER" };
    await assert.rejects(
      () => orders.save(worker, request(orderBody), createdOrder.id),
      (e) => e.getStatus() === 404,
    );
    const workerBody = {
      ...orderBody,
      mechanicId: workerId,
      services: [{ ...orderBody.services[0], mechanicId: workerId }],
    };
    await orders.save(admin, request(workerBody), createdOrder.id);
    const workerService = { ...workerBody.services[0], price: 1 };
    delete workerService.maintenanceTypeCode;
    await orders.save(
      worker,
      request({ ...workerBody, services: [workerService] }),
      createdOrder.id,
    );
    reloaded = await reload(createdOrder.id);
    assert.equal(reloaded.services[0].maintenanceTypeCode, "OIL_CHANGE");
    assert.equal(reloaded.services[0].price, 15000);
    assert.equal(
      (await orders.findAll(worker)).find((o) => o.id === createdOrder.id)
        .services[0].price,
      0,
    );
    check(
      "Aislamiento de taller, permisos de mecanico y proteccion de precios siguen vigentes al preservar codigos",
    );

    const teamBody = {
      ...workerBody,
      assignmentType: "TEAM",
      mechanicId: "",
      services: [{ ...workerBody.services[0], id: crypto.randomUUID() }],
    };
    const teamOrder = await orders.save(admin, request(teamBody));
    await assert.rejects(
      () =>
        orders.save(
          admin,
          request({
            ...teamBody,
            expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
            services: [
              { ...teamBody.services[0], maintenanceTypeCode: "COOLANT" },
            ],
          }),
          teamOrder.id,
        ),
      (e) => e.getStatus() === 409,
    );
    assert.equal(
      (await reload(teamOrder.id)).services[0].maintenanceTypeCode,
      "OIL_CHANGE",
    );
    check(
      "Edicion concurrente desactualizada no sobrescribe el codigo de una orden compartida",
    );

    console.log(
      count + " grupos de pruebas aprobados; los datos QA se revierten.",
    );
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    "Prueba fallida:",
    error.code ?? error.message,
    error.table ?? "",
    error.column ?? "",
  );
  process.exitCode = 1;
});
