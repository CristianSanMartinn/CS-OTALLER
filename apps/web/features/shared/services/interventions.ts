import type { Intervention, InterventionType } from "../types/domain";
export const interventionLabels = {
  MAINTENANCE: "Mantenimiento",
  REPAIR: "Reparación",
};
export const interventionReasons = {
  SCHEDULED: "Servicio programado",
  WEAR: "Desgaste",
  FAULT: "Falla detectada",
  OTHER: "Otro motivo",
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const catalog = [
  {
    name: "Cambio de embrague",
    terms: "embrague clutch",
    details: [
      "Reemplazo de kit completo",
      "Reemplazo de componentes individuales",
      "Rectificación de volante de inercia",
      "Cambio de volante de inercia",
      "Cambio de aceite de caja",
    ],
  },
  {
    name: "Cambio de pastillas de freno",
    terms: "frenos balatas pastillas",
    details: [
      "Pastillas delanteras",
      "Pastillas traseras",
      "Limpieza y revisión de frenos",
      "Cambio de líquido de frenos",
    ],
  },
  {
    name: "Cambio de discos de freno",
    terms: "frenos disco",
    details: ["Discos delanteros", "Discos traseros", "Revisión de pastillas"],
  },
  {
    name: "Cambio de neumáticos",
    terms: "neumaticos ruedas llantas",
    details: [
      "Neumáticos delanteros",
      "Neumáticos traseros",
      "Balanceo",
      "Alineación",
    ],
  },
  {
    name: "Cambio de homocinética",
    terms: "homocinetica semieje fuelle",
    details: [
      "Lado izquierdo",
      "Lado derecho",
      "Cambio de fuelle",
      "Revisión de semieje",
    ],
  },
  {
    name: "Cambio de bujías",
    terms: "bujia encendido",
    details: ["Reemplazo de bujías", "Revisión del sistema de encendido"],
  },
  {
    name: "Cambio de bobina",
    terms: "bobina encendido",
    details: ["Reemplazo de bobina", "Diagnóstico del sistema de encendido"],
  },
  {
    name: "Cambio de sensor MAP",
    terms: "sensor map admision",
    details: [
      "Diagnóstico electrónico",
      "Reemplazo del sensor MAP",
      "Verificación posterior",
    ],
  },
  {
    name: "Cambio de sensor",
    terms: "sensores maf oxigeno temperatura lambda",
    details: [
      "Diagnóstico electrónico",
      "Reemplazo del sensor",
      "Verificación posterior",
    ],
  },
  {
    name: "Revisión de admisión y escape",
    terms: "admision escape",
    details: [
      "Limpieza de admisión",
      "Revisión de fugas",
      "Revisión del sistema de escape",
    ],
  },
  {
    name: "Cambio de batería",
    terms: "bateria acumulador",
    details: [
      "Reemplazo de batería",
      "Prueba del sistema de carga",
      "Limpieza de terminales",
    ],
  },
  {
    name: "Cambio de aceite",
    terms: "aceite motor filtro lubricante",
    details: [
      "Cambio de aceite de motor",
      "Reemplazo de filtro de aceite",
      "Revisión de niveles",
      "Revisión de fugas",
    ],
  },
  {
    name: "Cambio de aceite de caja",
    terms: "aceite caja transmision",
    details: ["Cambio de aceite de caja", "Revisión de fugas de transmisión"],
  },
  {
    name: "Cambio de empaquetadura de culata",
    terms: "culata empaquetadura junta rectificadora motor",
    details: [
      "Desmontaje de culata",
      "Envío a rectificadora",
      "Reemplazo de empaquetadura",
      "Montaje y verificación",
    ],
    repair: true,
  },
  {
    name: "Reparación de motor",
    terms: "motor anillos piston pistones desarmar",
    details: [
      "Desmontaje del motor",
      "Cambio de anillos",
      "Cambio de pistones",
      "Trabajos de rectificadora",
      "Montaje y pruebas",
    ],
    repair: true,
  },
  {
    name: "Cambio de distribución",
    terms: "distribucion correa cadena",
    details: [
      "Reemplazo de kit de distribución",
      "Revisión de tensores",
      "Revisión de bomba de agua",
    ],
  },
];
export interface WorkSuggestion {
  name: string;
  interventionType: InterventionType;
  interventionReason: "SCHEDULED" | "FAULT";
  label: string;
}
export function workSuggestions(query: string): WorkSuggestion[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return catalog
    .filter((item) =>
      tokens.every((token) =>
        normalize(item.name + " " + item.terms).includes(token),
      ),
    )
    .flatMap((item) =>
      (item.repair ? ["REPAIR"] : ["MAINTENANCE", "REPAIR"]).map((kind) => ({
        name: item.name,
        interventionType: kind as InterventionType,
        interventionReason:
          kind === "REPAIR" ? ("FAULT" as const) : ("SCHEDULED" as const),
        label:
          item.name + (kind === "REPAIR" ? " por falla" : " por mantenimiento"),
      })),
    )
    .slice(0, 8);
}
export function workOptions(name: string): string[] {
  const value = normalize(name);
  return (
    catalog.find((item) => value === normalize(item.name))?.details ??
    catalog.find((item) =>
      normalize(item.terms)
        .split(" ")
        .some((term) => value.includes(term)),
    )?.details ??
    []
  );
}
export function interventionLabel(value: Intervention) {
  return value.interventionType
    ? interventionLabels[value.interventionType] +
        (value.interventionReason
          ? " · " + interventionReasons[value.interventionReason]
          : "")
    : "Sin clasificación registrada";
}
export function interventionSummary(name: string, value: Intervention) {
  return [
    name,
    value.interventionType ? interventionLabel(value) : "",
    ...(value.workDetails ?? []),
  ]
    .filter(Boolean)
    .join(" · ");
}
export const isEngineOil = (name: string) =>
  ["cambio de aceite", "cambio de aceite de motor"].includes(normalize(name));
