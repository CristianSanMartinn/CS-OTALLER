"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CarFront,
  ClipboardList,
  Wrench,
  CalendarDays,
  UserRoundCog,
  ChartNoAxesCombined,
  Settings,
  X,
  ChevronsUpDown,
  Package,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
const items = [
  ["/dashboard", "Dashboard", LayoutDashboard, false],
  ["/clientes", "Clientes", Users, true],
  ["/vehiculos", "Vehículos", CarFront, false],
  ["/ordenes", "Órdenes de trabajo", ClipboardList, false],
  ["/mantenciones", "Mantenciones", Wrench, false],
  ["/agenda", "Agenda", CalendarDays, false],
  ["/trabajadores", "Trabajadores", UserRoundCog, true],
  ["/servicios", "Servicios", ListChecks, true],
  ["/repuestos", "Repuestos", Package, true],
  ["/estadisticas", "Estadísticas", ChartNoAxesCombined, true],
  ["/configuracion", "Configuración", Settings, true],
] as const;
export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>("a[href],button") ??
          [],
      ).filter((el) => el.offsetParent !== null);
    focusable()[0]?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [open, onClose]);
  const path = usePathname();
  const { user, data, live } = useAuth();
  return (
    <>
      <button
        className={"drawer-backdrop " + (open ? "visible" : "")}
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <aside ref={sidebarRef} className={"sidebar " + (open ? "open" : "")}>
        <Link href="/dashboard" className="brand">
          <span className="brand-icon">
            <Wrench size={24} />
          </span>
          <span>
            C.S.OTALLER<small>WORKSHOP MANAGEMENT</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Cerrar menú"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="workshop-switch">
          <span className="workshop-letter">TC</span>
          <div>
            <strong>{data.workshop.name}</strong>
            <small>Espacio de trabajo</small>
          </div>
          <ChevronsUpDown size={15} />
        </div>
        <div className="nav-label">PRINCIPAL</div>
        <nav aria-label="Navegación principal">
          {items
            .filter(([, , , admin]) => !admin || user?.role === "ADMIN")
            .map(([href, label, Icon], i) => (
              <div key={href}>
                {i === 6 && (
                  <div className="nav-label admin-label">ADMINISTRACIÓN</div>
                )}
                <Link
                  onClick={onClose}
                  href={href}
                  className={
                    path.startsWith(href) ? "nav-item active" : "nav-item"
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {href === "/ordenes" && (
                    <b>
                      {
                        data.orders.filter(
                          (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
                        ).length
                      }
                    </b>
                  )}
                </Link>
              </div>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="online-dot" />{" "}
          {live ? "Conectado al taller" : "Entorno de demostración"}
          <small>C.S.OTALLER · v1.0</small>
        </div>
      </aside>
    </>
  );
}
