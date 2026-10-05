import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AuthUser } from "../auth/auth.types.js";
import { bodyObject, text, uuid } from "../common/validation.js";
import {
  amount,
  array,
  choice,
  date,
  time,
  reference,
  activity,
} from "../common/operations.js";
import { codeStates, serviceStates, mapOrder } from "./order.mapping.js";
const states = [
  "RECEIVED",
  "DIAGNOSIS",
  "WAITING_PARTS",
  "IN_REPAIR",
  "READY",
  "DELIVERED",
  "CANCELLED",
];
const transitions: Record<string, string[]> = {
  RECEIVED: ["DIAGNOSIS"],
  DIAGNOSIS: ["WAITING_PARTS", "IN_REPAIR"],
  WAITING_PARTS: ["IN_REPAIR"],
  IN_REPAIR: ["WAITING_PARTS", "READY"],
  READY: [],
  DELIVERED: [],
  CANCELLED: [],
};
@Injectable()
export class WorkOrdersService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(user: AuthUser) {
    const r = await this.db.query(
      `SELECT o.*,to_char(o.entry_date AT TIME ZONE 'America/Santiago','YYYY-MM-DD') AS entry_day,to_char(o.entry_date AT TIME ZONE 'America/Santiago','HH24:MI') AS entry_time,
 COALESCE((SELECT jsonb_agg(s ORDER BY s.created_at,s.id) FROM scanner_codes s WHERE s.work_order_id=o.id AND s.workshop_id=o.workshop_id),'[]') AS codes,
 COALESCE((SELECT jsonb_agg(s ORDER BY s.created_at,s.id) FROM work_order_services s WHERE s.work_order_id=o.id AND s.workshop_id=o.workshop_id),'[]') AS services,
 COALESCE((SELECT jsonb_agg(s ORDER BY s.created_at,s.id) FROM work_order_parts s WHERE s.work_order_id=o.id AND s.workshop_id=o.workshop_id),'[]') AS parts,
 COALESCE((SELECT jsonb_agg(s ORDER BY s.created_at,s.id) FROM photos s WHERE s.work_order_id=o.id AND s.workshop_id=o.workshop_id),'[]') AS photos
 FROM work_orders o WHERE o.workshop_id=$1 AND ($2::uuid IS NULL OR o.mechanic_id=$2 OR o.assignment_type='TEAM') ORDER BY o.entry_date DESC,o.created_at DESC`,
      [user.workshopId, user.role === "ADMIN" ? null : user.id],
    );
    return r.rows.map((x) => mapOrder(x, user.role === "ADMIN"));
  }
  async save(user: AuthUser, body: unknown, id?: string) {
    const input = bodyObject(body, [
      "customerId",
      "vehicleId",
      "mechanicId",
      "assignmentType",
      "expectedUpdatedAt",
      "date",
      "time",
      "mileage",
      "reason",
      "symptoms",
      "diagnosis",
      "findings",
      "observations",
      "status",
      "codes",
      "services",
      "parts",
      "photos",
    ]);
    if (id) uuid(id);
    const day = date(input.date, "fecha"),
      hour = time(input.time),
      mileage = amount(input.mileage, "kilometraje", true, 0, 2147483647),
      status = choice(input.status, states, "Estado");
    const reason = text(input, "reason", 20000, true),
      symptoms = text(input, "symptoms", 20000),
      diagnosis = text(input, "diagnosis", 20000),
      findings = text(input, "findings", 20000),
      observations = text(input, "observations", 20000);
    const codes = array(input.codes, "scanner"),
      services = array(input.services, "servicios"),
      parts = array(input.parts, "repuestos"),
      photos = array(input.photos, "fotografías", 20);
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        user.workshopId,
      ]);
      let previous: any;
      if (id) {
        previous = (
          await c.query(
            "SELECT * FROM work_orders WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
            [id, user.workshopId],
          )
        ).rows[0];
        if (
          !previous ||
          (user.role === "WORKER" && previous.assignment_type !== "TEAM" && previous.mechanic_id !== user.id)
        )
          throw new NotFoundException("Orden no encontrada o sin acceso.");
      }
      const assignmentType = choice(input.assignmentType ?? previous?.assignment_type ?? "INDIVIDUAL", ["INDIVIDUAL", "TEAM"], "Asignación");
      const mechanicId = assignmentType === "TEAM" ? null : uuid(text(input, "mechanicId", 36, true));
      if (assignmentType === "TEAM" && text(input, "mechanicId", 36)) throw new BadRequestException("Una orden compartida no lleva mecánico exclusivo.");
      if (previous && (previous.assignment_type === "TEAM" || input.expectedUpdatedAt !== undefined) && (!input.expectedUpdatedAt || Date.parse(String(input.expectedUpdatedAt)) !== new Date(previous.updated_at).getTime())) throw new ConflictException("Otra persona actualizó esta orden. Recarga la ficha antes de guardar.");
      const vehicle = await reference(
        c,
        "vehicles",
        input.vehicleId,
        user.workshopId,
      );
      await reference(c, "customers", input.customerId, user.workshopId);
      if (mechanicId) await reference(c, "users", mechanicId, user.workshopId);
      if (vehicle.customer_id !== input.customerId)
        throw new BadRequestException("El vehículo no corresponde al cliente.");
      if (
        mileage < vehicle.mileage &&
        (!previous || mileage !== previous.mileage)
      )
        throw new BadRequestException(
          "El kilometraje no puede ser menor al último registrado.",
        );
      if (user.role === "WORKER") {
        if (previous ? assignmentType !== previous.assignment_type || mechanicId !== previous.mechanic_id : assignmentType === "TEAM" || mechanicId !== user.id)
          throw new ForbiddenException(
            "Solo puedes trabajar tus vehículos asignados.",
          );
        if (
          previous &&
          (previous.customer_id !== input.customerId ||
            previous.vehicle_id !== input.vehicleId)
        )
          throw new ForbiddenException(
            "No puedes cambiar el vehículo o cliente de esta orden.",
          );
        if (
          previous &&
          status !== previous.status &&
          !transitions[previous.status].includes(status)
        )
          throw new ForbiddenException(
            "No tienes permiso para cambiar a ese estado.",
          );
        if (!previous) {
          if (status !== "RECEIVED")
            throw new ForbiddenException(
              "La ficha debe iniciar como recibida.",
            );
          const assigned = await c.query(
            "SELECT id FROM work_orders WHERE workshop_id=$1 AND vehicle_id=$2 AND (mechanic_id=$3 OR assignment_type='TEAM')",
            [user.workshopId, input.vehicleId, user.id],
          );
          if (!assigned.rows[0])
            throw new ForbiddenException("Vehículo no asignado.");
        }
      }
      if (
        (status === "CANCELLED" && previous?.status !== "CANCELLED") ||
        (previous?.status === "CANCELLED" && status !== "CANCELLED")
      )
        throw new BadRequestException(
          "Utiliza Cancelar visita e indica el motivo. Una orden cancelada debe conservar su estado.",
        );
      const oldServices = previous
        ? (
            await c.query(
              "SELECT id,price FROM work_order_services WHERE work_order_id=$1 AND workshop_id=$2",
              [id, user.workshopId],
            )
          ).rows
        : [];
      const oldPhotos = previous
        ? (
            await c.query(
              "SELECT id,uploaded_by FROM photos WHERE work_order_id=$1 AND workshop_id=$2",
              [id, user.workshopId],
            )
          ).rows
        : [];
      const oldParts = previous
        ? (
            await c.query(
              "SELECT id,unit_price FROM work_order_parts WHERE work_order_id=$1 AND workshop_id=$2",
              [id, user.workshopId],
            )
          ).rows
        : [];
      let labor = 0,
        partsTotal = 0;
      for (const s of services) {
        bodyObject(s, [
          "id",
          "name",
          "description",
          "mechanicId",
          "price",
          "status",
        ]);
        uuid(text(s, "id", 36, true));
        text(s, "name", 150, true);
        text(s, "description", 20000);
        choice(s.status, Object.keys(serviceStates), "Estado del servicio");
        s.mechanicId = text(s, "mechanicId", 36);
        if (s.mechanicId) await reference(c, "users", s.mechanicId, user.workshopId);
        else if (assignmentType !== "TEAM") throw new BadRequestException("Selecciona el mecánico del servicio.");
        s.price =
          user.role === "ADMIN"
            ? amount(s.price, "precio")
            : Number(oldServices.find((x) => x.id === s.id)?.price ?? 0);
        labor += Number(s.price);
      }
      for (const p of parts) {
        bodyObject(p, [
          "id",
          "name",
          "brand",
          "partNumber",
          "quantity",
          "price",
          "notes",
        ]);
        uuid(text(p, "id", 36, true));
        text(p, "name", 150, true);
        text(p, "brand", 100);
        text(p, "partNumber", 100);
        text(p, "notes", 20000);
        amount(p.quantity, "cantidad", true, 1, 100000);
        p.price =
          user.role === "ADMIN"
            ? amount(p.price, "precio")
            : Number(oldParts.find((x) => x.id === p.id)?.unit_price ?? 0);
        partsTotal += Number(p.price) * Number(p.quantity);
      }
      for (const s of codes) {
        bodyObject(s, ["id", "code", "description", "status", "notes"]);
        uuid(text(s, "id", 36, true));
        if (!/^[PBCU][0-9A-F]{4}$/.test(text(s, "code", 5, true)))
          throw new BadRequestException("Código de scanner inválido.");
        text(s, "description", 20000);
        text(s, "notes", 20000);
        choice(s.status, Object.keys(codeStates), "Estado del código");
      }
      let photoSize = 0;
      for (const p of photos) {
        bodyObject(p, [
          "id",
          "url",
          "category",
          "description",
          "date",
          "userId",
        ]);
        uuid(text(p, "id", 36, true));
        choice(p.category, ["BEFORE", "DURING", "AFTER"], "Categoría");
        text(p, "description", 20000);
        const url = text(p, "url", 1500000, true);
        photoSize += url.length;
        if (
          !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url)
        )
          throw new BadRequestException("Fotografía inválida.");
        if (typeof p.date !== "string" || !Number.isFinite(Date.parse(p.date)))
          throw new BadRequestException("Fecha de fotografía inválida.");
      }
      if (photoSize > 1500000)
        throw new BadRequestException(
          "Las fotografías superan el tamaño permitido para esta ficha.",
        );
      const fields = [
        input.customerId,
        input.vehicleId,
        mechanicId,
        day,
        hour,
        mileage,
        reason,
        symptoms,
        diagnosis,
        findings,
        observations,
        status,
        labor,
        partsTotal,
        labor + partsTotal,
        user.workshopId,
        assignmentType,
      ];
      let saved: any;
      if (previous) {
        saved = (
          await c.query(
            `UPDATE work_orders SET customer_id=$1,vehicle_id=$2,mechanic_id=$3,entry_date=($4::date+$5::time) AT TIME ZONE 'America/Santiago',mileage=$6,reason=$7,symptoms=$8,diagnosis=$9,faults_found=$10,observations=$11,status=$12::varchar,labor_total=$13,parts_total=$14,total_amount=$15,completion_date=CASE WHEN $12::varchar='READY' THEN COALESCE(completion_date,now()) ELSE completion_date END,delivery_date=CASE WHEN $12::varchar='DELIVERED' THEN COALESCE(delivery_date,now()) ELSE delivery_date END,updated_at=now(),assignment_type=$17 WHERE workshop_id=$16 AND id=$18 RETURNING *`,
            [...fields, id],
          )
        ).rows[0];
      } else {
        const number = (
          await c.query(
            "SELECT COALESCE(MAX(substring(order_number from '^OT-([0-9]+)$')::bigint),1000)+1 AS next FROM work_orders WHERE workshop_id=$1",
            [user.workshopId],
          )
        ).rows[0].next;
        saved = (
          await c.query(
            `INSERT INTO work_orders(customer_id,vehicle_id,mechanic_id,entry_date,mileage,reason,symptoms,diagnosis,faults_found,observations,status,labor_total,parts_total,total_amount,workshop_id,assignment_type,order_number) VALUES($1,$2,$3,($4::date+$5::time) AT TIME ZONE 'America/Santiago',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
            [...fields, "OT-" + number],
          )
        ).rows[0];
      }
      const orderId = saved.id;
      for (const table of [
        "scanner_codes",
        "work_order_services",
        "work_order_parts",
        "photos",
      ])
        await c.query(
          "DELETE FROM " + table + " WHERE work_order_id=$1 AND workshop_id=$2",
          [orderId, user.workshopId],
        );
      for (const s of codes)
        await c.query(
          "INSERT INTO scanner_codes(id,workshop_id,work_order_id,code,description,status,observation) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            s.id,
            user.workshopId,
            orderId,
            s.code,
            s.description,
            codeStates[String(s.status)],
            s.notes,
          ],
        );
      for (const s of services)
        await c.query(
          "INSERT INTO work_order_services(id,workshop_id,work_order_id,mechanic_id,name,description,price,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            s.id,
            user.workshopId,
            orderId,
            s.mechanicId || null,
            s.name,
            s.description,
            s.price,
            serviceStates[String(s.status)],
          ],
        );
      for (const p of parts)
        await c.query(
          "INSERT INTO work_order_parts(id,workshop_id,work_order_id,name,brand,part_number,quantity,unit_price,total_price,observations) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [
            p.id,
            user.workshopId,
            orderId,
            p.name,
            p.brand,
            p.partNumber,
            p.quantity,
            p.price,
            Number(p.quantity) * Number(p.price),
            p.notes,
          ],
        );
      for (const p of photos)
        await c.query(
          "INSERT INTO photos(id,workshop_id,work_order_id,vehicle_id,uploaded_by,file_url,category,description,taken_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            p.id,
            user.workshopId,
            orderId,
            input.vehicleId,
            oldPhotos.find((x) => x.id === p.id)?.uploaded_by ?? user.id,
            p.url,
            p.category,
            p.description,
            p.date,
          ],
        );
      await c.query(
        "UPDATE vehicles SET mileage=GREATEST(mileage,$1),updated_at=now() WHERE id=$2 AND workshop_id=$3",
        [mileage, input.vehicleId, user.workshopId],
      );
      await activity(
        c,
        user.workshopId,
        user.id,
        "work_order",
        orderId,
        saved.order_number + (previous ? " actualizada" : " creada"),
      );
      return { id: orderId, number: saved.order_number, updatedAt: new Date(saved.updated_at).toISOString() };
    });
  }
}
