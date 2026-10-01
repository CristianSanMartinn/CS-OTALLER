import { User } from "../types/auth.types";
export const DEMO_PASSWORD = "Taller2026!";
const KEY = "otaller.session.v1";
// Simulación local: no constituye autenticación ni autorización de servidor.
const temporaryCredentials = new Map<string, string>();
export const authService = {
  login(email: string, password: string, users: User[]) {
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.active,
    );
    if (
      !user ||
      password !==
        (temporaryCredentials.get(user.id) ??
          (["u1", "u2", "u3", "u4"].includes(user.id) ? DEMO_PASSWORD : ""))
    )
      throw new Error("Correo o contraseña incorrectos, o cuenta inactiva.");
    return user;
  },
  registerCredential(id: string, password: string) {
    temporaryCredentials.set(id, password);
  },
  save(user: User, remember: boolean) {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, user.id);
  },
  restore() {
    return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
  },
  logout() {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  },
};

let sessionId: string | null | undefined = undefined;
const listeners = new Set<() => void>();
function readSession() {
  try {
    return authService.restore();
  } catch {
    return null;
  }
}
export const sessionStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const sync = () => {
      sessionId = readSession();
      listeners.forEach((fn) => fn());
    };
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", sync);
    };
  },
  getSnapshot() {
    if (sessionId === undefined) sessionId = readSession();
    return sessionId;
  },
  getServerSnapshot() {
    return undefined;
  },
  set(id: string | null) {
    sessionId = id;
    listeners.forEach((fn) => fn());
  },
};
