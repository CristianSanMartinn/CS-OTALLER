export type ImageOptions = { maxBytes?: number; maxDimension?: number };
export async function optimizeImage(
  file: File,
  { maxBytes = 180000, maxDimension = 1600 }: ImageOptions = {},
) {
  if (file.size > 30 * 1024 * 1024)
    throw new Error("Selecciona una imagen de hasta 30 MB.");
  if (!file.type.startsWith("image/"))
    throw new Error("Selecciona un archivo de imagen.");
  const url = URL.createObjectURL(file);
  const picture = new Image();
  try {
    picture.src = url;
    await picture.decode();
    let scale = Math.min(
      1,
      maxDimension / Math.max(picture.naturalWidth, picture.naturalHeight),
    );
    const canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la fotografía.");
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(picture, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("No se pudo optimizar la imagen.")),
          "image/jpeg",
          Math.max(0.45, 0.85 - attempt * 0.08),
        ),
      );
      if (blob.size <= maxBytes)
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("No se pudo leer la imagen."));
          reader.readAsDataURL(blob);
        });
      scale *= 0.8;
    }
    throw new Error(
      "No se pudo optimizar esta imagen. Prueba con otra fotografía.",
    );
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message.includes("imagen")
        ? e.message
        : "No se pudo abrir la fotografía. Usa JPG, PNG o WebP.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
