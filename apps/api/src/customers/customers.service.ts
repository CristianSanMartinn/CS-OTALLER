import { customerPhotos } from "../common/media.js";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { bodyObject, text, email, uuid } from "../common/validation.js";
import { activity } from "../common/operations.js";
@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(workshopId: string) {
    return (
      await this.db.query(
        `SELECT c.*,(SELECT p.token FROM customer_portal_access p WHERE p.customer_id=c.id AND p.workshop_id=c.workshop_id AND p.active AND p.revoked_at IS NULL AND (p.expires_at IS NULL OR p.expires_at>now()) ORDER BY p.created_at LIMIT 1) AS portal_token,(SELECT jsonb_build_object('emailEnabled',false,'whatsappEnabled',r.whatsapp_enabled,'consent',r.authorized,'consentAt',r.authorization_date,'daysBefore',r.reminder_days_before) FROM customer_reminder_preferences r WHERE r.customer_id=c.id AND r.workshop_id=c.workshop_id) AS reminder_preferences FROM customers c WHERE c.workshop_id=$1 ORDER BY c.created_at DESC`,
        [workshopId],
      )
    ).rows;
  }
  async setActive(
    workshopId: string,
    id: string,
    actorId: string,
    active: boolean,
  ) {
    uuid(id);
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        workshopId,
      ]);
      const customer = (
        await c.query(
          "SELECT * FROM customers WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
          [id, workshopId],
        )
      ).rows[0];
      if (!customer)
        throw new NotFoundException("Cliente no encontrado en este taller.");
      if (!active) {
        const pending = await c.query(
          "SELECT 1 FROM work_orders WHERE customer_id=$1 AND workshop_id=$2 AND status NOT IN ('CANCELLED','DELIVERED') UNION ALL SELECT 1 FROM appointments WHERE customer_id=$1 AND workshop_id=$2 AND status NOT IN ('CANCELLED','COMPLETED','NO_SHOW') LIMIT 1",
          [id, workshopId],
        );
        if (pending.rows.length)
          throw new ConflictException(
            "Este cliente tiene órdenes o citas activas. Finalízalas o cancélalas antes de eliminarlo.",
          );
      }
      await c.query(
        "UPDATE customers SET active=$1,updated_at=now() WHERE id=$2 AND workshop_id=$3",
        [active, id, workshopId],
      );
      if (!active)
        await c.query(
          "UPDATE customer_reminder_preferences SET whatsapp_enabled=false,email_enabled=false,updated_at=now() WHERE customer_id=$1 AND workshop_id=$2",
          [id, workshopId],
        );
      if (customer.active !== active)
        await activity(
          c,
          workshopId,
          actorId,
          "customer",
          id,
          (active
            ? "Cliente restaurado: "
            : "Cliente eliminado de la lista: ") +
            customer.first_name +
            " " +
            (customer.last_name ?? ""),
        );
      return { id, active };
    });
  }
  async save(workshopId: string, body: unknown, id?: string, actorId = "") {
    const b = bodyObject(body, [
      "first_name",
      "last_name",
      "rut",
      "phone",
      "email",
      "address",
      "notes",
      "photos",
      "reminderPreferences",
    ]);
    let prefs:
      | { consent: boolean; whatsappEnabled: boolean; daysBefore: number }
      | undefined;
    if (b.reminderPreferences !== undefined) {
      const p = bodyObject(b.reminderPreferences, [
        "emailEnabled",
        "whatsappEnabled",
        "consent",
        "consentAt",
        "daysBefore",
      ]);
      if (
        typeof p.whatsappEnabled !== "boolean" ||
        typeof p.consent !== "boolean" ||
        ![7, 15, 30].includes(Number(p.daysBefore))
      )
        throw new BadRequestException(
          "Preferencias de recordatorio inválidas.",
        );
      if (
        p.whatsappEnabled &&
        (!p.consent ||
          !/^\+[1-9]\d{7,14}$/.test(
            text(b, "phone", 30).replace(/[\s()-]/g, ""),
          ))
      )
        throw new BadRequestException(
          "Para habilitar WhatsApp registra autorización y teléfono con código de país.",
        );
      prefs = {
        consent: p.consent,
        whatsappEnabled: p.whatsappEnabled,
        daysBefore: Number(p.daysBefore),
      };
    }
    const previous = id
      ? ((
          await this.db.query(
            "SELECT photos FROM customers WHERE id=$1 AND workshop_id=$2",
            [uuid(id), workshopId],
          )
        ).rows[0]?.photos ?? [])
      : [];
    const photos =
      b.photos === undefined
        ? previous
        : customerPhotos(b.photos, actorId, previous);
    const values = [
      text(b, "first_name", 100, true),
      text(b, "last_name", 100),
      text(b, "rut", 20) || null,
      text(b, "phone", 30) || null,
      email(text(b, "email", 150)) || null,
      text(b, "address", 255) || null,
      text(b, "notes", 10000) || null,
      JSON.stringify(photos),
      workshopId,
    ];
    try {
      const rut = values[2];
      if (rut) {
        const duplicate = await this.db.query(
          "SELECT id FROM customers WHERE workshop_id=$1 AND lower(regexp_replace(rut,'[.[:space:]-]','','g'))=lower(regexp_replace($2,'[.[:space:]-]','','g')) AND ($3::uuid IS NULL OR id<>$3::uuid)",
          [workshopId, rut, id ? uuid(id) : null],
        );
        if (duplicate.rows.length)
          throw new ConflictException(
            "Ya existe un cliente con este RUT en el taller.",
          );
      }
      const sql = id
        ? "UPDATE customers SET first_name=$1,last_name=$2,rut=$3,phone=$4,email=$5,address=$6,notes=$7,photos=$8::jsonb,updated_at=now() WHERE workshop_id=$9 AND id=$10 AND active RETURNING *"
        : "INSERT INTO customers (first_name,last_name,rut,phone,email,address,notes,photos,workshop_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *";
      return this.db.transaction(async (c) => {
        const result = await c.query(sql, id ? [...values, uuid(id)] : values);
        const customer = result.rows[0];
        if (!customer)
          throw new NotFoundException("Cliente no encontrado en este taller.");
        if (prefs) {
          const r = await c.query(
            `INSERT INTO customer_reminder_preferences(workshop_id,customer_id,email_enabled,whatsapp_enabled,authorized,authorization_date,reminder_days_before) VALUES($1,$2,false,$3,$4,CASE WHEN $4 THEN now() ELSE NULL END,$5) ON CONFLICT(customer_id) DO UPDATE SET email_enabled=false,whatsapp_enabled=EXCLUDED.whatsapp_enabled,authorized=EXCLUDED.authorized,authorization_date=CASE WHEN EXCLUDED.authorized THEN COALESCE(customer_reminder_preferences.authorization_date,now()) ELSE NULL END,reminder_days_before=EXCLUDED.reminder_days_before,updated_at=now() RETURNING *`,
            [
              workshopId,
              customer.id,
              prefs.whatsappEnabled,
              prefs.consent,
              prefs.daysBefore,
            ],
          );
          const p = r.rows[0];
          customer.reminder_preferences = {
            emailEnabled: false,
            whatsappEnabled: p.whatsapp_enabled,
            consent: p.authorized,
            consentAt: p.authorization_date,
            daysBefore: p.reminder_days_before,
          };
        }
        return customer;
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new ConflictException("El cliente ya existe.");
      throw e;
    }
  }
}
