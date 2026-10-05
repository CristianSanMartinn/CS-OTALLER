"use client";
import { useState } from "react";
import { Customer } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Modal } from "@/components/Modal/Modal";
export function DeleteClientDialog({
  client,
  onClose,
}: {
  client: Customer;
  onClose: () => void;
}) {
  const { setCustomerActive, notify } = useStore();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const restoring = client.active === false;
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await setCustomerActive(client.id, restoring);
      notify(
        restoring ? "Cliente restaurado." : "Cliente eliminado de la lista.",
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={restoring ? "Restaurar cliente" : "Eliminar cliente"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="form-grid">
        <p className="full">
          ¿Deseas {restoring ? "restaurar" : "eliminar"} a{" "}
          <strong>{client.name}</strong>?
        </p>
        <p className="full">
          {restoring
            ? "Volverá a aparecer en la lista de clientes y podrás seleccionarlo en nuevas atenciones."
            : "Dejará de aparecer en la lista y en nuevos registros. Sus vehículos, fotografías y trabajos anteriores se conservarán. Su QR quedará inactivo y se suspenderán sus recordatorios. Puedes recuperarlo desde Clientes eliminados."}
        </p>
        {error && (
          <p className="error full" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions full">
          <button className="button" disabled={busy} onClick={onClose}>
            Volver
          </button>
          <button className="button primary" disabled={busy} onClick={confirm}>
            {busy
              ? "Guardando…"
              : restoring
                ? "Confirmar restauración"
                : "Confirmar eliminación"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
