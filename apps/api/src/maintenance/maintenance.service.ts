import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AuthUser } from "../auth/auth.types.js";
import { bodyObject, text } from "../common/validation.js";
import { amount, date, reference, activity } from "../common/operations.js";
@Injectable()
export class MaintenanceService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(u: AuthUser) {
    const r = await this.db.query(
      `SELECT m.*,m.maintenance_date::text AS day,m.next_date::text AS next_day,o.oil_type,o.viscosity,o.oil_brand,o.liters_used,o.filter_name,o.filter_brand FROM maintenance_records m LEFT JOIN oil_change_details o ON o.maintenance_id=m.id AND o.workshop_id=m.workshop_id WHERE m.workshop_id=$1 AND ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM work_orders w WHERE w.workshop_id=m.workshop_id AND w.vehicle_id=m.vehicle_id AND w.mechanic_id=$2)) ORDER BY m.maintenance_date DESC,m.created_at DESC`,
      [u.workshopId, u.role === "ADMIN" ? null : u.id],
    );
    return r.rows.map((x) => ({
      id: x.id,
      workshopId: x.workshop_id,
      vehicleId: x.vehicle_id,
      orderId: x.work_order_id ?? "",
      mechanicId: x.mechanic_id ?? "",
      type: x.maintenance_type,
      mileage: x.mileage,
      oilType: x.oil_type ?? "",
      viscosity: x.viscosity ?? "",
      brand: x.oil_brand ?? "",
      quantity: Number(x.liters_used ?? 0),
      filter: x.filter_name ?? "",
      filterBrand: x.filter_brand ?? "",
      date: x.day,
      nextMileage: x.next_mileage ?? 0,
      nextDate: x.next_day ?? "",
      notes: x.observations ?? "",
    }));
  }
  async create(u: AuthUser, body: unknown) {
    const b = bodyObject(body, [
      "vehicleId",
      "orderId",
      "mechanicId",
      "type",
      "mileage",
      "oilType",
      "viscosity",
      "brand",
      "quantity",
      "filter",
      "filterBrand",
      "date",
      "nextMileage",
      "nextDate",
      "notes",
    ]);
    const day = date(b.date, "fecha"),
      next = date(b.nextDate, "próxima fecha"),
      mileage = amount(b.mileage, "kilometraje", true, 0, 2147483647),
      nextMileage = amount(
        b.nextMileage,
        "próximo kilometraje",
        true,
        0,
        2147483647,
      );
    if (next <= day || nextMileage <= mileage)
      throw new BadRequestException(
        "La próxima mantención debe ser posterior en fecha y kilometraje.",
      );
    const type = text(b, "type", 100, true),
      notes = text(b, "notes", 20000),
      oil = text(b, "oilType", 100),
      viscosity = text(b, "viscosity", 50),
      brand = text(b, "brand", 100),
      filter = text(b, "filter", 150),
      filterBrand = text(b, "filterBrand", 100),
      quantity = amount(b.quantity, "cantidad de aceite", false, 0, 100);
    return this.db.transaction(async (c) => {
      const v = await reference(c, "vehicles", b.vehicleId, u.workshopId);
      await c.query(
        "SELECT id FROM vehicles WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
        [v.id, u.workshopId],
      );
      const current = await reference(c, "vehicles", v.id, u.workshopId);
      if (mileage < current.mileage)
        throw new BadRequestException(
          "El kilometraje no puede ser menor al último registrado.",
        );
      await reference(c, "users", b.mechanicId, u.workshopId);
      if (b.orderId) {
        const order = await reference(
          c,
          "work_orders",
          b.orderId,
          u.workshopId,
        );
        if (u.role === "WORKER" && order.mechanic_id !== u.id)
          throw new ForbiddenException("Orden no asignada.");
        if (order.vehicle_id !== b.vehicleId)
          throw new BadRequestException(
            "La orden corresponde a otro vehículo.",
          );
      }
      if (u.role === "WORKER") {
        if (b.mechanicId !== u.id)
          throw new ForbiddenException("Mecánico inválido.");
        const assigned = await c.query(
          "SELECT id FROM work_orders WHERE workshop_id=$1 AND vehicle_id=$2 AND mechanic_id=$3",
          [u.workshopId, b.vehicleId, u.id],
        );
        if (!assigned.rows[0])
          throw new ForbiddenException("Vehículo no asignado.");
      }
      const r = await c.query(
        "INSERT INTO maintenance_records(workshop_id,vehicle_id,work_order_id,mechanic_id,maintenance_type,maintenance_date,mileage,next_mileage,next_date,observations) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
        [
          u.workshopId,
          b.vehicleId,
          b.orderId || null,
          b.mechanicId,
          type,
          day,
          mileage,
          nextMileage,
          next,
          notes,
        ],
      );
      const id = r.rows[0].id;
      if (type === "Cambio de aceite")
        await c.query(
          "INSERT INTO oil_change_details(workshop_id,maintenance_id,oil_type,viscosity,oil_brand,liters_used,filter_installed,filter_name,filter_brand) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            u.workshopId,
            id,
            oil,
            viscosity,
            brand,
            quantity,
            Boolean(filter),
            filter,
            filterBrand,
          ],
        );
      await c.query(
        "UPDATE vehicles SET mileage=GREATEST(mileage,$1),updated_at=now() WHERE id=$2 AND workshop_id=$3",
        [mileage, b.vehicleId, u.workshopId],
      );
      await activity(
        c,
        u.workshopId,
        u.id,
        "maintenance",
        id,
        type + " registrada",
      );
      return { id };
    });
  }
}
