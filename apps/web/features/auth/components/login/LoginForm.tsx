"use client";
import styles from "./LoginForm.module.css";
import { useState, FormEvent } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Warehouse,
  Settings,
  Users,
  ChevronDown,
} from "lucide-react";
import { LoginHero } from "./LoginHero";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { PasswordInput } from "../fields/PasswordInput";
import { Field } from "@/components/ui/primitives";
export function LoginForm({ workshopId = "" }: { workshopId?: string }) {
  const { login, live } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recover, setRecover] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(
        String(fd.get("email")),
        String(fd.get("password")),
        fd.get("remember") === "on",
        String(fd.get("workshopId") ?? "").trim() || undefined,
      );
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.loginScreen}>
      <LoginHero />
      <section className={styles.loginFormSide}>
        <div className={styles.loginFormWrap}>
          <span className={styles.accessBadge}>
            <Warehouse size={17} aria-hidden="true" />
            {live ? "ACCESO AL TALLER" : "ENTORNO DEMO"}
          </span>
          <h2>Bienvenido de nuevo</h2>
          <p className={styles.subtitle}>Ingresa a tu espacio de trabajo.</p>
          <form onSubmit={submit}>
            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="nombre@taller.cl"
            />
            <PasswordInput />
            <div className={styles.loginOptions}>
              <label>
                <input type="checkbox" name="remember" /> Recordarme
              </label>
              <button
                type="button"
                className="text-button"
                onClick={() => setRecover(!recover)}
              >
                Recuperar contraseña
              </button>
            </div>
            {live && (
              <details className={styles.workshopAccess} open={!!workshopId}>
                <summary>
                  <Users size={20} aria-hidden="true" />
                  ¿Accedes a más de un taller?
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <Field
                  label="Código del taller"
                  name="workshopId"
                  defaultValue={workshopId}
                  maxLength={36}
                />
                <p className="help-text">
                  Solo es necesario si tu correo está registrado en varios
                  talleres. Usa el código entregado al crear el taller.
                </p>
              </details>
            )}
            {recover && (
              <p className="info-box" role="status">
                {live
                  ? "Contacta al administrador del taller para recuperar tu acceso. La recuperación automática se incorporará posteriormente."
                  : "En esta demo no se envían correos. Utiliza las credenciales de prueba que aparecen abajo."}
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className={"button primary " + styles.loginSubmit}
              disabled={busy}
            >
              {busy ? "Ingresando…" : "Iniciar sesión"} <ArrowRight size={18} />
            </button>
          </form>
          {!live && (
            <div className={styles.demoCredentials}>
              <ShieldCheck size={19} />
              <div>
                <strong>Accesos de demostración</strong>
                <p>
                  Admin: admin@otaller.cl
                  <br />
                  Mecánico: mecanico@otaller.cl
                  <br />
                  Contraseña: <code>Taller2026!</code>
                </p>
                <small>Los cambios se reinician al recargar la página.</small>
              </div>
            </div>
          )}
          {live && (
            <>
              <div className={styles.divider} aria-hidden="true">
                o
              </div>
              <nav
                className={styles.secondaryActions}
                aria-label="Opciones de acceso"
              >
                <a href="/registro">
                  <Warehouse size={19} aria-hidden="true" />
                  Registrar un nuevo taller
                </a>
                <a href="/setup">
                  <Settings size={19} aria-hidden="true" />
                  Configuración inicial
                </a>
              </nav>
            </>
          )}
        </div>
        <small className={styles.loginCopyright}>© 2026 C.S.OTALLER</small>
      </section>
    </div>
  );
}
