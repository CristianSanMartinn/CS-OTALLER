"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, UserRound, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/hooks/useAuth";
export function AccountMenu({ onOpen }: { onOpen: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="account-wrap" ref={wrap}>
      <button
        type="button"
        ref={trigger}
        className="account-trigger"
        aria-label="Abrir menú de perfil"
        aria-expanded={open}
        aria-controls="account-options"
        onClick={() => {
          onOpen();
          setOpen(!open);
        }}
      >
        <Avatar name={user?.name ?? ""} src={user?.avatarUrl} />
        <span className="user-label">
          <strong>{user?.name}</strong>
          <small>{user?.role === "ADMIN" ? "Administrador" : "Mecánico"}</small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div id="account-options" className="account-popover">
          <strong>Mi cuenta</strong>
          <Link href="/perfil" onClick={() => setOpen(false)}>
            <UserRound size={17} /> Mi perfil
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut size={17} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
