import { BadRequestException } from "@nestjs/common";
import { PoolClient } from "pg";
import { uuid } from "./validation.js";
export type Input = Record<string, unknown>;
export function amount(
  v: unknown,
  label: string,
  integer = false,
  min = 0,
  max = 1000000000,
) {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isInteger(v))
  )
    throw new BadRequestException("Revisa " + label + ".");
  return v;
}
export function date(v: unknown, label: string) {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    throw new BadRequestException("Revisa " + label + ".");
  return v;
}
export function time(v: unknown) {
  if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
    throw new BadRequestException("Hora inválida.");
  return v;
}
export function choice(v: unknown, values: string[], label: string) {
  if (typeof v !== "string" || !values.includes(v))
    throw new BadRequestException(label + " inválido.");
  return v;
}
export function array(v: unknown, label: string, max = 100): Input[] {
  if (
    !Array.isArray(v) ||
    v.length > max ||
    v.some((x) => !x || typeof x !== "object" || Array.isArray(x))
  )
    throw new BadRequestException("Revisa " + label + ".");
  return v;
}
const tables = ["customers", "vehicles", "users", "work_orders"];
export async function reference(
  c: PoolClient,
  table: string,
  id: unknown,
  workshop: string,
) {
  if (typeof id !== "string" || !tables.includes(table))
    throw new BadRequestException("Referencia inválida.");
  uuid(id);
  const r = await c.query(
    "SELECT * FROM " +
      table +
      " WHERE id=$1 AND workshop_id=$2" +
      (table === "work_orders" ? "" : " AND active"),
    [id, workshop],
  );
  if (!r.rows[0])
    throw new BadRequestException(
      "La referencia no pertenece a este taller o está inactiva.",
    );
  return r.rows[0];
}
export async function activity(
  c: PoolClient,
  workshop: string,
  user: string,
  entity: string,
  id: string,
  description: string,
) {
  await c.query(
    "INSERT INTO activity_logs(workshop_id,user_id,action,entity_type,entity_id,description) VALUES($1,$2,$3,$4,$5,$6)",
    [workshop, user, "SAVE", entity, id, description],
  );
}
