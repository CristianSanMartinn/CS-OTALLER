import type { Maintenance } from "@/features/shared/types/domain";
import type { OilProduct } from "../types/oil.types";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/liquy/g, "liqui")
    .replace(/molly/g, "moly")
    .replace(/[^a-z0-9]/g, "");

export function oilSuggestions(
  products: OilProduct[],
  query: string,
  records: Maintenance[],
) {
  const tokens = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return products
    .filter((product) =>
      tokens.every((token) =>
        normalize(
          product.brand + product.product + product.viscosity + product.oilType,
        ).includes(token),
      ),
    )
    .map((product) => ({
      ...product,
      uses: records.filter(
        (record) =>
          normalize(record.brand) === normalize(product.brand) &&
          normalize(record.oilProductName ?? "") ===
            normalize(product.product) &&
          normalize(record.viscosity) === normalize(product.viscosity),
      ).length,
    }))
    .sort(
      (a, b) =>
        b.uses - a.uses ||
        a.brand.localeCompare(b.brand) ||
        a.product.localeCompare(b.product),
    );
}

export function oilSelection(product: OilProduct): Partial<Maintenance> {
  return {
    brand: product.brand,
    oilProductName: product.product,
    viscosity: product.viscosity,
    oilType: product.oilType,
  };
}

export function validateOilSelection(
  value: Maintenance,
  products: OilProduct[],
) {
  if (
    !value.brand.trim() ||
    !value.oilProductName?.trim() ||
    !value.filter.trim() ||
    !value.filterBrand.trim()
  )
    return "Completa el producto de aceite y los datos del filtro.";
  if (
    !Number.isFinite(value.quantity) ||
    value.quantity <= 0 ||
    value.quantity > 100
  )
    return "Indica una cantidad de aceite mayor que cero y de hasta 100 litros.";
  const viscosity = value.viscosity
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^(\d{1,2})W(\d{1,2})$/, "$1W-$2");
  if (
    !/^(?:(?:0|5|10|15|20|25)W-(?:8|12|16|20|30|40|50|60)|SAE(?:20|30|40|50|60))$/.test(
      viscosity,
    )
  )
    return "Revisa la viscosidad del aceite, por ejemplo 5W-30.";
  if (
    !["Sintético", "Semisintético", "Mineral", "Tecnología sintética"].includes(
      value.oilType,
    )
  )
    return "Selecciona el tipo de aceite.";
  const known = products.filter(
    (product) =>
      normalize(product.product) === normalize(value.oilProductName ?? ""),
  );
  if (
    known.length &&
    !known.some(
      (product) => normalize(product.brand) === normalize(value.brand),
    )
  )
    return "El producto seleccionado pertenece a otra marca.";
  const variants = products.filter(
    (product) =>
      normalize(product.brand) === normalize(value.brand) &&
      normalize(product.product) === normalize(value.oilProductName ?? ""),
  );
  if (
    variants.length &&
    !variants.some(
      (product) =>
        product.viscosity === viscosity && product.oilType === value.oilType,
    )
  )
    return "La viscosidad o el tipo no coincide con el producto del catálogo.";
  return "";
}
