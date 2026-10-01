"use client";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { Building2, Save } from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  PageHeading,
  Panel,
  Field,
  TextField,
  SelectField,
} from "@/components/ui/primitives";
export function SettingsPage() {
  const { data, user, update, notify } = useStore();
  const [logo, setLogo] = useState(data.workshop.logo);
  const [error, setError] = useState("");
  if (user?.role !== "ADMIN") return null;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    update((d) => ({
      ...d,
      workshop: {
        ...d.workshop,
        name: get("name"),
        rut: get("rut"),
        phone: get("phone"),
        email: get("email"),
        address: get("address"),
        hours: get("hours"),
        preference: get("preference"),
        logo,
      },
    }));
    notify("Configuración del taller guardada");
  }
  return (
    <>
      <PageHeading
        title="Configuración"
        description="Información y preferencias de tu taller."
      />
      <form onSubmit={submit} className="narrow-panel">
        <Panel
          title="Identidad del taller"
          subtitle="Datos que identifican tu espacio de trabajo"
        >
          <div className="logo-upload">
            {logo ? (
              <Image
                unoptimized
                width={640}
                height={400}
                src={logo}
                alt="Logo del taller"
              />
            ) : (
              <Building2 size={35} />
            )}
            <label className="button">
              Seleccionar logo
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      f.type,
                    ) ||
                    f.size > 2 * 1024 * 1024
                  ) {
                    setError(
                      "Selecciona un logo JPG, PNG o WebP de hasta 2 MB.",
                    );
                    return;
                  }
                  setError("");
                  const r = new FileReader();
                  r.onload = () => setLogo(String(r.result));
                  r.readAsDataURL(f);
                }}
              />
            </label>
            {logo && (
              <button
                type="button"
                className="text-button"
                onClick={() => setLogo("")}
              >
                Quitar logo
              </button>
            )}
            <small>Vista previa local · Hasta 2 MB</small>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-grid">
            {(["name", "rut", "phone", "email", "address"] as const).map(
              (k, i) => (
                <Field
                  key={k}
                  label={
                    [
                      "Nombre comercial",
                      "RUT del taller",
                      "Teléfono",
                      "Correo",
                      "Dirección",
                    ][i]
                  }
                  name={k}
                  type={
                    k === "email" ? "email" : k === "phone" ? "tel" : "text"
                  }
                  required
                  defaultValue={data.workshop[k]}
                />
              ),
            )}
            <TextField
              label="Horarios de atención"
              name="hours"
              defaultValue={data.workshop.hours}
            />
            <SelectField
              label="Preferencias regionales"
              name="preference"
              defaultValue={data.workshop.preference}
            >
              <option>Kilómetros · CLP</option>
            </SelectField>
          </div>
          <div className="form-actions">
            <button className="button primary">
              <Save size={17} />
              Guardar configuración
            </button>
          </div>
        </Panel>
      </form>
    </>
  );
}
