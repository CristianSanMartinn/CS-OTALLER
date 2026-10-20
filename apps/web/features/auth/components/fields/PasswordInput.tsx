"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordInput() {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>Contraseña</span>
      <div className="password-input">
        <input
          required
          name="password"
          autoComplete="current-password"
          type={show ? "text" : "password"}
          placeholder="Ingresa tu contraseña"
        />
        <button
          type="button"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
