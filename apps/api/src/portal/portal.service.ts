import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { uuid } from "../common/validation.js";
import { serviceStates, reverse } from "../work-orders/order.mapping.js";
@Injectable()
export class PortalService {
  constructor(private readonly db: DatabaseService) {}
  async ensure(workshopId: string, customerId: string) {
    uuid(customerId);
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "portal:" + customerId,
      ]);
      if (
        !(
          await c.query(
            "SELECT id FROM customers WHERE workshop_id=$1 AND id=$2 AND active",
            [workshopId, customerId],
          )
        ).rows.length
      )
        throw new NotFoundException("Cliente no disponible.");
      const existing = (
        await c.query(
          "SELECT token FROM customer_portal_access WHERE workshop_id=$1 AND customer_id=$2 AND active AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now()) ORDER BY created_at LIMIT 1",
          [workshopId, customerId],
        )
      ).rows[0];
      if (existing) return existing;
      return (
        await c.query(
          "INSERT INTO customer_portal_access(workshop_id,customer_id) VALUES($1,$2) RETURNING token",
          [workshopId, customerId],
        )
      ).rows[0];
    });
  }
  async access(token: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        token,
      )
    )
      throw new NotFoundException("Código no disponible.");
    const row = (
      await this.db.query(
        "SELECT a.workshop_id,a.customer_id,w.name,w.phone,w.address,w.business_hours,w.logo_url FROM customer_portal_access a JOIN customers c ON c.id=a.customer_id AND c.workshop_id=a.workshop_id JOIN workshops w ON w.id=a.workshop_id WHERE a.token=$1 AND a.active AND a.revoked_at IS NULL AND (a.expires_at IS NULL OR a.expires_at>now()) AND c.active AND w.active",
        [token],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Código no disponible.");
    return row;
  }
  workshop(a: any) {
    return {
      name: a.name,
      logo: a.logo_url ?? "",
      phone: a.phone ?? "",
      address: a.address ?? "",
      hours: a.business_hours?.text ?? "",
    };
  }
  async vehicles(token: string) {
    const a = await this.access(token);
    return {
      token,
      workshop: this.workshop(a),
      vehicles: (
        await this.db.query(
          `SELECT v.id,v.license_plate AS plate,v.brand,v.model,v.year,v.mileage,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'type',m.maintenance_type,'date',m.maintenance_date::text,'mileage',m.mileage,'nextMileage',m.next_mileage,'nextDate',m.next_date::text) ORDER BY m.maintenance_date DESC,m.created_at DESC) FROM maintenance_records m WHERE m.workshop_id=v.workshop_id AND m.vehicle_id=v.id),'[]') AS maintenance FROM vehicles v WHERE v.workshop_id=$1 AND v.customer_id=$2 AND v.active ORDER BY v.license_plate`,
          [a.workshop_id, a.customer_id],
        )
      ).rows,
    };
  }
  async vehicle(token: string, id: string) {
    const a = await this.access(token);
    uuid(id);
    const vehicle = (
      await this.db.query(
        "SELECT id,license_plate AS plate,brand,model,year,mileage FROM vehicles WHERE workshop_id=$1 AND customer_id=$2 AND id=$3 AND active",
        [a.workshop_id, a.customer_id, id],
      )
    ).rows[0];
    if (!vehicle) throw new NotFoundException("Vehículo no disponible.");
    const maintenance = (
      await this.db.query(
        'SELECT m.id,m.work_order_id AS "orderId",m.maintenance_type AS type,m.mileage,m.maintenance_date::text AS date,m.next_mileage AS "nextMileage",m.next_date::text AS "nextDate",o.oil_type AS "oilType",o.viscosity,o.oil_brand AS brand,o.liters_used AS quantity,o.filter_name AS filter,o.filter_brand AS "filterBrand" FROM maintenance_records m LEFT JOIN oil_change_details o ON o.maintenance_id=m.id AND o.workshop_id=m.workshop_id WHERE m.workshop_id=$1 AND m.vehicle_id=$2 ORDER BY m.maintenance_date DESC,m.created_at DESC',
        [a.workshop_id, id],
      )
    ).rows.map((x) => ({
      ...x,
      workshopId: "",
      vehicleId: id,
      orderId: x.orderId ?? "",
      mechanicId: "",
      notes: "",
      oilType: x.oilType ?? "",
      viscosity: x.viscosity ?? "",
      brand: x.brand ?? "",
      filter: x.filter ?? "",
      filterBrand: x.filterBrand ?? "",
      quantity: Number(x.quantity ?? 0),
      nextMileage: x.nextMileage ?? 0,
      nextDate: x.nextDate ?? "",
    }));
    const rows = (
      await this.db.query(
        `SELECT o.id,o.order_number AS number,to_char(o.entry_date AT TIME ZONE 'America/Santiago','YYYY-MM-DD') AS date,o.mileage,o.status,o.reason,o.diagnosis,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'description',COALESCE(s.description,''),'status',s.status)) FROM work_order_services s WHERE s.work_order_id=o.id AND s.workshop_id=o.workshop_id),'[]') AS services,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'brand',COALESCE(p.brand,''),'quantity',p.quantity)) FROM work_order_parts p WHERE p.work_order_id=o.id AND p.workshop_id=o.workshop_id),'[]') AS parts,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'url',p.file_url,'category',p.category,'description',COALESCE(p.description,''),'date',COALESCE(p.taken_at,p.created_at))) FROM photos p WHERE p.work_order_id=o.id AND p.workshop_id=o.workshop_id),'[]') AS photos
    FROM work_orders o WHERE o.workshop_id=$1 AND o.vehicle_id=$2 AND o.customer_id=$3 AND o.status<>'CANCELLED' ORDER BY o.entry_date DESC`,
        [a.workshop_id, id, a.customer_id],
      )
    ).rows;
    const orders = rows.map((o: any) => ({
      ...o,
      diagnosis: o.diagnosis ?? "",
      services: o.services.map((s: any) => ({
        ...s,
        status: reverse(serviceStates, s.status),
      })),
    }));
    const reception = (
      await this.db.query(
        "SELECT id,file_url AS url,category,COALESCE(description,'') AS description,COALESCE(taken_at,created_at) AS date FROM photos WHERE workshop_id=$1 AND vehicle_id=$2 AND work_order_id IS NULL ORDER BY created_at DESC",
        [a.workshop_id, id],
      )
    ).rows;
    return {
      vehicle,
      workshop: this.workshop(a),
      maintenance,
      orders,
      photos: [...reception, ...orders.flatMap((o) => o.photos)],
    };
  }
}
