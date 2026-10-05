"use client";
import { Menu, Bell, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountMenu } from "./AccountMenu";
export function Header({ onMenu }: { onMenu: () => void }) {
  const { data, logout, live } = useAuth();
  const [show, setShow] = useState(false);
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
        <div className="notification-wrap">
          <button
            className="icon-button"
            aria-label="Ver notificaciones"
            aria-expanded={show}
            onClick={() => setShow(!show)}
          >
            <Bell size={20} />
          </button>
          {show && (
            <div className="notification-popover">
              <strong>Notificaciones</strong>
              <p>
                Las notificaciones automáticas estarán disponibles en una
                próxima etapa.
              </p>
            </div>
          )}
        </div>
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
