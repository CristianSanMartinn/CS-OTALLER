"use client";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { apiRequest } from "@/lib/http";
type Theme = "light" | "dark";
const Context = createContext<{
  theme: Theme;
  busy: boolean;
  change: (value: Theme) => Promise<void>;
}>({ theme: "light", busy: false, change: async () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, live, notify } = useAuth();
  const key = user ? "otaller.theme." + user.workshopId + "." + user.id : "";
  const [preference, setPreference] = useState<{ key: string; theme: Theme }>();
  const [busy, setBusy] = useState(false);
  const stored = useSyncExternalStore<Theme>(
    subscribe,
    () => {
      if (!key || live) return "light";
      try {
        return localStorage.getItem(key) === "dark" ? "dark" : "light";
      } catch {
        return "light";
      }
    },
    () => "light",
  );
  const theme =
    preference?.key === key
      ? preference.theme
      : live
        ? (user?.theme ?? "light")
        : stored;
  async function change(value: Theme) {
    if (!user || busy) return;
    const before = theme;
    setPreference({ key, theme: value });
    setBusy(true);
    try {
      if (live) await apiRequest("auth/preferences", "PATCH", { theme: value });
      else {
        localStorage.setItem(key, value);
        window.dispatchEvent(new Event("otaller:theme"));
      }
    } catch {
      setPreference({ key, theme: before });
      notify("No se pudo guardar el tema. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider value={{ theme, busy, change }}>
      {children}
    </Context.Provider>
  );
}
export function useTheme() {
  return useContext(Context);
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("otaller:theme", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("otaller:theme", onChange);
  };
}

