import { Store, User } from "@/features/shared/types/domain";
import { ProfileInput } from "../types/profile.types";
const KEY = "otaller.profiles.v1";
type SavedProfile = { id: string; workshopId: string; profile: ProfileInput };

export function profileFields(user: User): ProfileInput {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    specialty: user.specialty,
    avatarUrl: user.avatarUrl ?? "",
  };
}
export function saveUserProfile(
  data: Store,
  actor: User,
  input: ProfileInput,
): Store {
  const current = data.users.find(
    (u) => u.id === actor.id && u.workshopId === actor.workshopId && u.active,
  );
  if (!current) throw new Error("No puedes editar este perfil.");
  const profile: ProfileInput = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    specialty: input.specialty.trim(),
    avatarUrl: input.avatarUrl,
  };
  if (!profile.name || !profile.phone)
    throw new Error("Completa el nombre y el teléfono.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
    throw new Error("Ingresa un correo electrónico válido.");
  if (
    data.users.some(
      (u) => u.id !== current.id && u.email.toLowerCase() === profile.email,
    )
  )
    throw new Error("Este correo ya pertenece a otro usuario.");
  if (
    profile.avatarUrl &&
    (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
      profile.avatarUrl,
    ) ||
      profile.avatarUrl.length > 1500000)
  )
    throw new Error("Selecciona una foto JPG, PNG o WebP de hasta 1 MB.");
  return {
    ...data,
    users: data.users.map((u) =>
      u.id === current.id && u.workshopId === current.workshopId
        ? { ...u, ...profile }
        : u,
    ),
  };
}
function savedProfiles(): SavedProfile[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is SavedProfile => {
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof entry.id !== "string" ||
        typeof entry.workshopId !== "string"
      )
        return false;
      const p = entry.profile;
      return (
        p &&
        ["name", "email", "phone", "specialty", "avatarUrl"].every(
          (k) => typeof p[k] === "string",
        )
      );
    });
  } catch {
    return [];
  }
}
export function restoreProfiles(data: Store): Store {
  if (typeof window === "undefined") return data;
  return savedProfiles().reduce((result, saved) => {
    const actor = result.users.find(
      (u) => u.id === saved.id && u.workshopId === saved.workshopId,
    );
    if (!actor) return result;
    try {
      return saveUserProfile(result, actor, saved.profile);
    } catch {
      return result;
    }
  }, data);
}
export function persistProfile(user: User) {
  const saved = savedProfiles().filter(
    (p) => p.id !== user.id || p.workshopId !== user.workshopId,
  );
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        ...saved,
        {
          id: user.id,
          workshopId: user.workshopId,
          profile: profileFields(user),
        },
      ]),
    );
  } catch {
    throw new Error(
      "No se pudo guardar en este navegador. Reduce el tamaño de la foto o habilita el almacenamiento local.",
    );
  }
}
