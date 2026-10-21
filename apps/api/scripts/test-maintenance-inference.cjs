const test = require("node:test");
const assert = require("node:assert/strict");
const {
  inferMaintenanceType,
  readMaintenanceTypeCode,
} = require("../dist/common/maintenance-type.js");
const codes = [
  "OIL_CHANGE",
  "COOLANT",
  "BRAKE_FLUID",
  "SPARK_PLUGS",
  "TIMING",
  "AIR_FILTER",
  "CABIN_FILTER",
  "FUEL_FILTER",
  "FILTERS",
  "OTHER",
];

for (const [name, expected] of [
  ["Cambio de aceite", "OIL_CHANGE"],
  ["  CAMBIO  DE LÍQUIDO DE FRENOS  ", "BRAKE_FLUID"],
  ["Filtro de cabina", "CABIN_FILTER"],
  ["Servicio personalizado", "OTHER"],
  ["constructor", "OTHER"],
  ["__proto__", "OTHER"],
  ["toString", "OTHER"],
]) {
  test("Inferencia propia y código válido: " + name, () => {
    assert.equal(inferMaintenanceType(name), expected);
    assert.equal(readMaintenanceTypeCode(undefined, name), expected);
    assert.ok(codes.includes(inferMaintenanceType(name)));
  });
}

test("Los diez códigos explícitos válidos prevalecen sobre cualquier label", () => {
  for (const code of codes) {
    assert.equal(readMaintenanceTypeCode(code, "Cambio de aceite"), code);
    assert.equal(readMaintenanceTypeCode(code, "constructor"), code);
  }
});

test("Código explícito null, vacío, desconocido o de otro tipo mantiene HTTP 400", () => {
  for (const value of [
    null,
    "",
    "UNKNOWN",
    "oil_change",
    "constructor",
    "__proto__",
    "toString",
    0,
    42,
    false,
    {},
    [],
    new String("OIL_CHANGE"),
  ]) {
    assert.throws(
      () => readMaintenanceTypeCode(value, "Cambio de aceite"),
      (error) => error.getStatus() === 400,
    );
  }
});

test("Omisión compatible con clientes antiguos y fallback seguro", () => {
  assert.equal(
    readMaintenanceTypeCode(undefined, "Cambio de aceite y filtro"),
    "OIL_CHANGE",
  );
  assert.equal(
    readMaintenanceTypeCode(undefined, "Cambio de aceite de caja"),
    "OTHER",
  );
  assert.equal(
    readMaintenanceTypeCode(undefined, "Filtro combustible"),
    "FUEL_FILTER",
  );
});

test("No utiliza equivalencias introducidas en Object.prototype", () => {
  const inheritedName = "qa inherited maintenance alias";
  Object.defineProperty(Object.prototype, inheritedName, {
    value: "OIL_CHANGE",
    configurable: true,
  });
  try {
    assert.equal(inferMaintenanceType(inheritedName), "OTHER");
    assert.equal(readMaintenanceTypeCode(undefined, inheritedName), "OTHER");
    assert.equal(inferMaintenanceType("Cambio de aceite"), "OIL_CHANGE");
  } finally {
    delete Object.prototype[inheritedName];
  }
});
