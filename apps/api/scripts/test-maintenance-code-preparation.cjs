const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const apiRoot = path.resolve(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  const target = path.join(apiRoot, file);
  if (fs.existsSync(target)) process.loadEnvFile(target);
}
const endpoint = new URL(process.env.DATABASE_URL);
assert.ok(
  [
    "ep-broad-credit-b66osj7i.c-2.sa-east-1.aws.neon.tech",
    "ep-broad-credit-b66osj7i-pooler.c-2.sa-east-1.aws.neon.tech",
  ].includes(endpoint.hostname) && endpoint.pathname === "/neondb",
  "Solo base de restauración de pruebas",
);

const migrationPath = path.resolve(
  apiRoot,
  "../../database/migrations/20261021_prepare_maintenance_type_code.sql",
);
const originalSql = fs.readFileSync(migrationPath, "utf8");
assert.ok(
  !/\b(?:UPDATE|INSERT|DELETE|TRUNCATE)\b/i.test(originalSql),
  "La migración no debe modificar registros",
);
assert.ok(!/\bSET\s+(?:DEFAULT|NOT\s+NULL)\b/i.test(originalSql));
const schema =
  "qa_maintenance_preparation_" + crypto.randomBytes(8).toString("hex");
assert.match(schema, /^qa_maintenance_preparation_[a-f0-9]{16}$/);
const relation = schema + ".maintenance_records";
// Only qualify the table differently: execute every original SQL statement unchanged.
const sql = originalSql.replaceAll("public.maintenance_records", relation);
const phases = sql.split("COMMIT;").filter((part) => part.trim());
assert.equal(phases.length, 2);
assert.ok(
  phases.every((phase) => phase.includes("SET LOCAL lock_timeout = '5s';")),
);
const codes = [
  "OIL_CHANGE",
  "COOLANT",
  "BRAKE_FLUID",
  "SPARK_PLUGS",
  "TIMING",
  "FILTERS",
  "OTHER",
];

