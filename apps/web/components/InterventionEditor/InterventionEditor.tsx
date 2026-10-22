"use client";
import type { WorkHistoryEntry } from "@/features/shared/services/workHistory";
import type { WorkSuggestion } from "@/features/shared/services/interventions";

import { type ReactNode, useId, useState } from "react";
import { Search, Plus, Check, Wrench } from "lucide-react";
import { Field, SelectField } from "@/components/ui/primitives";
import type { Intervention } from "@/features/shared/types/domain";
import {
  interventionLabel,
  interventionLabels,
  interventionReasons,
  interventionSummary,
  workOptions,
  workSuggestions,
} from "@/features/shared/services/interventions";
interface Value extends Intervention {
  name: string;
}
export function InterventionEditor({
  value,
  onChange,
  maxLength = 150,
  classificationRequired = true,
  history = [],
  onChoose,
  extraClassification,
  classificationHint = "",
}: {
  value: Value;
  onChange: (patch: Partial<Value>) => void;
  maxLength?: number;
  classificationRequired?: boolean;
  history?: WorkHistoryEntry[];
  onChoose?: (suggestion: WorkSuggestion) => void;
  extraClassification?: ReactNode;
  classificationHint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [custom, setCustom] = useState("");
  const [manualClassification, setManualClassification] = useState(false);
  const suggestions = workSuggestions(value.name, history).filter(
    (item) => item.name.length <= maxLength,
  );
  const classified = !!value.interventionType && !!value.interventionReason;
  const options = workOptions(value.name);
  const details = value.workDetails ?? [];
  function choose(index: number) {
    const item = suggestions[index];
    if (!item) return;
    if (onChoose) onChoose(item);
    else
      onChange({
        name: item.name,
        interventionType: item.interventionType,
        interventionReason: item.interventionReason,
        ...(item.workDetails
          ? { workDetails: [...item.workDetails] }
          : item.name !== value.name
            ? { workDetails: [] }
            : {}),
      });
    setManualClassification(false);
    setOpen(false);
    setActive(-1);
  }
  function toggle(detail: string) {
    let next = details.includes(detail)
      ? details.filter((item) => item !== detail)
      : [...details, detail];
    if (!details.includes(detail) && detail === "Reemplazo de kit completo")
      next = next.filter(
        (item) => item !== "Reemplazo de componentes individuales",
      );
    if (
      !details.includes(detail) &&
      detail === "Reemplazo de componentes individuales"
    )
      next = next.filter((item) => item !== "Reemplazo de kit completo");
    onChange({ workDetails: next });
  }
  return (
    <div className="intervention-editor">
      <div className="intervention-search">
        <label htmlFor={id}>Trabajo o servicio *</label>
        <div className="intervention-input-wrap">
          <Search size={17} />
          <input
            id={id}
            role="combobox"
            autoComplete="off"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={id + "-suggestions"}
            aria-autocomplete="list"
            aria-activedescendant={
              open && active >= 0 ? id + "-option-" + active : undefined
            }
            placeholder="Escribe: embrague, frenos, sensor, batería…"
            required
            maxLength={maxLength}
            value={value.name}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              onChange({ name: event.target.value });
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setActive(-1);
              }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setActive((index) =>
                  event.key === "ArrowDown"
                    ? Math.min(index + 1, suggestions.length - 1)
                    : Math.max(index - 1, 0),
                );
              }
              if (event.key === "Enter" && open) {
                event.preventDefault();
                if (active >= 0) choose(active);
                else setOpen(false);
              }
            }}
          />
        </div>
        {open && suggestions.length > 0 && (
          <div
            id={id + "-suggestions"}
            role="listbox"
            aria-label="Sugerencias de trabajo"
            className="intervention-suggestions"
          >
            {suggestions.map((item, index) => (
              <div
                role="option"
                aria-selected={index === active}
                id={id + "-option-" + index}
                key={
                  item.name +
                  ":" +
                  item.interventionType +
                  ":" +
                  item.interventionReason
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={index === active ? "is-selected" : ""}
              >
                <Wrench size={16} />
                <span>
                  {item.label}
                  <small>
                    {item.uses
                      ? "Frecuente en tu taller · revisar detalles"
                      : interventionLabels[item.interventionType]}
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="help-text">
          Selecciona una sugerencia o escribe tu propio trabajo. Nada se
          registra hasta guardar la ficha.
        </p>
      </div>
      <div className="intervention-quick-classification">
        <span>
          {[classificationHint, interventionLabel(value)]
            .filter(Boolean)
            .slice(0, 2)
            .join(" · ") ||
            "Selecciona una sugerencia o completa la clasificación"}
        </span>
        {classified && (
          <button
            type="button"
            className="text-link"
            aria-expanded={manualClassification}
            onClick={() => setManualClassification(!manualClassification)}
          >
            {manualClassification ? "Cerrar ajustes" : "Ajustar clasificación"}
          </button>
        )}
      </div>
      {(!classified || manualClassification) && (
        <div className="intervention-classification">
          {extraClassification}
          <SelectField
            label="Tipo de intervención"
            required={classificationRequired}
            value={value.interventionType ?? ""}
            onChange={(event) =>
              onChange({
                interventionType: event.target
                  .value as Value["interventionType"],
              })
            }
          >
            <option value="">Seleccionar tipo</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="REPAIR">Reparación</option>
          </SelectField>
          <SelectField
            label="Motivo del trabajo"
            required={classificationRequired}
            value={value.interventionReason ?? ""}
            onChange={(event) =>
              onChange({
                interventionReason: event.target
                  .value as Value["interventionReason"],
              })
            }
          >
            <option value="">Seleccionar motivo</option>
            {Object.entries(interventionReasons).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      <details className="intervention-work-details">
        <summary>
          Detalles del trabajo
          {details.length
            ? " · " + details.length + " seleccionados"
            : " (opcional)"}
        </summary>
        <fieldset className="intervention-options">
          <legend>
            ¿Qué se realizó?{" "}
            <span>Selecciona los detalles que correspondan</span>
          </legend>
          {options.length > 0 && (
            <div className="intervention-options-grid">
              {options.map((detail) => (
                <label key={detail}>
                  <input
                    type="checkbox"
                    checked={details.includes(detail)}
                    disabled={!details.includes(detail) && details.length >= 30}
                    onChange={() => toggle(detail)}
                  />
                  {detail}
                </label>
              ))}
            </div>
          )}
          <div className="intervention-custom">
            <Field
              label="Otro detalle del trabajo"
              placeholder="Ej.: reemplazo de rodamiento de empuje"
              maxLength={150}
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
            <button
              type="button"
              className="button small"
              disabled={!custom.trim() || details.length >= 30}
              onClick={() => {
                const text = custom.trim();
                if (text && !details.includes(text))
                  onChange({ workDetails: [...details, text] });
                setCustom("");
              }}
            >
              <Plus size={16} />
              Agregar detalle
            </button>
          </div>
          {details.length > 0 && (
            <ul className="intervention-selected">
              {details.map((detail) => (
                <li key={detail}>
                  <Check size={14} />
                  {detail}
                  <button
                    type="button"
                    aria-label={"Quitar detalle: " + detail}
                    onClick={() => toggle(detail)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </details>
      <div className="intervention-preview">
        <small>RESUMEN DE LO QUE SE GUARDARÁ</small>
        <p>
          {interventionSummary(value.name, value) ||
            "Escribe el trabajo y selecciona su clasificación."}
        </p>
      </div>
    </div>
  );
}
