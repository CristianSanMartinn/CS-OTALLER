import { useState } from "react";
import type {
  RegistrationExtractionDraft,
  RegistrationField,
} from "../../services/registrationExtraction";
import { REGISTRATION_FIELDS } from "../../services/registrationExtraction";
import {
  confirmedRegistrationApplication,
  initialRegistrationReviews,
  normalizeRegistrationValue,
  registrationTarget,
  registrationOverwrites,
  type RegistrationApplication,
  type RegistrationFormSnapshot,
  type RegistrationReviews,
  type RegistrationReviewBridge,
} from "../../services/registrationReview";
import styles from "./RegistrationRecognitionDraft.module.css";
const labels: Record<RegistrationField, string> = {
  plate: "Patente",
  brand: "Marca",
  model: "Modelo",
  modelYear: "Año-modelo",
  manufacturingYear: "Año de fabricación",
  engineNumber: "Número de motor",
  chassisNumber: "Número de chasis",
  vin: "VIN",
};
const targetLabels = {
  plate: "Patente",
  brand: "Marca",
  model: "Modelo",
  year: "Año-modelo",
  vin: "VIN",
};
const states = {
  DETECTED: "Detectado · revisar",
  DOUBTFUL: "Dudoso · requiere revisión",
  ABSENT: "Ausente · no se identificó etiqueta",
  ILLEGIBLE: "Ilegible · sin valor fiable",
  NOT_ANALYZED: "No analizado",
};
export function RegistrationRecognitionDraft({
  draft,
  readForm,
  applyFields,
}: { draft: RegistrationExtractionDraft } & RegistrationReviewBridge) {
  const [reviews, setReviews] = useState<RegistrationReviews>(() =>
    initialRegistrationReviews(draft),
  );
  const [pending, setPending] = useState<{
    values: RegistrationApplication;
    snapshot: RegistrationFormSnapshot;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const selection = confirmedRegistrationApplication(draft, reviews);
  function change(
    field: RegistrationField,
    patch: Partial<RegistrationReviews[RegistrationField]>,
  ) {
    setReviews((current) => ({
      ...current,
      [field]: { ...current[field], ...patch },
    }));
    setPending(null);
    setNotice("");
  }
  function apply(
    values: RegistrationApplication,
    snapshot: RegistrationFormSnapshot,
    overwrite: boolean,
  ) {
    if (!applyFields) return;
    const result = applyFields(values, snapshot, overwrite);
    setPending(null);
    if (result === "APPLIED") {
      setReviews(
        (current) =>
          Object.fromEntries(
            Object.entries(current).map(([field, review]) => [
              field,
              {
                ...review,
                decision:
                  registrationTarget(field as RegistrationField) &&
                  Object.hasOwn(
                    values,
                    registrationTarget(field as RegistrationField)!,
                  )
                    ? "PENDING"
                    : review.decision,
              },
            ]),
          ) as RegistrationReviews,
      );
      setNotice(
        "Campos aplicados al formulario. Revisa la patente y guarda el vehículo cuando termines; todavía no se ha guardado.",
      );
    } else
      setNotice(
        result === "STALE"
          ? "El formulario cambió. Revisa sus valores y vuelve a seleccionar Aplicar; no se modificó ningún campo."
          : result === "OVERWRITE_REQUIRED"
            ? "Debes confirmar la sobrescritura de los valores actuales."
            : "No se pudieron aplicar esos campos. Revisa la selección y tu acceso; el registro manual sigue disponible.",
      );
  }
  function propose() {
    const snapshot = readForm?.();
    if (!snapshot || !Object.keys(selection).length) return;
    if (registrationOverwrites(selection, snapshot).length) {
      setPending({ values: { ...selection }, snapshot });
      setNotice("");
    } else apply(selection, snapshot, false);
  }
  return (
    <section
      className={styles.draft}
      aria-label="Borrador temporal del padrón"
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          (event.target as HTMLElement).tagName === "INPUT"
        )
          event.preventDefault();
      }}
    >
      <h4>Revisar datos del padrón</h4>
      <p>
        Revisa y corrige cada candidato. Ningún valor se acepta por su
        confianza. Solo los campos confirmados se aplicarán al formulario; el
        vehículo no se guardará automáticamente.
      </p>
      <div className={styles.fields}>
        {REGISTRATION_FIELDS.map((field) => {
          const data = draft.fields[field],
            review = reviews[field],
            target = registrationTarget(field),
            hasCandidate = data.candidates.length > 0,
            candidate =
              review.candidateIndex === null
                ? null
                : data.candidates[review.candidateIndex];
          const valid =
            hasCandidate &&
            review.candidateIndex !== null &&
            review.value.trim() !== "" &&
            (!target ||
              normalizeRegistrationValue(target, review.value) !== null) &&
            (field !== "vin" ||
              ["VIN", "NUMERO VIN"].includes(candidate?.source.label ?? "")) &&
            (field !== "modelYear" ||
              ["ANO MODELO", "ANO DEL MODELO"].includes(
                candidate?.source.label ?? "",
              ));
          return (
            <div key={field} className={styles.field}>
              <strong>{labels[field]}</strong>
              <span className={styles.state}>{states[data.state]}</span>
              {data.candidates.length > 1 && (
                <label>
                  Candidato para {labels[field]}
                  <select
                    aria-label={`Candidato para ${labels[field]}`}
                    value={review.candidateIndex ?? ""}
                    onChange={(event) => {
                      const index =
                        event.target.value === ""
                          ? null
                          : Number(event.target.value);
                      change(field, {
                        candidateIndex: index,
                        value:
                          index === null ? "" : data.candidates[index].value,
                        decision: "PENDING",
                      });
                    }}
                  >
                    <option value="">Revisar candidatos</option>
                    {data.candidates.map((item, index) => (
                      <option key={index} value={index}>
                        {item.value}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {hasCandidate ? (
                <>
                  <label>
                    Revisar {labels[field]}
                    <input
                      aria-label={`Revisar ${labels[field]}`}
                      value={review.value}
                      maxLength={100}
                      disabled={review.candidateIndex === null}
                      autoComplete="off"
                      onChange={(event) =>
                        change(field, {
                          value: event.target.value,
                          decision: "PENDING",
                        })
                      }
                    />
                  </label>
                  {candidate && (
                    <small>
                      Etiqueta: {candidate.source.label} · confianza OCR{" "}
                      {Math.round(candidate.confidence)} %. Valor leído:{" "}
                      {candidate.value}
                    </small>
                  )}
                  <label className={styles.confirm}>
                    <input
                      type="checkbox"
                      aria-label={`Confirmar ${labels[field]}`}
                      checked={review.decision === "ACCEPTED"}
                      disabled={!valid}
                      onChange={(event) =>
                        change(field, {
                          decision: event.target.checked
                            ? "ACCEPTED"
                            : "PENDING",
                        })
                      }
                    />
                    {target
                      ? "Confirmar y seleccionar"
                      : "Confirmar solo revisión"}
                  </label>
                  <button
                    type="button"
                    className="button"
                    onClick={() => change(field, { decision: "REJECTED" })}
                  >
                    Rechazar {labels[field]}
                  </button>
                  {review.decision === "REJECTED" && (
                    <small>Rechazado. No se aplicará.</small>
                  )}
                  {target && !valid && (
                    <small>
                      Selecciona un candidato y corrige el valor antes de
                      confirmarlo.
                      {field === "vin"
                        ? " VIN requiere etiqueta explícita y 17 caracteres válidos, sin sustituir I/O/Q."
                        : ""}
                    </small>
                  )}
                </>
              ) : (
                <small>
                  Completa este dato manualmente en el formulario si
                  corresponde. No se aplicará un valor ausente.
                </small>
              )}
              {!target && (
                <small>
                  Solo revisión.{" "}
                  {field === "manufacturingYear"
                    ? "No reemplaza el año-modelo."
                    : "No se guardará en Motor ni en VIN; no existe un campo compatible para este número."}
                </small>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="button"
        disabled={!readForm || !applyFields || !Object.keys(selection).length}
        onClick={propose}
      >
        Aplicar campos seleccionados
      </button>
      {pending && (
        <div
          className={styles.overwrite}
          role="group"
          aria-label="Confirmar sobrescritura de campos"
        >
          <p>
            Estos campos ya tienen información escrita. Confirma antes de
            reemplazarla:
          </p>
          <ul>
            {registrationOverwrites(pending.values, pending.snapshot).map(
              (field) => (
                <li key={field}>
                  <strong>{targetLabels[field]}:</strong>{" "}
                  {pending.snapshot[field]} → {pending.values[field]}
                </li>
              ),
            )}
          </ul>
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              onClick={() => apply(pending.values, pending.snapshot, true)}
            >
              Confirmar sobrescritura
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setPending(null)}
            >
              Cancelar aplicación
            </button>
          </div>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <p>
        Motor, chasis y VIN son independientes. El año de fabricación o una
        fecha de inscripción no sustituyen al año-modelo. Cliente y kilometraje
        permanecen manuales.
      </p>
    </section>
  );
}
