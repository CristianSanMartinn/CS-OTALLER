"use client";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { optimizeImage } from "@/utils/imageOptimization";
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
  const { data, user, saveWorkshop, notify } = useStore();
  const [logo, setLogo] = useState(data.workshop.logo);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  if (user?.role !== "ADMIN") return null;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      await saveWorkshop({
        ...data.workshop,
        name: get("name"),
        rut: get("rut"),
        phone: get("phone"),
        email: get("email"),
        address: get("address"),
        hours: get("hours"),
        preference: get("preference"),
        logo,
      });
      notify("Configuración del taller guardada");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
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
              {preparing ? "Preparando imagen…" : "Seleccionar foto o logo"}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      f.type,
                    ) ||
                    f.size > 30 * 1024 * 1024
                  ) {
                    setError(
                      "Selecciona una imagen JPG, PNG o WebP de hasta 30 MB.",
                    );
                    return;
                  }
                  setError("");
                  setPreparing(true);
                  try {
                    setLogo(
                      await optimizeImage(f, {
                        maxBytes: 400000,
                        maxDimension: 1800,
                      }),
                    );
                  } catch (error) {
                    setError((error as Error).message);
                  } finally {
                    setPreparing(false);
                  }
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
            <small>Foto o logo del taller · Se optimiza automáticamente</small>
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
            <button className="button primary" disabled={busy || preparing}>
              <Save size={17} />
              {busy ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </Panel>
      </form>
    </>
  );
}
