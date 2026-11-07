// Private, temporary OCR draft. Deliberately independent of Vehicle and Photo.
export const REGISTRATION_FIELDS = [
  "plate",
  "brand",
  "model",
  "modelYear",
  "manufacturingYear",
  "engineNumber",
  "chassisNumber",
  "vin",
] as const;
export type RegistrationField = (typeof REGISTRATION_FIELDS)[number];
export type ExtractionState =
  "DETECTED" | "DOUBTFUL" | "ABSENT" | "ILLEGIBLE" | "NOT_ANALYZED";
export type OcrBounds = { x0: number; y0: number; x1: number; y1: number };
export type OcrWord = { text: string; confidence: number; bbox: OcrBounds };
export type RegistrationCandidate = {
  value: string;
  confidence: number;
  source: { label: string; bounds: OcrBounds };
};
export type RegistrationExtractionDraft = {
  version: 1;
  engine: "Tesseract.js 7.0.0 spa+eng";
  fields: Record<
    RegistrationField,
    { state: ExtractionState; candidates: RegistrationCandidate[] }
  >;
};
const aliases: Record<RegistrationField, string[]> = {
  plate: ["PATENTE", "PPU", "PLACA PATENTE", "INSCRIPCION"],
  brand: ["MARCA"],
  model: ["MODELO"],
  modelYear: ["ANO MODELO", "ANO DEL MODELO"],
  manufacturingYear: ["ANO FABRICACION", "ANO DE FABRICACION"],
  engineNumber: ["NRO MOTOR", "NUMERO MOTOR", "NUMERO DE MOTOR", "N MOTOR"],
  chassisNumber: [
    "NRO CHASIS",
    "NUMERO CHASIS",
    "NUMERO DE CHASIS",
    "N CHASIS",
  ],
  vin: ["VIN", "NUMERO VIN"],
};
const privateLabels = [
  "PROPIETARIO",
  "NOMBRE",
  "RUT",
  "RUN",
  "DIRECCION",
  "DOMICILIO",
  "COMUNA",
  "REGION",
  "APELLIDOS",
  "TITULAR",
];
const norm = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[.:;º°]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function emptyRegistrationDraft(
  state: ExtractionState = "NOT_ANALYZED",
): RegistrationExtractionDraft {
  return {
    version: 1,
    engine: "Tesseract.js 7.0.0 spa+eng",
    fields: Object.fromEntries(
      REGISTRATION_FIELDS.map((field) => [field, { state, candidates: [] }]),
    ) as unknown as RegistrationExtractionDraft["fields"],
  };
}
// Only word geometry is consumed; concatenated document text is never a fallback.
export function extractRegistrationDraft(
  words: OcrWord[],
  currentYear = new Date().getFullYear(),
): RegistrationExtractionDraft {
  if (words.length > 4000) throw new Error("DOCUMENT_LIMIT");
  const safe = words.filter(
    (w) =>
      typeof w?.text === "string" &&
      w.text.trim() &&
      w.text.length <= 120 &&
      w.bbox &&
      [w.bbox.x0, w.bbox.x1, w.bbox.y0, w.bbox.y1, w.confidence].every(
        Number.isFinite,
      ) &&
      w.bbox.x1 > w.bbox.x0 &&
      w.bbox.y1 > w.bbox.y0,
  );
  const draft = emptyRegistrationDraft("ABSENT");
  const rows: { center: number; height: number; words: OcrWord[] }[] = [];
  for (const word of [...safe].sort(
    (a, b) =>
      a.bbox.y0 + a.bbox.y1 - b.bbox.y0 - b.bbox.y1 || a.bbox.x0 - b.bbox.x0,
  )) {
    const height = word.bbox.y1 - word.bbox.y0,
      center = (word.bbox.y0 + word.bbox.y1) / 2;
    let row = rows.find(
      (r) =>
        Math.abs(r.center - center) <
        Math.max(3, Math.min(height, r.height) * 0.55),
    );
    if (!row) {
      row = { center, height, words: [] };
      rows.push(row);
    }
    row.words.push(word);
  }
  rows.forEach((r) => r.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  type Anchor = {
    field: RegistrationField | null;
    row: (typeof rows)[number];
    start: number;
    end: number;
    label: string;
    box: OcrBounds;
  };
  const anchors: Anchor[] = [];
  for (const row of rows)
    for (let i = 0; i < row.words.length; i++) {
      for (let length = 4; length >= 1; length--) {
        const segment = row.words.slice(i, i + length);
        if (segment.length !== length) continue;
        const label = norm(segment.map((w) => w.text).join(" "));
        const field =
          i === 0 || /[:;]$/.test(segment.at(-1)!.text)
            ? REGISTRATION_FIELDS.find((f) => aliases[f].includes(label))
            : undefined;
        const personal = privateLabels.includes(label);
        // Also stop at unknown colon-delimited labels; never eat another field.
        const unknown = length === 1 && /[:;]$/.test(segment[0].text);
        if (!field && !personal && !unknown) continue;
        anchors.push({
          field: field ?? null,
          row,
          start: i,
          end: i + length,
          label: field ? label : "",
          box: {
            x0: segment[0].bbox.x0,
            x1: segment.at(-1)!.bbox.x1,
            y0: Math.min(...segment.map((w) => w.bbox.y0)),
            y1: Math.max(...segment.map((w) => w.bbox.y1)),
          },
        });
        i += length - 1;
        break;
      }
    }
  for (const anchor of anchors) {
    if (!anchor.field) continue;
    const right = anchors
      .filter((a) => a.row === anchor.row && a.start >= anchor.end)
      .sort((a, b) => a.start - b.start)[0];
    let values = anchor.row.words.slice(
      anchor.end,
      right?.start ?? anchor.row.words.length,
    );
    // Values below a label are accepted only within its spatial column and one close row.
    if (!values.length) {
      const rightLimit = right?.box.x0 ?? Infinity;
      const row = rows.find(
        (r) =>
          r.center > anchor.box.y1 &&
          r.center < anchor.box.y1 + (anchor.box.y1 - anchor.box.y0) * 2.5,
      );
      if (row) {
        const area = row.words.filter(
          (w) => w.bbox.x0 >= anchor.box.x0 - 5 && w.bbox.x1 < rightLimit,
        );
        const hasLabel = anchors.some(
          (a) =>
            a.row === row &&
            a.box.x0 < rightLimit &&
            a.box.x1 >= anchor.box.x0 - 5,
        );
        if (!hasLabel) values = area;
      }
    }
    const field = draft.fields[anchor.field];
    if (!values.length) {
      if (!field.candidates.length) field.state = "ILLEGIBLE";
      continue;
    }
    // Redact, rather than expose, unexpected private labels/ID/contact patterns in a value.
    const value = values
      .map((w) => w.text)
      .join(" ")
      .trim()
      .slice(0, 120);
    const normalized = norm(value);
    const sensitive =
      privateLabels.some((t) =>
        new RegExp("\\b" + t + "\\b").test(normalized),
      ) || /@|\b\d{1,2}[.]\d{3}[.]\d{3}-[\dKk]\b/.test(value);
    if (sensitive || value.length > 100) {
      if (!field.candidates.length) field.state = "ILLEGIBLE";
      continue;
    }
    let valid = /^[\p{L}\p{N} ./'()-]{1,100}$/u.test(value);
    if (anchor.field === "plate")
      valid = /^(?:[A-Z]{4}[ -]?[0-9]{2}|[A-Z]{2}[ -]?[0-9]{4})$/.test(value);
    if (anchor.field.endsWith("Year"))
      valid =
        /^\d{4}$/.test(value) &&
        Number(value) >= 1900 &&
        Number(value) <= currentYear + 1;
    if (["engineNumber", "chassisNumber", "vin"].includes(anchor.field))
      valid = /^[A-Z0-9-]{4,50}$/.test(value);
    if (anchor.field === "vin") valid = /^[A-HJ-NPR-Z0-9]{17}$/.test(value);
    const confidence = Math.max(
      0,
      Math.min(
        100,
        values.reduce((sum, w) => sum + w.confidence, 0) / values.length,
      ),
    );
    const candidate: RegistrationCandidate = {
      value,
      confidence,
      source: {
        label: anchor.label,
        bounds: {
          x0: Math.min(...values.map((w) => w.bbox.x0)),
          y0: Math.min(...values.map((w) => w.bbox.y0)),
          x1: Math.max(...values.map((w) => w.bbox.x1)),
          y1: Math.max(...values.map((w) => w.bbox.y1)),
        },
      },
    };
    if (
      !field.candidates.some((c) => c.value === value) &&
      field.candidates.length < 3
    )
      field.candidates.push(candidate);
    field.state =
      !valid ||
      confidence < 85 ||
      field.candidates.length !== 1 ||
      field.state === "DOUBTFUL"
        ? "DOUBTFUL"
        : "DETECTED";
  }
  return draft;
}
