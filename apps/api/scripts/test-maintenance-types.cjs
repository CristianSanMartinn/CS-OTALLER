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
