import { PointerEvent, KeyboardEvent, useId, useRef } from "react";
import {
  fitRegistrationCrop,
  type RegistrationCrop,
} from "../../services/registrationCrop";
import type { PrivateRegistrationImage } from "../../services/privateRegistrationImage";
import styles from "./RegistrationCropEditor.module.css";

type Props = {
  preview: PrivateRegistrationImage;
  originalWidth: number;
  originalHeight: number;
  turns: number;
  crop: RegistrationCrop;
  confirmed: boolean;
  disabled: boolean;
  onChange: (crop: RegistrationCrop) => void;
  onConfirm: () => void;
  onCancel: () => void;
};
const names = {
  nw: "Esquina superior izquierda",
  ne: "Esquina superior derecha",
  sw: "Esquina inferior izquierda",
  se: "Esquina inferior derecha",
  move: "Mover recorte",
};
type Handle = keyof typeof names;

export function RegistrationCropEditor({
  preview,
  originalWidth,
  originalHeight,
  turns,
  crop,
  confirmed,
  disabled,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const hintId = useId();
  const drag = useRef<{
    id: number;
    kind: Handle | "draw";
    x: number;
    y: number;
    crop: RegistrationCrop;
  } | null>(null);
  const orientedWidth = turns % 2 ? preview.height : preview.width;
  const orientedHeight = turns % 2 ? preview.width : preview.height;
  function point(event: PointerEvent<HTMLDivElement>) {
    const b = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (event.clientY - b.top) / b.height)),
    };
  }
  function resize(
    start: RegistrationCrop,
    kind: Handle,
    dx: number,
    dy: number,
  ) {
    if (kind === "move")
      return fitRegistrationCrop({
        ...start,
        left: start.left + dx,
        top: start.top + dy,
      });
    let left = start.left,
      top = start.top,
      right = left + start.width,
      bottom = top + start.height;
    if (kind.includes("w"))
      left = Math.max(0, Math.min(right - 0.01, left + dx));
    if (kind.includes("e"))
      right = Math.min(1, Math.max(left + 0.01, right + dx));
    if (kind.includes("n"))
      top = Math.max(0, Math.min(bottom - 0.01, top + dy));
    if (kind.includes("s"))
      bottom = Math.min(1, Math.max(top + 0.01, bottom + dy));
    return fitRegistrationCrop({
      left,
      top,
      width: right - left,
      height: bottom - top,
    });
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      disabled ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    const p = point(event),
      target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-crop-handle]",
      );
    drag.current = {
      id: event.pointerId,
      kind: (target?.dataset.cropHandle as Handle) ?? "draw",
      x: p.x,
      y: p.y,
      crop: { ...crop },
    };
    onChange({ ...crop });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || disabled) return;
    const p = point(event);
    onChange(
      start.kind === "draw"
        ? fitRegistrationCrop({
            left: Math.min(start.x, p.x),
            top: Math.min(start.y, p.y),
            width: Math.abs(p.x - start.x),
            height: Math.abs(p.y - start.y),
          })
        : resize(start.crop, start.kind, p.x - start.x, p.y - start.y),
    );
  }
  function end(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = drag.current;
    if (start?.id !== event.pointerId) return;
    drag.current = null;
    if (cancelled) onChange(start.crop);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, handle: Handle) {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = Object.hasOwn(deltas, event.key) ? deltas[event.key] : undefined;
    if (!d || disabled) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.01;
    onChange(resize(crop, handle, d[0] * step, d[1] * step));
  }
  return (
    <div className={styles.editor}>
      <p id={hintId}>
        Incluye todos los bordes del padrón. Arrastra sobre la imagen para
        dibujar el rectángulo, usa sus esquinas o los controles inferiores. Las
        flechas ajustan los controles; Mayús + flecha mueve un paso mayor. Si
        está muy inclinado o debes cortar información, repite la fotografía.
      </p>
      <figure className={styles.preview}>
        <div
          className={styles.imageStage}
          style={{
            width: `min(100%, ${(320 * orientedWidth) / orientedHeight}px)`,
            aspectRatio: `${orientedWidth} / ${orientedHeight}`,
          }}
        >
          {/* Blob thumbnail only. The source file is processed exclusively by the worker. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt="Vista previa privada del padrón"
            draggable={false}
            style={{
              width:
                turns % 2
                  ? `${(100 * preview.width) / preview.height}%`
                  : "100%",
              height:
                turns % 2
                  ? `${(100 * preview.height) / preview.width}%`
                  : "100%",
              transform: `translate(-50%, -50%) rotate(${turns * 90}deg)`,
            }}
          />
          <div
            className={styles.overlay}
            role="group"
            aria-label="Área de recorte del padrón"
            aria-describedby={hintId}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={(event) => end(event)}
            onPointerCancel={(event) => end(event, true)}
          >
            <div
              className={styles.selection}
              style={{
                left: `${crop.left * 100}%`,
                top: `${crop.top * 100}%`,
                width: `${crop.width * 100}%`,
                height: `${crop.height * 100}%`,
              }}
            >
              {(Object.keys(names) as Handle[]).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  disabled={disabled}
                  aria-label={names[handle]}
                  aria-describedby={hintId}
                  data-crop-handle={handle}
                  className={`${styles.handle} ${styles[handle]}`}
                  onKeyDown={(event) => key(event, handle)}
                >
                  {handle === "move" ? "✥" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
        <figcaption>
          Original: {originalWidth} × {originalHeight} px. Vista previa:{" "}
          {preview.width} × {preview.height} px. La fotografía original no
          cambia.
        </figcaption>
      </figure>
      <fieldset className={styles.fields} disabled={disabled}>
        <legend>Ajustar recorte con controles</legend>
        {(
          [
            ["left", "Borde izquierdo", 0, 1 - crop.width],
            ["top", "Borde superior", 0, 1 - crop.height],
            ["width", "Ancho del recorte", 0.01, 1 - crop.left],
            ["height", "Alto del recorte", 0.01, 1 - crop.top],
          ] as const
        ).map(([field, label, min, max]) => (
          <label key={field}>
            {label}: {(crop[field] * 100).toFixed(1)} %
            <input
              aria-label={`${label} (%)`}
              type="range"
              min={min * 100}
              max={Math.max(min, max) * 100}
              step="0.1"
              value={crop[field] * 100}
              onChange={(event) =>
                onChange(
                  fitRegistrationCrop({
                    ...crop,
                    [field]: Number(event.target.value) / 100,
                  }),
                )
              }
            />
          </label>
        ))}
      </fieldset>
      <div className={styles.actions}>
        <button
          type="button"
          className="button"
          disabled={disabled || confirmed}
          onClick={onConfirm}
        >
          Confirmar recorte completo
        </button>
        <button
          type="button"
          className="button"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancelar recorte
        </button>
      </div>
      <p role="status">
        {confirmed
          ? "Recorte confirmado. Puedes preparar la copia temporal."
          : "Recorte sin confirmar. Revisa que no falten datos antes de confirmarlo."}
      </p>
    </div>
  );
}
