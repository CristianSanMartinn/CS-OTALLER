import { BadRequestException } from "@nestjs/common";

export interface EngineOil {
  id: string;
  brand: string;
  product: string;
  viscosity: string;
  oilType: string;
  source: string;
  checkedAt: string;
}

// Starter catalog, not an exhaustive market list or a vehicle compatibility guide.
// Product variants and sources are kept together so additions can be verified.
export const engineOils: readonly EngineOil[] = [
  {
    id: "lm-molygen-5w30",
    brand: "LIQUI MOLY",
    product: "Molygen New Generation",
    viscosity: "5W-30",
    oilType: "Sintético",
    source:
      "https://www.liqui-moly.com/en/us/molygen-new-generation-sae-5w-30-p001757.html",
    checkedAt: "2026-10-16",
  },
  {
    id: "lm-toptec4200-5w30",
    brand: "LIQUI MOLY",
    product: "Top Tec 4200 New Generation",
    viscosity: "5W-30",
    oilType: "Sintético",
    source:
      "https://www.liqui-moly.com/en/us/top-tec-4200-sae-5w-30-new-generation-p000323.html",
    checkedAt: "2026-10-16",
  },
  {
    id: "lm-specialtecaa-0w20",
    brand: "LIQUI MOLY",
    product: "Special Tec AA",
    viscosity: "0W-20",
    oilType: "Sintético",
    source:
      "https://www.liqui-moly.com/en/us/special-tec-aa-sae-0w-20-p000311.html",
    checkedAt: "2026-10-16",
  },
  {
    id: "lm-leichtlauf-5w40",
    brand: "LIQUI MOLY",
    product: "Leichtlauf High Tech",
    viscosity: "5W-40",
    oilType: "Tecnología sintética",
    source: "https://pim.liqui-moly.de/article/2327?language=en",
    checkedAt: "2026-10-16",
  },
  {
    id: "mobil1-esp-5w30",
    brand: "Mobil",
    product: "Mobil 1 ESP",
    viscosity: "5W-30",
    oilType: "Sintético",
    source:
      "https://www.mobil.eu/en-gb/lubricants/products/products/mobil-1-esp-5w-30",
    checkedAt: "2026-10-16",
  },
  {
    id: "shell-hx7-10w40",
    brand: "Shell",
    product: "Helix HX7 SN",
    viscosity: "10W-40",
    oilType: "Semisintético",
    source:
      "https://www.shell.com/motorist/oils-lubricants/helix-for-cars/helix-semi-synthetic/shell-helix-hx7-sn-10w-40.html",
    checkedAt: "2026-10-16",
  },
  {
    id: "castrol-edge-5w30ll",
    brand: "Castrol",
    product: "EDGE LL",
    viscosity: "5W-30",
    oilType: "Sintético",
    source:
      "https://www.castrol.com/en_au/australia/home/products/our-brands/viscosity-grades/5w-30.html",
    checkedAt: "2026-10-16",
  },
];

export const normalizeOilName = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/liquy/g, "liqui")
    .replace(/molly/g, "moly")
    .replace(/[^a-z0-9]/g, "");

export function validateOil(input: {
  brand: string;
  product: string;
  viscosity: string;
  oilType: string;
  quantity: number;
  filter: string;
  filterBrand: string;
}) {
  const viscosity = input.viscosity
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^(\d{1,2})W(\d{1,2})$/, "$1W-$2");
  if (
    !/^(?:(?:0|5|10|15|20|25)W-(?:8|12|16|20|30|40|50|60)|SAE(?:20|30|40|50|60))$/.test(
      viscosity,
    )
  )
    throw new BadRequestException(
      "Indica una viscosidad SAE válida, por ejemplo 5W-30.",
    );
  if (
    !input.brand ||
    !input.filter ||
    !input.filterBrand ||
    input.quantity <= 0 ||
    !["Sintético", "Semisintético", "Mineral", "Tecnología sintética"].includes(
      input.oilType,
    )
  )
    throw new BadRequestException(
      "Completa marca, tipo, cantidad y filtro del aceite utilizado.",
    );
  const knownProduct = engineOils.filter(
    (oil) => normalizeOilName(oil.product) === normalizeOilName(input.product),
  );
  if (
    knownProduct.length &&
    !knownProduct.some(
      (oil) => normalizeOilName(oil.brand) === normalizeOilName(input.brand),
    )
  )
    throw new BadRequestException(
      "El producto seleccionado pertenece a otra marca.",
    );
  const matchingProduct = engineOils.filter(
    (oil) =>
      normalizeOilName(oil.brand) === normalizeOilName(input.brand) &&
      normalizeOilName(oil.product) === normalizeOilName(input.product),
  );
  const variant = matchingProduct.find(
    (oil) => oil.viscosity === viscosity && oil.oilType === input.oilType,
  );
  if (matchingProduct.length && !variant)
    throw new BadRequestException(
      "El producto seleccionado no coincide con su viscosidad o tipo. Revisa la etiqueta o selecciona otro aceite.",
    );
  return {
    viscosity,
    brand: variant?.brand ?? input.brand,
    product: variant?.product ?? input.product,
  };
}
