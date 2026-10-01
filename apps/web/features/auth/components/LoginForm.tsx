"use client";
import { useState, FormEvent } from "react";
import { Wrench, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { PasswordInput } from "./PasswordInput";
import { Field } from "@/components/ui/primitives";
export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [recover, setRecover] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      login(
        String(fd.get("email")),
        String(fd.get("password")),
        fd.get("remember") === "on",
      );
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="login-screen">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Wrench />
          </span>
          <span>
            C.S.OTALLER<small>WORKSHOP MANAGEMENT</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">TU TALLER, BAJO CONTROL</span>
          <h1>
            Cada vehículo.
            <br />
            Cada detalle.
            <br />
            <em>Todo conectado.</em>
          </h1>
          <p>
            Un espacio de trabajo para cuidar de tus clientes, tu equipo y cada
            reparación.
          </p>
          <div className="login-graphic">
            <div className="graphic-line" />
            <Wrench size={72} />
            <div className="graphic-tag">ORDEN · PRECISIÓN · CONFIANZA</div>
          </div>
        </div>
        <small>Software de gestión automotriz</small>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="demo-label">ENTORNO DEMO</span>
          <h2>Bienvenido de nuevo</h2>
          <p>Ingresa a tu espacio de trabajo.</p>
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
            <div className="login-options">
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
            {recover && (
              <p className="info-box" role="status">
                En esta demo no se envían correos. Utiliza las credenciales de
                prueba que aparecen abajo.
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="button primary login-submit">
              Iniciar sesión <ArrowRight size={18} />
            </button>
          </form>
          <div className="demo-credentials">
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
        </div>
        <small className="login-copyright">© 2026 C.S.OTALLER</small>
      </section>
    </div>
  );
}