async function fingerprint(client, table, withoutCode = false) {
  return (
    await client.query(`SELECT count(*)::int AS count,
    md5(COALESCE(jsonb_agg(${withoutCode ? "to_jsonb(t)-'maintenance_type_code'" : "to_jsonb(t)"} ORDER BY id)::text,'[]')) AS digest
    FROM ${table} t`)
  ).rows[0];
}
async function column(client) {
  return (
    await client.query(
      `SELECT data_type,character_maximum_length,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema=$1 AND table_name='maintenance_records' AND column_name='maintenance_type_code'`,
      [schema],
    )
  ).rows[0];
}
async function constraint(client) {
  return (
    await client.query(
      `SELECT convalidated,pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid=$1::regclass AND conname='maintenance_records_type_code_check'`,
      [relation],
    )
  ).rows[0];
}
async function runPhase(client, phase) {
  await client.query(phase);
  assert.equal(
    (await client.query("SELECT current_setting('lock_timeout') AS value"))
      .rows[0].value,
    "5s",
  );
  await client.query("COMMIT");
}
async function locks(client) {
  return (
    await client.query(
      `SELECT count(*)::int AS count FROM pg_locks
    WHERE pid=pg_backend_pid() AND relation=$1::regclass AND mode='AccessExclusiveLock'`,
      [relation],
    )
  ).rows[0].count;
}

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  let created = false;
  try {
    const publicBefore = await fingerprint(
      client,
      "public.maintenance_records",
    );
    const ordersBefore = await fingerprint(
      client,
      "public.work_order_services",
    );
    await client.query(`CREATE SCHEMA ${schema}`);
    created = true;
    await client.query(
      `CREATE TABLE ${relation} (LIKE public.maintenance_records INCLUDING ALL)`,
    );
    await client.query(
      `INSERT INTO ${relation} SELECT * FROM public.maintenance_records`,
    );
    await client.query(
      `ALTER TABLE ${relation} DROP COLUMN maintenance_type_code`,
    );
    assert.equal(await column(client), undefined);
    const baseline = await fingerprint(client, relation);
    assert.ok(
      baseline.count > 0,
      "La prueba requiere registros existentes en la copia",
    );

    await runPhase(client, phases[0]);
    assert.equal((await constraint(client)).convalidated, false);
    assert.equal(
      await locks(client),
      0,
      "Bloqueo fuerte liberado antes de VALIDATE",
    );
    assert.deepEqual(await column(client), {
      data_type: "character varying",
      character_maximum_length: 20,
      is_nullable: "YES",
      column_default: null,
    });
    assert.equal(
      (
        await client.query(
          `SELECT count(*)::int AS count FROM ${relation} WHERE maintenance_type_code IS NOT NULL`,
        )
      ).rows[0].count,
      0,
    );
    await runPhase(client, phases[1]);
    assert.equal((await constraint(client)).convalidated, true);
    assert.deepEqual(await fingerprint(client, relation, true), baseline);
    console.log(
      "OK: tabla sin columna -> VARCHAR(20) NULL, sin default; históricos sin cambios; dos transacciones con lock_timeout=5s.",
    );

    const afterFirst = await fingerprint(client, relation);
    const firstConstraint = await constraint(client);
    const firstColumn = await column(client);
    for (let repeat = 0; repeat < 2; repeat++) {
      await runPhase(client, phases[0]);
      assert.equal(await locks(client), 0);
      await runPhase(client, phases[1]);
      assert.deepEqual(await fingerprint(client, relation), afterFirst);
      assert.deepEqual(await column(client), firstColumn);
      assert.deepEqual(await constraint(client), firstConstraint);
    }
    console.log(
      "OK: dos repeticiones adicionales conservan exactamente datos y esquema.",
    );

    await client.query("BEGIN");
    for (const code of [...codes, null]) {
      await client.query(`UPDATE ${relation} SET maintenance_type_code=$1`, [
        code,
      ]);
    }
    for (const invalid of [
      "INVALID",
      "AIR_FILTER",
      "CABIN_FILTER",
      "FUEL_FILTER",
    ]) {
      await client.query("SAVEPOINT invalid_code");
      await assert.rejects(
        () =>
          client.query(`UPDATE ${relation} SET maintenance_type_code=$1`, [
            invalid,
          ]),
        (error) => error.code === "23514",
      );
      await client.query("ROLLBACK TO SAVEPOINT invalid_code");
      await client.query("RELEASE SAVEPOINT invalid_code");
    }
    await client.query("ROLLBACK");
    assert.deepEqual(await fingerprint(client, relation), afterFirst);
    console.log(
      "OK: admite siete códigos iniciales y NULL; rechaza códigos inválidos y los tres filtros hasta su ampliación posterior.",
    );

    await client.query(`ALTER TABLE ${relation} DROP CONSTRAINT maintenance_records_type_code_check,
      ADD CONSTRAINT maintenance_records_type_code_check CHECK(maintenance_type_code IS NULL OR maintenance_type_code IN
      ('OIL_CHANGE','COOLANT','BRAKE_FLUID','SPARK_PLUGS','TIMING','FILTERS','OTHER','AIR_FILTER','CABIN_FILTER','FUEL_FILTER')) NOT VALID`);
    await client.query(
      `ALTER TABLE ${relation} VALIDATE CONSTRAINT maintenance_records_type_code_check`,
    );
    const expanded = await constraint(client);
    await runPhase(client, phases[0]);
    await runPhase(client, phases[1]);
    assert.deepEqual(
      await constraint(client),
      expanded,
      "Repetir la preparación no reduce una restricción ya ampliada",
    );
    assert.deepEqual(await fingerprint(client, relation), afterFirst);
    console.log("OK: no sobrescribe un CHECK ya ampliado a diez códigos.");

    assert.deepEqual(
      await fingerprint(client, "public.maintenance_records"),
      publicBefore,
    );
    assert.deepEqual(
      await fingerprint(client, "public.work_order_services"),
      ordersBefore,
    );
    console.log(
      "OK: tablas public de pruebas intactas; ensayo realizado en esquema aislado de la restauración.",
    );
  } finally {
    await client.query("ROLLBACK");
    if (created) await client.query(`DROP SCHEMA ${schema} CASCADE`);
    await client.end();
    console.log(
      "Limpieza del esquema QA completada. No se accedió a producción.",
    );
  }
})().catch((error) => {
  console.error("Prueba fallida:", error.code || error.message);
  process.exitCode = 1;
});
