import { customerPhotos } from "../common/media.js";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { bodyObject, text, uuid } from "../common/validation.js";
import { AuthUser } from "../auth/auth.types.js";
@Injectable()
export class VehiclesService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(user: AuthUser) {
    return (
      await this.db.query(
        "SELECT v.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'url',p.file_url,'category',p.category,'description',COALESCE(p.description,''),'date',COALESCE(p.taken_at,p.created_at),'userId',p.uploaded_by)) FROM photos p WHERE p.workshop_id=v.workshop_id AND p.vehicle_id=v.id AND p.work_order_id IS NULL),'[]') AS photos FROM vehicles v WHERE v.workshop_id=$1 AND v.active AND ($2::boolean OR EXISTS(SELECT 1 FROM work_orders o WHERE o.vehicle_id=v.id AND o.workshop_id=v.workshop_id AND o.mechanic_id=$3)) ORDER BY v.created_at DESC",
        [user.workshopId, user.role === "ADMIN", user.id],
      )
    ).rows;
  }
  async save(workshopId: string, body: unknown, id?: string, actorId = "") {
    const b = bodyObject(body, [
      "customer_id",
      "license_plate",
      "brand",
      "model",
      "version",
      "year",
      "vin",
      "engine",
      "fuel_type",
      "transmission",
      "mileage",
      "color",
      "photos",
    ]);
    const customerId = uuid(text(b, "customer_id", 36, true));
    const plate = text(b, "license_plate", 20, true)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!plate) throw new BadRequestException("Ingresa una patente válida.");
    const year = b.year,
      mileage = b.mileage;
    if (
      !Number.isInteger(year) ||
      Number(year) < 1900 ||
      Number(year) > new Date().getFullYear() + 1
    )
      throw new BadRequestException("Año inválido.");
    if (
      !Number.isInteger(mileage) ||
      Number(mileage) < 0 ||
      Number(mileage) > 2147483647
    )
      throw new BadRequestException("Kilometraje inválido.");
    const owner = await this.db.query(
      "SELECT id FROM customers WHERE id=$1 AND workshop_id=$2 AND active",
      [customerId, workshopId],
    );
    if (!owner.rows[0])
      throw new BadRequestException("El propietario no pertenece a tu taller.");
    const values = [
      customerId,
      plate,
      text(b, "brand", 100, true),
      text(b, "model", 100, true),
      text(b, "version", 100),
      year,
      text(b, "vin", 50),
      text(b, "engine", 100),
      text(b, "fuel_type", 50),
      text(b, "transmission", 50),
      mileage,
      text(b, "color", 50),
      workshopId,
    ];
    try {
      if (id) {
        const current = await this.db.query(
          "SELECT mileage FROM vehicles WHERE id=$1 AND workshop_id=$2",
          [uuid(id), workshopId],
        );
        if (current.rows[0] && Number(mileage) < current.rows[0].mileage)
          throw new BadRequestException("El kilometraje no puede disminuir.");
      }
      const sql = id
        ? "UPDATE vehicles SET customer_id=$1,license_plate=$2,brand=$3,model=$4,version=$5,year=$6,vin=$7,engine=$8,fuel_type=$9,transmission=$10,mileage=$11,color=$12,updated_at=now() WHERE workshop_id=$13 AND id=$14 AND active RETURNING *"
        : "INSERT INTO vehicles (customer_id,license_plate,brand,model,version,year,vin,engine,fuel_type,transmission,mileage,color,workshop_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *";

      return this.db.transaction(async (c) => {
        if (id) {
          const locked = (
            await c.query(
              "SELECT mileage FROM vehicles WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
              [uuid(id), workshopId],
            )
          ).rows[0];
          if (locked && Number(mileage) < locked.mileage)
            throw new BadRequestException("El kilometraje no puede disminuir.");
        }
        const r = await c.query(sql, id ? [...values, uuid(id)] : values);
        if (!r.rows[0])
          throw new NotFoundException("Vehículo no encontrado en tu taller.");
        const v = r.rows[0];
        const previous = (
          await c.query(
            'SELECT id,file_url AS url,category,description,COALESCE(taken_at,created_at) AS date,uploaded_by AS "userId" FROM photos WHERE workshop_id=$1 AND vehicle_id=$2 AND work_order_id IS NULL',
            [workshopId, v.id],
          )
        ).rows;
        if (b.photos !== undefined) {
          const photos = customerPhotos(b.photos, actorId, previous);
          await c.query(
            "DELETE FROM photos WHERE workshop_id=$1 AND vehicle_id=$2 AND work_order_id IS NULL",
            [workshopId, v.id],
          );
          for (const p of photos)
            await c.query(
              "INSERT INTO photos(id,workshop_id,vehicle_id,uploaded_by,file_url,category,description,taken_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
              [
                p.id,
                workshopId,
                v.id,
                p.userId || null,
                p.url,
                p.category,
                p.description,
                p.date,
              ],
            );
          v.photos = photos;
        } else v.photos = previous;
        return v;
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new ConflictException(
          "Esta patente ya está registrada en tu taller.",
        );
      if ((e as { code?: string }).code === "23503")
        throw new BadRequestException("Propietario inválido.");
      throw e;
    }
  }
}
