export const MAX_REGISTRATION_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;

export async function preparePrivateRegistrationImage(file: File) {
  if (!file.size || file.size > MAX_REGISTRATION_IMAGE_BYTES)
    throw new Error("Selecciona una fotografía de hasta 12 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes[0] === 82 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 70 &&
    bytes[8] === 87 &&
    bytes[9] === 69 &&
    bytes[10] === 66 &&
    bytes[11] === 80;
  const mime = png
    ? "image/png"
    : jpeg
      ? "image/jpeg"
      : webp
        ? "image/webp"
        : "";
  if (!mime || (file.type && file.type !== mime))
    throw new Error(
      "Usa una fotografía JPG, PNG o WebP válida. HEIC, PDF, SVG y GIF no están admitidos en este bloque.",
    );
  const url = URL.createObjectURL(file);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const image = new Image();
  try {
    image.src = url;
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("timeout")), 10000);
      }),
    ]);
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      Math.max(image.naturalWidth, image.naturalHeight) > 12000 ||
      image.naturalWidth * image.naturalHeight > MAX_PIXELS
    )
      throw new Error("dimensions");
    return { url, width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      "No se pudo abrir la fotografía. Usa una imagen legible de hasta 24 megapíxeles y 12.000 píxeles por lado.",
    );
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    image.src = "";
  }
}

export type PrivateRegistrationImage = {
  url: string;
  width: number;
  height: number;
};

export function registrationImageWarnings(
  width: number,
  height: number,
): string[] {
  const warnings: string[] = [];
  const shorter = Math.min(width, height),
    longer = Math.max(width, height);
  if (longer < 1600 || shorter < 900)
    warnings.push(
      "La resolución puede ser insuficiente para leer texto pequeño. Acerca el padrón y repite la fotografía sin cortar sus bordes.",
    );
  if (longer / Math.max(1, shorter) > 3.5)
    warnings.push(
      "La imagen es muy alargada. Comprueba que incluya el documento completo y que no sea un recorte estrecho.",
    );
  if (width * height >= 12000000)
    warnings.push(
      "Esta imagen es grande y puede consumir bastante memoria al preparar la vista previa o una futura lectura en el celular. Si el dispositivo se ralentiza, repite la captura con resolución normal.",
    );
  return warnings;
}

// UI-only thumbnail. Never use this reduced image as input for OCR.
export async function createPrivateRegistrationPreview(
  original: PrivateRegistrationImage,
): Promise<PrivateRegistrationImage> {
  if (Math.max(original.width, original.height) <= 1024) return original;
  return renderPrivateRegistrationImage(original, 0, 1024);
}

// Deferred full-resolution rendering for a future OCR action, not UI rotation.
// Always render from the original, never from a previously encoded rotation.
export async function rotatePrivateRegistrationImage(
  original: PrivateRegistrationImage,
  quarterTurns: number,
): Promise<PrivateRegistrationImage> {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (!Number.isInteger(quarterTurns))
    throw new Error("El giro debe realizarse en pasos de 90°.");
  if (turns === 0) return original;
  return renderPrivateRegistrationImage(original, turns);
}

async function renderPrivateRegistrationImage(
  original: PrivateRegistrationImage,
  turns: number,
  maxDimension?: number,
): Promise<PrivateRegistrationImage> {
  const image = new Image();
  const canvas = document.createElement("canvas");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    image.src = original.url;
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("timeout")), 10000);
      }),
    ]);
    const scale = maxDimension
      ? Math.min(1, maxDimension / Math.max(original.width, original.height))
      : 1;
    const width = Math.max(1, Math.round(original.width * scale));
    const height = Math.max(1, Math.round(original.height * scale));
    canvas.width = turns % 2 ? height : width;
    canvas.height = turns % 2 ? width : height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.imageSmoothingEnabled = scale !== 1;
    if (turns === 1) context.translate(canvas.width, 0);
    else if (turns === 2) context.translate(canvas.width, canvas.height);
    else if (turns === 3) context.translate(0, canvas.height);
    context.rotate((turns * Math.PI) / 2);
    if (scale === 1) context.drawImage(image, 0, 0);
    else context.drawImage(image, 0, 0, width, height);
    if (timeout !== undefined) clearTimeout(timeout);
    const blob = await Promise.race([
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("encoding"))),
          "image/png",
        ),
      ),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("timeout")), 15000);
      }),
    ]);
    return {
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    throw new Error(
      "No se pudo preparar la fotografía. La imagen anterior se conserva; prueba con otra captura si falta memoria.",
    );
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    image.src = "";
    canvas.width = 0;
    canvas.height = 0;
  }
}
