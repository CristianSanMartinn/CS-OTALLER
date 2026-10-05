"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Field, Panel, PageHeading } from "@/components/ui/primitives";
import { apiRequest } from "@/lib/http";
import { useAuth } from "../hooks/useAuth";
export function WorkshopRegistrationForm() {
  const { live } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState<{
      workshopId: string;
      message: string;
    } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirmPassword")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      f.delete("confirmPassword");
      setCreated(
        await apiRequest("auth/register", "POST", Object.fromEntries(f)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="main-content" style={{ maxWidth: 900, margin: "auto" }}>
      <PageHeading
        title="Registra tu taller"
        description="Crea tu espacio de trabajo y una cuenta de administrador."
      />
      <Panel title="Taller y administrador">
        {!live ? (
          <p>El registro de talleres requiere conectar la API.</p>
        ) : created ? (
          <div className="panel-padding">
            <p role="status">{created.message}</p>
            <p>
              Conserva el código del taller para distinguirlo si utilizas tu
              correo en varios talleres:
            </p>
            <code>{created.workshopId}</code>
            <div className="form-actions">
              <Link
                className="button primary"
                href={"/login?taller=" + created.workshopId}
              >
                Iniciar sesión en mi taller
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="panel-padding">
            <div className="form-grid">
              <Field
                label="Nombre del taller"
                name="workshopName"
                required
                maxLength={150}
              />
              <Field
                label="RUT del taller"
                name="workshopRut"
                required
                maxLength={20}
              />
              <Field
                label="Teléfono"
                name="phone"
                type="tel"
                required
                maxLength={30}
              />
              <Field label="Dirección" name="address" maxLength={255} />
              <Field
                label="Nombre del administrador"
                name="firstName"
                required
                maxLength={100}
              />
              <Field
                label="Apellido del administrador"
                name="lastName"
                required
                maxLength={100}
              />
              <Field
                label="Correo del administrador"
                name="email"
                type="email"
                required
                maxLength={150}
                autoComplete="username"
              />
              <Field
                label="Contraseña"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
              <Field
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>
            <p className="help-text">
              Este registro crea un taller independiente. Para incorporar
              trabajadores o administradores a un taller existente, su
              administrador debe crear sus cuentas en Trabajadores.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Link className="button" href="/login">
                Volver al acceso
              </Link>
              <button className="button primary" disabled={busy}>
                {busy ? "Creando taller…" : "Crear taller"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </main>
  );
}
