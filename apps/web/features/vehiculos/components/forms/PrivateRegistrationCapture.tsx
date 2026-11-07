import type { RegistrationReviewBridge } from "../../services/registrationReview";
import {
  PrivateRegistrationRecognition,
  type RecognitionProgress,
} from "../../services/privateRegistrationRecognition";
import type { RegistrationExtractionDraft } from "../../services/registrationExtraction";
import { RegistrationRecognitionDraft } from "./RegistrationRecognitionDraft";
import { RegistrationCropEditor } from "./RegistrationCropEditor";
import {
  FULL_REGISTRATION_CROP,
  registrationPreparationPlan,
  type RegistrationCrop,
} from "../../services/registrationCrop";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  preparePrivateRegistrationImage,
  createPrivateRegistrationPreview,
  registrationImageWarnings,
  type PrivateRegistrationImage,
} from "../../services/privateRegistrationImage";
import {
  PrivateImagePreparation,
  supportsPrivateImagePreparation,
  PREPARATION_UNSUPPORTED,
  type PreparedRegistrationImage,
} from "../../services/privateImagePreparation";
import styles from "./PrivateRegistrationCapture.module.css";

export function PrivateRegistrationCapture({
  readForm,
  applyFields,
}: RegistrationReviewBridge = {}) {
  const recognizer = useRef<PrivateRegistrationRecognition | null>(null);
  const recognitionSequence = useRef(0);
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionProgress, setRecognitionProgress] =
    useState<RecognitionProgress | null>(null);
  const [recognitionError, setRecognitionError] = useState("");
  const [draft, setDraft] = useState<RegistrationExtractionDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [crop, setCrop] = useState<RegistrationCrop>({
    ...FULL_REGISTRATION_CROP,
  });
  const [confirmedCrop, setConfirmedCrop] = useState<RegistrationCrop | null>(
    null,
  );
  const [preview, setPreview] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [turns, setTurns] = useState(0);
  const original = useRef<PrivateRegistrationImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const currentUrl = useRef<string | null>(null);
  const sequence = useRef(0);
  const sourceFile = useRef<File | null>(null);
  const preparer = useRef<PrivateImagePreparation | null>(null);
  const preparationSequence = useRef(0);
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState<PreparedRegistrationImage | null>(
    null,
  );
  const [preparationError, setPreparationError] = useState("");
  const [compatible, setCompatible] = useState<boolean | null>(null);
  useEffect(
    () => () => {
      recognitionSequence.current++;
      recognizer.current?.cancel();
      sequence.current++;
      preparationSequence.current++;
      preparer.current?.cancel();
      releaseImages();
    },
    [],
  );
  function releaseImages() {
    for (const url of new Set([currentUrl.current, original.current?.url]))
      if (url) URL.revokeObjectURL(url);
    currentUrl.current = null;
    original.current = null;
    sourceFile.current = null;
  }
  function cancel() {
    invalidatePreparation();
    sequence.current++;
    releaseImages();
    setTurns(0);
    setCrop({ ...FULL_REGISTRATION_CROP });
    setConfirmedCrop(null);
    setPreview(null);
    setError("");
    setBusy(false);
    setOpen(false);
  }
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    invalidatePreparation();
    const attempt = ++sequence.current;
    setBusy(true);
    setError("");
    let image: PrivateRegistrationImage | undefined;
    try {
      image = await preparePrivateRegistrationImage(file);
      if (attempt !== sequence.current) {
        URL.revokeObjectURL(image.url);
        return;
      }
      const thumbnail = await createPrivateRegistrationPreview(image);
      if (attempt !== sequence.current) {
        for (const url of new Set([image.url, thumbnail.url]))
          URL.revokeObjectURL(url);
        return;
      }
      releaseImages();
      original.current = image;
      sourceFile.current = file;
      setCompatible(supportsPrivateImagePreparation());
      setTurns(0);
      setCrop({ ...FULL_REGISTRATION_CROP });
      setConfirmedCrop(null);
      currentUrl.current = thumbnail.url;
      setPreview(thumbnail);
    } catch (e) {
      if (image) URL.revokeObjectURL(image.url);
      if (attempt === sequence.current)
        setError(
          e instanceof Error ? e.message : "No se pudo abrir la fotografía.",
        );
    } finally {
      if (attempt === sequence.current) setBusy(false);
    }
  }
  function rotate(delta: number) {
    if (!original.current || busy) return;
    invalidatePreparation();
    setCrop({ ...FULL_REGISTRATION_CROP });
    setConfirmedCrop(null);
    setTurns((current) => (((current + delta) % 4) + 4) % 4);
  }
  function invalidateRecognition() {
    recognitionSequence.current++;
    recognizer.current?.cancel();
    setRecognizing(false);
    setRecognitionProgress(null);
    setRecognitionError("");
    setDraft(null);
  }
  function invalidatePreparation() {
    invalidateRecognition();
    preparationSequence.current++;
    preparer.current?.cancel();
    setPrepared(null);
    setPreparing(false);
    setPreparationError("");
  }
  async function prepareForRecognition() {
    if (
      preparing ||
      busy ||
      !sourceFile.current ||
      !original.current ||
      !confirmedCrop
    )
      return;
    invalidatePreparation();
    const attempt = ++preparationSequence.current;
    preparer.current ??= new PrivateImagePreparation();
    setPreparing(true);
    try {
      const result = await preparer.current.prepare(
        sourceFile.current,
        turns,
        original.current.width,
        original.current.height,
        confirmedCrop,
      );
      if (attempt === preparationSequence.current) setPrepared(result);
    } catch (error) {
      if (attempt === preparationSequence.current)
        setPreparationError(
          error instanceof Error
            ? error.message
            : "No se pudo preparar la fotografía.",
        );
    } finally {
      if (attempt === preparationSequence.current) setPreparing(false);
    }
  }
  async function recognizePrepared() {
    if (!prepared || preparing || busy || recognizing) return;
    invalidateRecognition();
    const attempt = ++recognitionSequence.current;
    recognizer.current ??= new PrivateRegistrationRecognition();
    setRecognizing(true);
    try {
      const result = await recognizer.current.recognize(
        prepared,
        (progress) => {
          if (attempt === recognitionSequence.current)
            setRecognitionProgress(progress);
        },
      );
      if (attempt === recognitionSequence.current) setDraft(result);
    } catch (error) {
      if (attempt === recognitionSequence.current)
        setRecognitionError(
          error instanceof Error
            ? error.message
            : "No se pudo reconocer el padrón. Continúa manualmente.",
        );
    } finally {
      if (attempt === recognitionSequence.current) {
        setRecognizing(false);
        setRecognitionProgress(null);
      }
    }
  }
  function changeCrop(next: RegistrationCrop) {
    invalidatePreparation();
    setConfirmedCrop(null);
    setCrop(next);
  }
  function cancelCrop() {
    changeCrop({ ...FULL_REGISTRATION_CROP });
  }
  const plan = original.current
    ? registrationPreparationPlan(
        original.current.width,
        original.current.height,
        turns,
        crop,
      )
    : null;
  const warnings = original.current
    ? registrationImageWarnings(original.current.width, original.current.height)
    : [];
  return (
    <section className={styles.capture} aria-label="Captura privada del padrón">
      <button
        type="button"
        className="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Completar desde padrón
      </button>
      {open && (
        <div className={styles.content}>
          <p>
            Vista previa privada y temporal. La imagen no se enviará ni se
            adjuntará al vehículo o al Portal QR.
          </p>
          <p className={styles.notice}>
            Reconocimiento local opcional. Los candidatos se muestran solo para
            revisión y no rellenan ni guardan campos del vehículo.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => camera.current?.click()}
            >
              {preview ? "Tomar otra fotografía" : "Tomar fotografía"}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
            >
              {preview ? "Reemplazar imagen" : "Seleccionar imagen"}
            </button>
            <button type="button" className="button" onClick={cancel}>
              Cancelar captura
            </button>
          </div>
          <input
            ref={camera}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            aria-label="Fotografiar padrón"
            hidden
            onChange={select}
          />
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Seleccionar imagen del padrón"
            hidden
            onChange={select}
          />
          <small>
            JPG, PNG o WebP · hasta 12 MB y 24 megapíxeles. Si tu celular
            entrega HEIC, selecciona una copia JPG.
          </small>
          {busy && <p role="status">Preparando vista previa local…</p>}
          {error && <p role="alert">{error}</p>}
          {preview && (
            <div
              className={styles.actions}
              aria-label="Orientación de la fotografía"
            >
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => rotate(-1)}
              >
                Girar 90° a la izquierda
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => rotate(1)}
              >
                Girar 90° a la derecha
              </button>
              <button
                type="button"
                className="button"
                disabled={busy || turns === 0}
                onClick={() => rotate(-turns)}
              >
                Restaurar orientación original
              </button>
            </div>
          )}
          {preview && (
            <p role="status">
              Orientación aplicada: {turns * 90}°. Vista previa ligera; original
              conservado sin reducir resolución.
            </p>
          )}
          {preview && original.current && (
            <RegistrationCropEditor
              key={`${preview.url}:${turns}`}
              preview={preview}
              originalWidth={original.current.width}
              originalHeight={original.current.height}
              turns={turns}
              crop={crop}
              confirmed={Boolean(confirmedCrop)}
              disabled={busy}
              onChange={changeCrop}
              onCancel={cancelCrop}
              onConfirm={() => {
                invalidatePreparation();
                setConfirmedCrop({ ...crop });
              }}
            />
          )}
          {preview && plan && (
            <p role="status">
              Copia de trabajo prevista: {plan.output.width} ×{" "}
              {plan.output.height} px (máximo 3,2 MP).{" "}
              {plan.reduced
                ? "Esta copia reducirá la resolución del área seleccionada. El original no cambia."
                : "Sin ampliación ni reducción del área seleccionada."}{" "}
              Confirma que el rectángulo conserva todo el documento.
            </p>
          )}
          {preview && (
            <div
              className={styles.content}
              aria-label="Preparación privada de imagen"
            >
              {compatible === false ? (
                <p role="status">{PREPARATION_UNSUPPORTED}</p>
              ) : (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="button"
                    disabled={busy || preparing || !confirmedCrop}
                    onClick={prepareForRecognition}
                  >
                    {prepared
                      ? "Preparar nuevamente"
                      : "Preparar imagen para reconocimiento"}
                  </button>
                  {(preparing || prepared) && (
                    <button
                      type="button"
                      className="button"
                      onClick={invalidatePreparation}
                    >
                      Descartar preparación
                    </button>
                  )}
                </div>
              )}
              {preparing && (
                <p role="status">
                  Preparando imagen en segundo plano… Puedes cancelar, girar o
                  reemplazar la fotografía.
                </p>
              )}
              {prepared && (
                <p role="status">
                  Imagen preparada localmente: {prepared.width} ×{" "}
                  {prepared.height} px. Copia temporal; el reconocimiento no
                  aplica ni guarda datos. Se descartará al cambiar el recorte,
                  girar, reemplazar o cerrar.
                </p>
              )}
              {preparationError && <p role="alert">{preparationError}</p>}
              {prepared && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="button"
                    disabled={busy || preparing || recognizing}
                    onClick={recognizePrepared}
                  >
                    {draft
                      ? "Repetir reconocimiento local"
                      : "Reconocer padrón localmente"}
                  </button>
                  {(recognizing || draft) && (
                    <button
                      type="button"
                      className="button"
                      onClick={invalidateRecognition}
                    >
                      {recognizing
                        ? "Cancelar reconocimiento"
                        : "Descartar borrador"}
                    </button>
                  )}
                </div>
              )}
              {recognizing && (
                <p role="status">
                  {recognitionProgress?.phase === "RECOGNIZING"
                    ? "Reconociendo texto"
                    : "Cargando recursos locales spa + eng"}
                  … {recognitionProgress?.percent ?? 0} %. Puedes cancelar o
                  continuar manualmente.
                </p>
              )}
              {recognitionError && <p role="alert">{recognitionError}</p>}
              {draft && (
                <RegistrationRecognitionDraft
                  key={recognitionSequence.current}
                  draft={draft}
                  readForm={readForm}
                  applyFields={applyFields}
                />
              )}
            </div>
          )}
          {preview && warnings.length > 0 && (
            <ul
              className={styles.warnings}
              aria-label="Advertencias de calidad"
            >
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {preview && (
            <p className={styles.notice}>
              Revisa que el texto se vea nítido y sin reflejos. Estas
              comprobaciones no detectan desenfoque ni reflejos y no garantizan
              una lectura correcta.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
