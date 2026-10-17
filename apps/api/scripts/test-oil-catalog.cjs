const assert = require("node:assert/strict");
const {
  engineOils,
  validateOil,
} = require("../dist/maintenance/engine-oils.js");
const first = engineOils[0];
const input = {
  ...first,
  quantity: 5,
  filter: "Referencia QA",
  filterBrand: "Marca QA",
};
assert.equal(validateOil(input).product, first.product);
assert.equal(
  validateOil({ ...input, brand: "liquy moly", viscosity: "5w30" }).brand,
  "LIQUI MOLY",
);
for (const patch of [
  { viscosity: "10W-40" },
  { oilType: "Mineral" },
  { brand: "Mobil" },
  { quantity: 0 },
  { viscosity: "cualquier cosa" },
  { filter: "" },
  { filterBrand: "" },
  { brand: "" },
])
  assert.throws(
    () => validateOil({ ...input, ...patch }),
    (error) => error.getStatus() === 400,
  );
assert.equal(
  validateOil({ ...input, brand: "Marca local", product: "Producto manual" })
    .product,
  "Producto manual",
);
assert.equal(new Set(engineOils.map((o) => o.id)).size, engineOils.length);
for (const product of engineOils)
  assert.equal(validateOil({ ...input, ...product }).product, product.product);
console.log(
  "Catálogo: variantes, marca, viscosidad, tipo, cantidad y registro manual verificados.",
);
