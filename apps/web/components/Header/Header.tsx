"use client";
import { Menu, LogOut } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountMenu } from "./AccountMenu";
import { NotificationBell } from "@/features/notificaciones/components/NotificationBell";
import { ThemeToggle } from "@/features/preferencias/components/ThemeToggle";
export function Header({ onMenu }: { onMenu: () => void }) {
  const { data, logout, live } = useAuth();
  const [show, setShow] = useState(false);
  const closeNotifications = useCallback(() => setShow(false), []);
  return (
    <header className="header">
      <div className="header-left">
        <button
          className="icon-button menu-toggle"
          aria-label="Abrir menú"
          onClick={onMenu}
        >
          <Menu />
        </button>
        <span className="header-workshop">{data.workshop.name}</span>
        <span className="header-divider" />
        <span className="demo-label">{live ? "EN LÍNEA" : "DEMO"}</span>
      </div>
      <div className="header-right">
        <ThemeToggle />
        <NotificationBell
          open={show}
          onToggle={() => setShow(!show)}
          onClose={closeNotifications}
        />
        <span className="header-divider" />
        <AccountMenu onOpen={() => setShow(false)} />
        <button
          className="icon-button logout"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={logout}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
