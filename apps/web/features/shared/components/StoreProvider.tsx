"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { Store, User } from "../types/domain";
import { createMockData } from "../services/mockData";
import {
  authService,
  sessionStore,
} from "@/features/auth/services/authService";
import { ProfileInput } from "@/features/perfil/types/profile.types";
import {
  restoreProfiles,
  saveUserProfile,
  persistProfile,
} from "@/features/perfil/services/profileService";
import { scopedData } from "../services/permissions";
type Context = {
  data: Store;
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, remember: boolean) => void;
  logout: () => void;
  update: (change: (data: Store) => Store) => void;
  notify: (text: string) => void;
  saveProfile: (profile: ProfileInput) => void;
};
const StoreContext = createContext<Context | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>(() =>
    restoreProfiles(createMockData()),
  );
  const userId = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
  const ready = userId !== undefined;
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const user = data.users.find((u) => u.id === userId && u.active) ?? null;
  function login(email: string, password: string, remember: boolean) {
    const next = authService.login(email, password, data.users);
    authService.save(next, remember);
    sessionStore.set(next.id);
  }
  function saveProfile(profile: ProfileInput) {
    if (!user) throw new Error("Inicia sesión para editar tu perfil.");
    const next = saveUserProfile(data, user, profile);
    persistProfile(
      next.users.find(
        (u) => u.id === user.id && u.workshopId === user.workshopId,
      )!,
    );
    setData(next);
  }
  function logout() {
    authService.logout();
    sessionStore.set(null);
  }
  return (
    <StoreContext.Provider
      value={{
        data: user ? scopedData(data, user) : data,
        user,
        ready,
        login,
        logout,
        update: setData,
        notify: setMessage,
        saveProfile,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Cerrar aviso" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("StoreProvider requerido");
  return context;
}
