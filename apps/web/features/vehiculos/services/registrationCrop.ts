export type RegistrationCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export const FULL_REGISTRATION_CROP: RegistrationCrop = {
  left: 0,
  top: 0,
  width: 1,
  height: 1,
};
export const MAX_REGISTRATION_WORK_PIXELS = 3_200_000;

export function fitRegistrationCrop(crop: RegistrationCrop): RegistrationCrop {
  const width = Math.max(0.01, Math.min(1, crop.width));
  const height = Math.max(0.01, Math.min(1, crop.height));
  return {
    left: Math.max(0, Math.min(1 - width, crop.left)),
    top: Math.max(0, Math.min(1 - height, crop.top)),
    width,
    height,
  };
}

// Coordinates refer to the EXIF-normalized raster, then the chosen clockwise turn.
export function registrationPreparationPlan(
  width: number,
  height: number,
  turns: number,
  crop: RegistrationCrop,
) {
  if (
    ![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 12000) ||
    width * height > 24_000_000 ||
    !Number.isInteger(turns) ||
    turns < 0 ||
    turns > 3 ||
    !crop ||
    ![crop.left, crop.top, crop.width, crop.height].every(Number.isFinite) ||
    crop.left < 0 ||
    crop.top < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.left + crop.width > 1 + 1e-10 ||
    crop.top + crop.height > 1 + 1e-10
  )
    throw new Error("El área de recorte o las dimensiones no son válidas.");
  const orientedWidth = turns % 2 ? height : width;
  const orientedHeight = turns % 2 ? width : height;
  // Enclose fractional edges rather than discarding a strip of the document.
  const x0 = Math.floor(crop.left * orientedWidth),
    y0 = Math.floor(crop.top * orientedHeight);
  const x1 = Math.min(
    orientedWidth,
    Math.ceil((crop.left + crop.width) * orientedWidth),
  );
  const y1 = Math.min(
    orientedHeight,
    Math.ceil((crop.top + crop.height) * orientedHeight),
  );
  const cw = x1 - x0,
    ch = y1 - y0;
  if (cw <= 0 || ch <= 0)
    throw new Error("El área de recorte no contiene píxeles.");
  const source =
    turns === 0
      ? { left: x0, top: y0, width: cw, height: ch }
      : turns === 1
        ? { left: y0, top: height - x1, width: ch, height: cw }
        : turns === 2
          ? { left: width - x1, top: height - y1, width: cw, height: ch }
          : { left: width - y1, top: x0, width: ch, height: cw };
  const scale = Math.min(
    1,
    Math.sqrt(MAX_REGISTRATION_WORK_PIXELS / (cw * ch)),
  );
  const output = {
    width: Math.max(1, Math.floor(cw * scale)),
    height: Math.max(1, Math.floor(ch * scale)),
  };
  return {
    originalWidth: width,
    originalHeight: height,
    turns,
    source,
    output,
    reduced: output.width < cw || output.height < ch,
  };
}
