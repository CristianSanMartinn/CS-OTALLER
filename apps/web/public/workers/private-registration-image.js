/* Private image preparation only: no OCR, upload, storage or document logging. */
"use strict";
let running = false,
  compatible = false;
try {
  const c = new OffscreenCanvas(1, 1);
  compatible =
    typeof createImageBitmap === "function" &&
    typeof c.convertToBlob === "function" &&
    Boolean(c.getContext("2d", { willReadFrequently: true }));
  c.width = c.height = 0;
} catch {
  compatible = false;
}
self.postMessage({ kind: "READY", compatible });
self.onmessage = async ({ data }) => {
  const id = data?.id;
  if (data?.kind !== "PREPARE" || !Number.isSafeInteger(id)) return;
  if (!compatible || running) {
    self.postMessage({
      kind: "ERROR",
      id,
      code: !compatible ? "UNSUPPORTED" : "BUSY",
    });
    return;
  }
  running = true;
  let bitmap, canvas;
  try {
    const p = data.plan,
      s = p?.source,
      out = p?.output,
      t = p?.turns;
    const integer = (n) => Number.isInteger(n) && n > 0;
    if (
      !(data.file instanceof Blob) ||
      !data.file.size ||
      data.file.size > 12 * 1024 * 1024 ||
      !p ||
      !s ||
      !out ||
      !integer(p.originalWidth) ||
      !integer(p.originalHeight) ||
      Math.max(p.originalWidth, p.originalHeight) > 12000 ||
      p.originalWidth * p.originalHeight > 24_000_000 ||
      !Number.isInteger(t) ||
      t < 0 ||
      t > 3 ||
      !integer(s.width) ||
      !integer(s.height) ||
      !Number.isInteger(s.left) ||
      !Number.isInteger(s.top) ||
      s.left < 0 ||
      s.top < 0 ||
      s.left + s.width > p.originalWidth ||
      s.top + s.height > p.originalHeight ||
      !integer(out.width) ||
      !integer(out.height) ||
      out.width * out.height > 3_200_000
    )
      throw new Error("invalid");
    const cw = t % 2 ? s.height : s.width,
      ch = t % 2 ? s.width : s.height;
    if (
      out.width > cw ||
      out.height > ch ||
      Math.abs(out.width * ch - out.height * cw) > cw + ch
    )
      throw new Error("ratio");
    const decodeWidth = t % 2 ? out.height : out.width,
      decodeHeight = t % 2 ? out.width : out.height;
    // Decode once with metadata orientation, then crop through drawImage.
    // Avoid createImageBitmap sub-rectangle coordinates on EXIF-oriented sources.
    bitmap = await createImageBitmap(data.file, {
      imageOrientation: "from-image",
    });
    if (bitmap.width !== p.originalWidth || bitmap.height !== p.originalHeight)
      throw new Error("originalDimensions");
    canvas = new OffscreenCanvas(out.width, out.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("context");
    context.imageSmoothingEnabled =
      decodeWidth !== s.width || decodeHeight !== s.height;
    context.imageSmoothingQuality = "high";
    if (t === 1) context.translate(out.width, 0);
    else if (t === 2) context.translate(out.width, out.height);
    else if (t === 3) context.translate(0, out.height);
    context.rotate((t * Math.PI) / 2);
    context.drawImage(
      bitmap,
      s.left,
      s.top,
      s.width,
      s.height,
      0,
      0,
      decodeWidth,
      decodeHeight,
    );
    bitmap.close();
    bitmap = undefined;
    const blob = await canvas.convertToBlob({ type: "image/png" });
    canvas.width = canvas.height = 0;
    self.postMessage({
      kind: "RESULT",
      id,
      blob,
      width: out.width,
      height: out.height,
    });
  } catch {
    self.postMessage({ kind: "ERROR", id, code: "PREPARATION_FAILED" });
  } finally {
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0;
    running = false;
  }
};
