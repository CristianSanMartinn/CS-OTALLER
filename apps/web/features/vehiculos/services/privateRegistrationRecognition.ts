import type { PreparedRegistrationImage } from "./privateImagePreparation";
import {
  extractRegistrationDraft,
  type OcrWord,
  type RegistrationExtractionDraft,
} from "./registrationExtraction";
const RESOURCE_ROOT = "/ocr/tesseract-7.0.0";
const OCR_ERROR =
  "No se pudo reconocer el padrón en este dispositivo. Repite la captura o continúa con el registro manual.";
export type RecognitionProgress = {
  phase: "LOADING" | "RECOGNIZING";
  percent: number;
};
// This small adapter uses the pinned 7.0.0 worker protocol (load → languages → init → recognize).
// Owning the native Worker permits termination even DURING language/core initialization.
export class PrivateRegistrationRecognition {
  private sequence = 0;
  private active: {
    worker: Worker;
    timer: ReturnType<typeof setTimeout>;
    reject: (e: Error) => void;
  } | null = null;
  cancel() {
    this.sequence++;
    const active = this.active;
    this.active = null;
    if (active) {
      clearTimeout(active.timer);
      active.worker.onmessage = null;
      active.worker.onerror = null;
      active.worker.onmessageerror = null;
      active.worker.terminate();
      active.reject(new Error("OCR_CANCELLED"));
    }
  }
  recognize(
    image: PreparedRegistrationImage,
    onProgress: (p: RecognitionProgress) => void = () => {},
  ): Promise<RegistrationExtractionDraft> {
    this.cancel();
    if (typeof Worker !== "function" || typeof WebAssembly !== "object")
      return Promise.reject(new Error(OCR_ERROR));
    if (
      !(image.blob instanceof Blob) ||
      image.blob.type !== "image/png" ||
      !image.blob.size ||
      image.blob.size > 16 * 1024 * 1024 ||
      ![image.width, image.height].every((v) => Number.isInteger(v) && v > 0) ||
      image.width * image.height > 3_200_000
    )
      return Promise.reject(new Error(OCR_ERROR));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker("/workers/private-registration-ocr.js");
      } catch {
        reject(new Error(OCR_ERROR));
        return;
      }
      const current = () =>
        id === this.sequence && this.active?.worker === worker;
      const finish = (error?: string, draft?: RegistrationExtractionDraft) => {
        if (!current()) return;
        const active = this.active!;
        this.active = null;
        clearTimeout(active.timer);
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
        if (error) reject(new Error(error));
        else if (draft) resolve(draft);
      };
      const timer = setTimeout(
        () =>
          finish(
            "El reconocimiento superó el tiempo disponible. Puedes repetirlo o continuar manualmente.",
          ),
        90000,
      );
      this.active = { worker, timer, reject };
      let stage = "load";
      const send = (
        action: string,
        payload: unknown,
        transfer: Transferable[] = [],
      ) => {
        if (!current()) return;
        stage = action;
        try {
          worker.postMessage(
            {
              workerId: `private-${id}`,
              jobId: `${id}-${action}`,
              action,
              payload,
            },
            transfer,
          );
        } catch {
          finish(OCR_ERROR);
        }
      };
      worker.onmessage = async ({ data }) => {
        if (
          !current() ||
          data?.workerId !== `private-${id}` ||
          data.jobId !== `${id}-${stage}`
        )
          return;
        if (data.status === "progress") {
          const progress = Number(data.data?.progress);
          if (Number.isFinite(progress))
            onProgress({
              phase: stage === "recognize" ? "RECOGNIZING" : "LOADING",
              percent: Math.round(Math.max(0, Math.min(1, progress)) * 100),
            });
          return;
        }
        if (data.status === "reject") {
          finish(OCR_ERROR);
          return;
        }
        if (data.status !== "resolve") return;
        if (stage === "load")
          send("loadLanguage", {
            langs: "spa+eng",
            options: {
              langPath: RESOURCE_ROOT + "/languages",
              cacheMethod: "none",
              gzip: true,
              lstmOnly: true,
            },
          });
        else if (stage === "loadLanguage")
          send("initialize", { langs: "spa+eng", oem: 1, config: {} });
        else if (stage === "initialize")
          send("setParameters", {
            params: { tessedit_pageseg_mode: "3", user_defined_dpi: "300" },
          });
        else if (stage === "setParameters") {
          // Transfer encoded PNG bytes; never base64 or an additional canvas on the UI thread.
          stage = "reading";
          try {
            const buffer = await image.blob.arrayBuffer();
            if (current())
              send(
                "recognize",
                {
                  image: new Uint8Array(buffer),
                  options: {},
                  output: {
                    text: false,
                    blocks: true,
                    hocr: false,
                    tsv: false,
                    pdf: false,
                    debug: false,
                    imageColor: false,
                    imageGrey: false,
                    imageBinary: false,
                  },
                },
                [buffer],
              );
          } catch {
            finish(OCR_ERROR);
          }
        } else if (stage === "recognize") {
          try {
            const words: OcrWord[] = [];
            for (const block of data.data?.blocks ?? [])
              for (const paragraph of block.paragraphs ?? [])
                for (const line of paragraph.lines ?? [])
                  for (const word of line.words ?? []) {
                    if (words.length >= 4000) throw new Error("DOCUMENT_LIMIT");
                    words.push({
                      text: word.text,
                      confidence: word.confidence,
                      bbox: word.bbox,
                    });
                  }
            const draft = extractRegistrationDraft(words);
            // No raw OCR text/blocks escape this method or get retained as state.
            data.data = null;
            words.length = 0;
            finish(undefined, draft);
          } catch {
            finish(OCR_ERROR);
          }
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        finish(OCR_ERROR);
      };
      worker.onmessageerror = () => finish(OCR_ERROR);
      onProgress({ phase: "LOADING", percent: 0 });
      send("load", {
        options: {
          lstmOnly: true,
          corePath: RESOURCE_ROOT + "/core",
          logging: false,
        },
      });
    });
  }
}
