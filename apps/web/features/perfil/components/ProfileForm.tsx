"use client";
import { ChangeEvent, FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { Avatar, Field, Panel } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { profileFields } from "../services/profileService";
export function ProfileForm() {
  const { user, saveProfile, notify, live } = useStore();
  const [profile, setProfile] = useState(() => profileFields(user!));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [reading, setReading] = useState(false);
  function change(patch: Partial<typeof profile>) {
    setProfile((p) => ({ ...p, ...patch }));
    setSaved(false);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      await saveProfile(profile);
      setSaved(true);
      notify("Perfil guardado correctamente");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function photo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setError("Selecciona una foto JPG, PNG o WebP de hasta 1 MB.");
      return;
    }
    setError("");
    setReading(true);
    setSaved(false);
    const reader = new FileReader();
    reader.onload = () => {
      change({ avatarUrl: String(reader.result) });
      setReading(false);
    };
    reader.onerror = () => {
      setError("No se pudo leer la foto. Intenta con otra imagen.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  }
  return (
    <form onSubmit={submit} className="narrow-panel">
      <Panel
        title="Información personal"
        subtitle="Mantén tus datos de contacto actualizados"
      >
        <div className="profile-photo">
          <Avatar name={profile.name} src={profile.avatarUrl} />
          <div>
            <label className="button">
              Seleccionar foto
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={photo}
                disabled={reading}
              />
            </label>
            <small>JPG, PNG o WebP · Hasta 1 MB</small>
          </div>
          {profile.avatarUrl && (
            <button
              type="button"
              className="text-button"
              disabled={reading}
              onClick={() => change({ avatarUrl: "" })}
            >
              Quitar foto
            </button>
          )}
        </div>
        <div className="form-grid">
          <Field
            label="Nombre completo"
            required
            value={profile.name}
            onChange={(e) => change({ name: e.target.value })}
          />
          <Field
            label="Correo electrónico"
            type="email"
            required
            value={profile.email}
            onChange={(e) => change({ email: e.target.value })}
          />
          <Field
            label="Teléfono"
            type="tel"
            required
            value={profile.phone}
            onChange={(e) => change({ phone: e.target.value })}
          />
          <Field
            label="Especialidad / cargo"
            value={profile.specialty}
            onChange={(e) => change({ specialty: e.target.value })}
          />
          <Field label="RUT" value={user?.rut ?? ""} readOnly />
          <Field
            label="Rol"
            value={user?.role === "ADMIN" ? "Administrador" : "Mecánico"}
            readOnly
          />
        </div>
        <p className="section-hint">
          El RUT y los permisos los administra el taller. El correo actualizado
          se usará en tu próximo inicio de sesión.
        </p>
        <p className="section-hint">
          {live
            ? "Los datos de tu perfil se guardan en el taller."
            : "Los datos del perfil se guardan en este navegador. La sincronización entre dispositivos se incorporará posteriormente."}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="section-hint" role="status">
            Perfil guardado. Puedes recargar la página y tus datos se
            conservarán.
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              setProfile(profileFields(user!));
              setError("");
              setSaved(false);
            }}
            disabled={reading}
          >
            Descartar cambios
          </button>
          <button className="button primary" disabled={reading}>
            <Save size={17} />
            {reading ? "Preparando foto…" : "Guardar perfil"}
          </button>
        </div>
      </Panel>
    </form>
  );
}
