"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Field, Panel, PageHeading } from "@/components/ui/primitives";
import { apiRequest } from "@/lib/http";
export function InitialSetup() {
  const [required, setRequired] = useState<boolean | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    apiRequest<{ setupRequired: boolean }>("auth/setup")
      .then((r) => setRequired(r.setupRequired))
      .catch((e) => setError((e as Error).message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(data);
      const result = await apiRequest<{ message: string }>(
        "auth/setup",
        "POST",
        payload,
      );
      setSuccess(result.message);
      setRequired(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="main-content">
      <PageHeading
        title="Configurar primer administrador"
        description="Crea el taller y su primer acceso. Esta configuración se realiza una sola vez."
      />
      <Panel title="Acceso inicial">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {required === false ? (
          <div className="empty">
            <p role="status">
              {success || "El taller ya tiene un administrador."}
            </p>
            <Link href="/login" className="button primary">
              Iniciar sesión
            </Link>
          </div>
        ) : required === null ? (
          <p className="section-hint">Comprobando configuración…</p>
        ) : (
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field
                label="Código de configuración"
                name="setupToken"
                type="password"
                required
                autoComplete="off"
              />
              <Field
                label="Nombre del taller"
                name="workshopName"
                required
                maxLength={150}
              />
              <Field label="Nombre" name="firstName" required maxLength={100} />
              <Field
                label="Apellido"
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
                label="Contraseña nueva"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>
            <p className="section-hint">
              El código corresponde a SETUP_TOKEN configurado en el backend. La
              contraseña debe tener al menos 12 caracteres.
            </p>
            <div className="form-actions">
              <button className="button primary" disabled={busy}>
                {busy ? "Creando taller…" : "Crear taller y administrador"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </main>
  );
}
