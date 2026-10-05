"use client";
import { FormEvent, useState } from "react";
import { Modal } from "./Modal";
import { SelectField } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  Cancellation,
  CancellationReason,
  VisitKind,
} from "@/features/shared/types/domain";
import { cancellationReasons } from "@/utils/cancellation";
export interface CancellationTarget {
  kind: VisitKind;
  id: string;
  label: string;
}
export function CancelVisitDialog({
  targets,
  onClose,
  onCancelled,
}: {
  targets: CancellationTarget[];
  onClose: () => void;
  onCancelled?: (
    target: CancellationTarget,
    cancellation: Cancellation,
  ) => void;
}) {
  const { cancelVisit, notify } = useStore();
  const [selection, setSelection] = useState("0");
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const target = targets[Number(selection)];
    if (busy || !reason || !target) return;
    setBusy(true);
    setError("");
    try {
      const cancellation = await cancelVisit(target.kind, target.id, {
        reason,
        notes: notes.trim(),
      });
      onCancelled?.(target, cancellation);
      notify(
        "Visita cancelada. El cliente y su vehículo permanecen registrados.",
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Cancelar visita u orden"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        ¿Deseas cancelar esta atención? Se conservarán el cliente, su vehículo y
        el historial guardado.
      </p>
      <form onSubmit={submit} className="form-grid">
        <SelectField
          label="Atención que deseas cancelar"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          disabled={busy}
          required
        >
          {targets.map((t, i) => (
            <option key={t.kind + t.id} value={i}>
              {t.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Motivo de cancelación"
          value={reason}
          onChange={(e) => setReason(e.target.value as CancellationReason)}
          required
          disabled={busy}
        >
          <option value="">Seleccionar motivo</option>
          {Object.entries(cancellationReasons).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <label className="field full">
          Observación {reason === "OTHER" ? "(obligatoria)" : "(opcional)"}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            required={reason === "OTHER"}
            disabled={busy}
            rows={3}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions full">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Volver sin cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Cancelando…" : "Confirmar cancelación"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
