import type { WorkHistoryEntry } from "./workHistory";
import { maintenanceTypeCode } from "./maintenanceRules";
import type { MaintenanceTypeCode } from "../types/domain";
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
    .replace(/homicinetica/g, "homocinetica")
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
  interventionReason: "SCHEDULED" | "WEAR" | "FAULT" | "OTHER";
  label: string;
  maintenanceTypeCode?: MaintenanceTypeCode;
  workDetails?: string[];
  uses?: number;
}
export function workSuggestions(
  query: string,
  history: WorkHistoryEntry[] = [],
): WorkSuggestion[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const suggestions = new Map<string, WorkSuggestion>();
  const key = (item: WorkSuggestion) =>
    normalize(item.name) +
    ":" +
    item.interventionType +
    ":" +
    item.interventionReason;
  for (const item of catalog) {
    if (
      !tokens.every((token) =>
        normalize(item.name + " " + item.terms).includes(token),
      )
    )
      continue;
    const variants: WorkSuggestion[] = item.repair
      ? [
          {
            name: item.name,
            interventionType: "REPAIR",
            interventionReason: "FAULT",
            label: item.name + " por falla",
          },
        ]
      : [
          {
            name: item.name,
            interventionType: "MAINTENANCE",
            interventionReason: "SCHEDULED",
            label: item.name + " por mantenimiento",
          },
          {
            name: item.name,
            interventionType: "REPAIR",
            interventionReason: "WEAR",
            label: item.name + " por mal estado / desgaste",
          },
          {
            name: item.name,
            interventionType: "REPAIR",
            interventionReason: "FAULT",
            label: item.name + " por falla",
          },
        ];
    for (const suggestion of variants)
      suggestions.set(key(suggestion), suggestion);
  }
  for (const entry of [...history].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  )) {
    if (
      !entry.interventionType ||
      !entry.interventionReason ||
      !tokens.every((token) => normalize(entry.name).includes(token))
    )
      continue;
    const suggestion: WorkSuggestion = {
      name: entry.name,
      interventionType: entry.interventionType,
      interventionReason: entry.interventionReason,
      label: entry.name + " · " + interventionReasons[entry.interventionReason],
      maintenanceTypeCode: entry.maintenanceTypeCode,
      workDetails: entry.workDetails ?? [],
      uses: 1,
    };
    const previous = suggestions.get(key(suggestion));
    suggestions.set(
      key(suggestion),
      previous?.uses ? { ...previous, uses: previous.uses + 1 } : suggestion,
    );
  }
  return [...suggestions.values()]
    .sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0))
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
export const isEngineOil = (name: string, code?: MaintenanceTypeCode) =>
  maintenanceTypeCode({ type: name, maintenanceTypeCode: code }) ===
  "OIL_CHANGE";
