import { BadRequestException } from "@nestjs/common";
import { array, choice } from "./operations.js";
import { text, uuid, bodyObject } from "./validation.js";
export function customerPhotos(
  value: unknown,
  userId: string,
  previous: any[] = [],
) {
  const list = array(value, "fotografías", 20);
  let size = 0;
  const result = list.map((p) => {
    bodyObject(p, ["id", "url", "category", "description", "date", "userId"]);
    const id = uuid(text(p, "id", 36, true)),
      url = text(p, "url", 1500000, true),
      category = choice(p.category, ["BEFORE", "DURING", "AFTER"], "Categoría"),
      description = text(p, "description", 1000);
    if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url))
      throw new BadRequestException("Fotografía inválida.");
    if (typeof p.date !== "string" || !Number.isFinite(Date.parse(p.date)))
      throw new BadRequestException("Fecha inválida.");
    size += url.length;
    return {
      id,
      url,
      category,
      description,
      date: p.date,
      userId: previous.find((x) => x.id === id)?.userId ?? userId,
    };
  });
  if (size > 1500000)
    throw new BadRequestException(
      "Las fotografías superan el tamaño disponible de la ficha.",
    );
  return result;
}
