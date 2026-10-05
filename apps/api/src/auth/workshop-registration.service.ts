import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import { DatabaseService } from "../database/database.service.js";
import { bodyObject, text, email } from "../common/validation.js";
@Injectable()
export class WorkshopRegistrationService {
  constructor(private readonly db: DatabaseService) {}
  async register(body: unknown) {
    const b = bodyObject(body, [
      "workshopName",
      "workshopRut",
      "phone",
      "address",
      "firstName",
      "lastName",
      "email",
      "password",
    ]);
    const name = text(b, "workshopName", 150, true),
      rut = text(b, "workshopRut", 20, true),
      phone = text(b, "phone", 30, true),
      address = text(b, "address", 255),
      first = text(b, "firstName", 100, true),
      last = text(b, "lastName", 100, true),
      mail = email(text(b, "email", 150, true));
    const password = typeof b.password === "string" ? b.password : "";
    if (password.length < 12 || Buffer.byteLength(password) > 72)
      throw new BadRequestException(
        "La contraseña debe tener al menos 12 caracteres y hasta 72 bytes.",
      );
    const passwordHash = await hash(password, 12);
    return this.db.transaction(async (c) => {
      const key = rut.toLowerCase().replace(/[.\s-]/g, "");
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "workshop-registration:" + key,
      ]);
      const duplicate = await c.query(
        "SELECT id FROM workshops WHERE lower(regexp_replace(rut,'[.[:space:]-]','','g'))=$1",
        [key],
      );
      if (duplicate.rows.length)
        throw new ConflictException(
          "Ya existe un taller registrado con este RUT. Solicita acceso a su administrador.",
        );
      const workshop = (
        await c.query(
          "INSERT INTO workshops(name,rut,phone,email,address) VALUES($1,$2,$3,$4,$5) RETURNING id",
          [name, rut, phone, mail, address || null],
        )
      ).rows[0];
      await c.query(
        "INSERT INTO users(workshop_id,first_name,last_name,email,phone,password_hash,role) VALUES($1,$2,$3,$4,$5,$6,'ADMIN')",
        [workshop.id, first, last, mail, phone, passwordHash],
      );
      return {
        workshopId: workshop.id,
        message:
          "Taller y cuenta de administrador creados. Ya puedes iniciar sesión.",
      };
    });
  }
}
