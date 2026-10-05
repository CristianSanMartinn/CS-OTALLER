import { AvatarUploader } from "@/components/ImageUploader/AvatarUploader";
import { FormEvent, useState } from "react";
import { User, Role } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Field, SelectField } from "@/components/ui/primitives";
import { WorkerPermissions } from "./WorkerPermissions";
import { uid } from "@/utils/format";
export function WorkerForm({
  worker,
  onSave,
  onCancel,
}: {
  worker?: User;
  onSave: (u: User, password?: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { data, user, live, saveWorker } = useStore();
  const [role, setRole] = useState<Role>(worker?.role ?? "WORKER");
  const [avatarUrl, setAvatarUrl] = useState(worker?.avatarUrl ?? "");
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || preparingPhoto) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (
      data.users.some(
        (u) =>
          u.id !== worker?.id &&
          u.email.toLowerCase() === get("email").toLowerCase(),
      )
    ) {
      setError("Este correo ya pertenece a un trabajador.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const draft: User = {
        id: worker?.id ?? uid(),
        workshopId: user!.workshopId,
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        rut: get("rut"),
        specialty: get("specialty"),
        role,
        active: worker?.active ?? true,
        avatarUrl,
      };
      const password = worker ? undefined : String(f.get("password") ?? "");
      const saved = await saveWorker(draft, password, Boolean(worker));
      await onSave(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <AvatarUploader
        name={worker?.name ?? "Trabajador"}
        value={avatarUrl}
        onChange={setAvatarUrl}
        onBusyChange={setPreparingPhoto}
      />
      <div className="form-grid">
        <Field
          label="Nombre completo"
          name="name"
          required
          defaultValue={worker?.name}
        />
        <Field label="RUT" name="rut" required defaultValue={worker?.rut} />
        <Field
          label="Teléfono"
          name="phone"
          type="tel"
          required
          defaultValue={worker?.phone}
        />
        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          required
          defaultValue={worker?.email}
        />
        <Field
          label="Especialidad"
          name="specialty"
          required
          defaultValue={worker?.specialty}
        />
        <SelectField
          label="Rol"
          value={role}
          disabled={worker?.id === user?.id}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="WORKER">Mecánico</option>
          <option value="ADMIN">Administrador</option>
        </SelectField>
        {!worker && (
          <Field
            label="Contraseña temporal"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={live ? 12 : 8}
            required
            placeholder={live ? "Mínimo 12 caracteres" : "Mínimo 8 caracteres"}
          />
        )}
      </div>
      <div className="panel-padding">
        <WorkerPermissions role={role} />
        {!worker && (
          <p className="help-text">
            {live
              ? "Elige Administrador para darle acceso administrativo al mismo taller. Esta cuenta se guardará en Neon; nunca se muestran contraseñas existentes."
              : "Las credenciales nuevas solo funcionan durante esta sesión de demostración."}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy || preparingPhoto}>
          {busy ? "Guardando…" : worker ? "Guardar cambios" : "Crear cuenta"}
        </button>
      </div>
    </form>
  );
}
