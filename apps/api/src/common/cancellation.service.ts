import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AuthUser } from "../auth/auth.types.js";
import { bodyObject, text, uuid } from "./validation.js";
import { activity, choice } from "./operations.js";
const reasons: Record<string, string> = {
  CLIENT_CANCELLED: "Cliente cancela visita",
  NO_BUDGET: "No tiene presupuesto",
  DIAGNOSIS_ONLY: "Solo diagnóstico",
  OTHER: "Otros",
};
@Injectable()
export class CancellationService {
  constructor(private readonly db: DatabaseService) {}
  async cancel(
    u: AuthUser,
    kind: "order" | "appointment",
    id: string,
    body: unknown,
  ) {
    if (u.role !== "ADMIN")
      throw new ForbiddenException(
        "Solo administración puede cancelar una atención.",
      );
    uuid(id);
    const b = bodyObject(body, ["reason", "notes"]);
    const reason = choice(b.reason, Object.keys(reasons), "Motivo");
    const notes = text(b, "notes", 2000, reason === "OTHER");
    const table = kind === "order" ? "work_orders" : "appointments";
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        u.workshopId,
      ]);
      const row = (
        await c.query(
          "SELECT * FROM " +
            table +
            " WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
          [id, u.workshopId],
        )
      ).rows[0];
      if (!row) throw new NotFoundException("Atención no encontrada.");
      if (row.status === "CANCELLED")
        throw new ConflictException("Esta atención ya está cancelada.");
      if (["DELIVERED", "COMPLETED", "NO_SHOW"].includes(row.status))
        throw new BadRequestException(
          "No se puede cancelar una atención finalizada.",
        );
      const cancellation = {
        reason,
        notes,
        date: new Date().toISOString(),
        userId: u.id,
      };
      await c.query(
        "UPDATE " +
          table +
          " SET status='CANCELLED',cancellation=$1::jsonb,updated_at=now() WHERE id=$2 AND workshop_id=$3",
        [JSON.stringify(cancellation), id, u.workshopId],
      );
      await activity(
        c,
        u.workshopId,
        u.id,
        kind === "order" ? "work_order" : "appointment",
        id,
        (kind === "order"
          ? row.order_number
          : "Cita: " + row.requested_service) +
          " cancelada · " +
          reasons[reason] +
          (notes ? " · " + notes : ""),
      );
      return { id, status: "CANCELLED", cancellation };
    });
  }
}
