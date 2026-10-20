"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
export function ThemeToggle() {
  const { theme, busy, change } = useTheme();
  const label =
    theme === "light" ? "Activar tema oscuro" : "Activar tema claro";
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={() => void change(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  );
}
export function ThemePreference() {
  const { theme, busy, change } = useTheme();
  return (
    <div className="theme-preference">
      <strong>Apariencia</strong>
      <p>Elige el color del sistema para tu cuenta.</p>
      <div role="group" aria-label="Tema de la aplicación">
        {(["light", "dark"] as const).map((value) => (
          <button
            type="button"
            key={value}
            className={"button " + (theme === value ? "primary" : "")}
            aria-pressed={theme === value}
            disabled={busy}
            onClick={() => void change(value)}
          >
            {value === "light" ? <Sun size={17} /> : <Moon size={17} />}{" "}
            {value === "light" ? "Claro" : "Oscuro"}
          </button>
        ))}
      </div>
    </div>
  );
}
