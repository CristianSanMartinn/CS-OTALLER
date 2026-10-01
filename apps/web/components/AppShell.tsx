"use client";
import { ReactNode, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar/Sidebar";
import { Header } from "./Header/Header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { adminRoutes } from "@/features/shared/services/permissions";
export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);
  const clientPortal =
    path.startsWith("/mi-vehiculo/") || path.startsWith("/mi-taller/");
  const denied =
    user?.role === "WORKER" &&
    adminRoutes.some((r) => path === r || path.startsWith(r + "/"));
  useEffect(() => {
    if (ready && !user && path !== "/login" && !clientPortal)
      router.replace("/login");
    if (ready && user && (path === "/login" || path === "/" || denied))
      router.replace("/dashboard");
  }, [ready, user, path, router, denied, clientPortal]);
  if (!ready) return <div className="loading">Preparando el taller…</div>;
  if (path === "/login" || clientPortal) return children;
  if (!user || denied) return <div className="loading">Redirigiendo…</div>;
  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={closeMenu} />
      <div className="app-body" inert={open}>
        <Header onMenu={() => setOpen(true)} />
        <main className="main-content">
          {children}
          <footer className="page-footer">
            <span>C.S.OTALLER</span>
            <span>
              Datos de demostración · Cambios guardados durante esta sesión
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
