"use client";
import { ReactNode, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApplicationLoading } from "./ApplicationLoading/ApplicationLoading";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Sidebar } from "./Sidebar/Sidebar";
import { Header } from "./Header/Header";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { adminRoutes } from "@/features/shared/services/permissions";
import { useTheme } from "@/features/preferencias/components/ThemeProvider";
export function AppShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const { user, ready, live } = useAuth();
  const { data } = useStore();
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
    if (
      ready &&
      !user &&
      path !== "/login" &&
      path !== "/setup" &&
      path !== "/registro" &&
      !clientPortal
    )
      router.replace("/login");
    if (
      ready &&
      user &&
      (path === "/login" || path === "/registro" || path === "/" || denied)
    )
      router.replace("/dashboard");
  }, [ready, user, path, router, denied, clientPortal]);
  if (clientPortal) return children;
  const publicScreen =
    path === "/login" || path === "/setup" || path === "/registro";
  const screenReady =
    ready && (publicScreen || (!!user && !denied && path !== "/"));
  const message = loadingMessage(path);
  return (
    <ApplicationLoading
      key={path}
      ready={screenReady}
      message={message}
      logo={user ? data.workshop.logo : undefined}
      brandName={user ? data.workshop.name : "C.S.OTALLER"}
    >
      {publicScreen ? (
        children
      ) : screenReady ? (
        <div className="app-shell" data-theme={theme}>
          <Sidebar open={open} onClose={closeMenu} />
          <div className="app-body" inert={open}>
            <Header onMenu={() => setOpen(true)} />
            <main className="main-content">
              {children}
              <footer className="page-footer">
                <span>C.S.OTALLER</span>
                <span>
                  {live
                    ? "Clientes y vehículos guardados en el taller"
                    : "Datos de demostración · Cambios guardados durante esta sesión"}
                </span>
              </footer>
            </main>
          </div>
        </div>
      ) : null}
    </ApplicationLoading>
  );
}
function loadingMessage(path: string) {
  const messages: Record<string, string> = {
    login: "Preparando el acceso al taller",
    registro: "Preparando el registro del taller",
    setup: "Preparando la configuración inicial",
    dashboard: "Preparando tu dashboard",
    clientes: "Preparando la ficha de clientes",
    vehiculos: "Preparando los vehículos del taller",
    ordenes: "Preparando las órdenes de trabajo",
    mantenciones: "Preparando el historial de mantenciones",
    agenda: "Preparando la agenda del taller",
    trabajadores: "Preparando el equipo del taller",
    servicios: "Preparando los servicios del taller",
    repuestos: "Preparando el catálogo de repuestos",
    estadisticas: "Preparando las estadísticas",
    configuracion: "Preparando la configuración del taller",
    perfil: "Preparando tu perfil",
  };
  return messages[path.split("/")[1]] ?? "Preparando tu taller";
}
