import {
  registrationPreparationPlan,
  FULL_REGISTRATION_CROP,
  type RegistrationCrop,
} from "./registrationCrop";
// Transient client-side resource. Never attach this Blob to Vehicle/Photo.
export type PreparedRegistrationImage = {
  blob: Blob;
  width: number;
  height: number;
};

export const PREPARATION_UNSUPPORTED =
  "Este navegador no permite preparar la imagen de forma segura en segundo plano. Puedes continuar con el registro manual.";

export function supportsPrivateImagePreparation() {
  return (
    typeof Worker === "function" &&
    typeof OffscreenCanvas === "function" &&
    typeof createImageBitmap === "function"
  );
}

export class PrivateImagePreparation {
  private sequence = 0;
  private active: {
    worker: Worker;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  private terminate(worker: Worker) {
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
  }

  cancel() {
    this.sequence++;
    const active = this.active;
    this.active = null;
    if (active) {
      clearTimeout(active.timer);
      this.terminate(active.worker);
      active.reject(new Error("PREPARATION_CANCELLED"));
    }
  }

  prepare(
    file: Blob,
    turns: number,
    originalWidth: number,
    originalHeight: number,
    crop: RegistrationCrop = FULL_REGISTRATION_CROP,
  ): Promise<PreparedRegistrationImage> {
    this.cancel();
    if (!supportsPrivateImagePreparation())
      return Promise.reject(new Error(PREPARATION_UNSUPPORTED));
    if (
      !Number.isInteger(turns) ||
      turns < 0 ||
      turns > 3 ||
      !Number.isInteger(originalWidth) ||
      !Number.isInteger(originalHeight) ||
      originalWidth <= 0 ||
      originalHeight <= 0 ||
      originalWidth * originalHeight > 24_000_000 ||
      Math.max(originalWidth, originalHeight) > 12000 ||
      !file.size ||
      file.size > 12 * 1024 * 1024
    )
      return Promise.reject(
        new Error("La fotografía u orientación no es válida."),
      );
    let plan: ReturnType<typeof registrationPreparationPlan>;
    try {
      plan = registrationPreparationPlan(
        originalWidth,
        originalHeight,
        turns,
        crop,
      );
    } catch {
      return Promise.reject(new Error("El área de recorte no es válida."));
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker("/workers/private-registration-image.js");
      } catch {
        reject(new Error(PREPARATION_UNSUPPORTED));
        return;
      }
      const finish = (error?: string, result?: PreparedRegistrationImage) => {
        if (id !== this.sequence || this.active?.worker !== worker) return;
        clearTimeout(this.active.timer);
        this.active = null;
        this.terminate(worker);
        if (error) reject(new Error(error));
        else if (result) resolve(result);
      };
      const timer = setTimeout(
        () =>
          finish(
            "La preparación tardó demasiado. Prueba otra fotografía o continúa manualmente.",
          ),
        30000,
      );
      this.active = { worker, reject, timer };
      let requested = false;
      worker.onmessage = ({ data }) => {
        if (id !== this.sequence || this.active?.worker !== worker) return;
        if (data?.kind === "READY") {
          if (!data.compatible) {
            finish(PREPARATION_UNSUPPORTED);
            return;
          }
          if (requested) return;
          requested = true;
          try {
            worker.postMessage({ kind: "PREPARE", id, file, plan });
          } catch {
            finish(
              "No se pudo preparar la fotografía. El registro manual sigue disponible.",
            );
          }
          return;
        }
        if (!requested || data?.id !== id) return;
        if (data.kind === "ERROR") {
          finish(
            data.code === "UNSUPPORTED"
              ? PREPARATION_UNSUPPORTED
              : "No se pudo preparar la fotografía. El registro manual sigue disponible.",
          );
        } else if (data.kind === "RESULT") {
          const { width, height } = plan.output;
          if (
            !(data.blob instanceof Blob) ||
            !data.blob.size ||
            data.blob.type !== "image/png" ||
            data.width !== width ||
            data.height !== height
          ) {
            finish(
              "La imagen preparada no coincide con el original. Repite la captura o continúa manualmente.",
            );
            return;
          }
          finish(undefined, { blob: data.blob, width, height });
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        finish(PREPARATION_UNSUPPORTED);
      };
      worker.onmessageerror = () =>
        finish(
          "No se pudo recibir la imagen preparada. Continúa manualmente o repite la captura.",
        );
    });
  }
}
