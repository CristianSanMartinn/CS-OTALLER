import { normalizePlate } from "./vehiclePlateSearch";
import type {
  RegistrationExtractionDraft,
  RegistrationField,
} from "./registrationExtraction";
export const APPLICABLE_REGISTRATION_FIELDS = [
  "plate",
  "brand",
  "model",
  "year",
  "vin",
] as const;
export type RegistrationTarget =
  (typeof APPLICABLE_REGISTRATION_FIELDS)[number];
export type RegistrationApplication = Partial<
  Record<RegistrationTarget, string>
>;
export type RegistrationFormSnapshot = Record<RegistrationTarget, string>;
export type RegistrationApplyResult =
  "APPLIED" | "STALE" | "OVERWRITE_REQUIRED" | "INVALID";
export type RegistrationReviewBridge = {
  readForm?: () => RegistrationFormSnapshot | null;
  applyFields?: (
    values: RegistrationApplication,
    expected: RegistrationFormSnapshot,
    overwrite: boolean,
  ) => RegistrationApplyResult;
};
export type FieldReview = {
  value: string;
  candidateIndex: number | null;
  decision: "PENDING" | "ACCEPTED" | "REJECTED";
};
export type RegistrationReviews = Record<RegistrationField, FieldReview>;
const mapping: Partial<Record<RegistrationField, RegistrationTarget>> = {
  plate: "plate",
  brand: "brand",
  model: "model",
  modelYear: "year",
  vin: "vin",
};
export function registrationTarget(field: RegistrationField) {
  return Object.hasOwn(mapping, field) ? mapping[field] : undefined;
}
export function initialRegistrationReviews(
  draft: RegistrationExtractionDraft,
): RegistrationReviews {
  return Object.fromEntries(
    Object.entries(draft.fields).map(([field, data]) => [
      field,
      {
        value: data.candidates.length === 1 ? data.candidates[0].value : "",
        candidateIndex: data.candidates.length === 1 ? 0 : null,
        decision: "PENDING",
      },
    ]),
  ) as RegistrationReviews;
}
export function normalizeRegistrationValue(
  target: RegistrationTarget,
  value: string,
): string | null {
  const text = value.trim();
  if (target === "plate")
    return text.length <= 20 && normalizePlate(text)
      ? normalizePlate(text)
      : null;
  if (target === "year")
    return /^\d{4}$/.test(text) &&
      Number(text) >= 1900 &&
      Number(text) <= new Date().getFullYear() + 1
      ? text
      : null;
  if (target === "vin") return /^[A-HJ-NPR-Z0-9]{17}$/.test(text) ? text : null;
  return text.length > 0 && text.length <= 100 ? text : null;
}
export function confirmedRegistrationApplication(
  draft: RegistrationExtractionDraft,
  reviews: RegistrationReviews,
): RegistrationApplication {
  const values: RegistrationApplication = {};
  for (const field of Object.keys(mapping) as RegistrationField[]) {
    const review = reviews[field],
      target = registrationTarget(field)!;
    if (review.decision !== "ACCEPTED" || review.candidateIndex === null)
      continue;
    const candidate = draft.fields[field].candidates[review.candidateIndex];
    if (!candidate) continue;
    // A year must be explicitly a model year; manufacturing/registration dates are never fallbacks.
    if (
      field === "modelYear" &&
      !["ANO MODELO", "ANO DEL MODELO"].includes(candidate.source.label)
    )
      continue;
    if (
      field === "vin" &&
      !["VIN", "NUMERO VIN"].includes(candidate.source.label)
    )
      continue;
    const value = normalizeRegistrationValue(target, review.value);
    if (value !== null) values[target] = value;
  }
  return values;
}
export function validateRegistrationApplication(
  values: RegistrationApplication,
): boolean {
  const keys = Object.keys(values);
  return (
    keys.length > 0 &&
    keys.every(
      (key) =>
        APPLICABLE_REGISTRATION_FIELDS.includes(key as RegistrationTarget) &&
        typeof values[key as RegistrationTarget] === "string" &&
        normalizeRegistrationValue(
          key as RegistrationTarget,
          values[key as RegistrationTarget]!,
        ) === values[key as RegistrationTarget],
    )
  );
}
export function registrationOverwrites(
  values: RegistrationApplication,
  snapshot: RegistrationFormSnapshot,
): RegistrationTarget[] {
  return (Object.keys(values) as RegistrationTarget[]).filter(
    (key) => snapshot[key].trim() !== "" && snapshot[key] !== values[key],
  );
}
export function registrationSnapshotMatches(
  values: RegistrationApplication,
  expected: RegistrationFormSnapshot,
  current: RegistrationFormSnapshot,
): boolean {
  return (Object.keys(values) as RegistrationTarget[]).every(
    (key) => expected[key] === current[key],
  );
}
