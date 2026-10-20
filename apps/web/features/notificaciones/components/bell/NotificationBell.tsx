"use client";
import styles from "./NotificationBell.module.css";
import { Bell, Check, RefreshCw, UserRound, Car, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useNotifications } from "../../hooks/useNotifications";
export function NotificationBell({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { items, unread, error, busy, refresh, read, live } =
    useNotifications();
  const wrap = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) onClose();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onClose]);
  return (
    <div className={styles.notificationWrap} ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className={`icon-button ${styles.notificationTrigger}`}
        aria-label={
          "Ver notificaciones" + (unread ? ", " + unread + " sin leer" : "")
        }
        aria-expanded={open}
        aria-controls="notification-inbox"
        onClick={() => {
          onToggle();
          if (!open) void refresh();
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className={styles.notificationCount}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id="notification-inbox"
          className={`${styles.notificationPopover} ${styles.notificationInbox}`}
          aria-label="Notificaciones del taller"
        >
          <div className={styles.notificationHeading}>
            <strong>Notificaciones</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Actualizar avisos"
              onClick={() => void refresh()}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          {unread > 0 && (
            <button
              type="button"
              className={`text-link ${styles.notificationReadAll}`}
              disabled={busy}
              onClick={() => void read()}
            >
              <Check size={14} /> Marcar todas como leídas
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          <div className={styles.notificationList}>
            {items.length === 0 ? (
              <div className={styles.notificationEmpty}>
                <Bell size={26} />
                <strong>No hay avisos todavía</strong>
                <p>
                  {live
                    ? "Aquí aparecerán los nuevos clientes, vehículos y mantenciones del taller."
                    : "Los avisos se reciben al utilizar el sistema conectado."}
                </p>
              </div>
            ) : (
              items.map((item) => {
                const Icon =
                  item.kind === "customer"
                    ? UserRound
                    : item.kind === "vehicle"
                      ? Car
                      : Wrench;
                return (
                  <article
                    key={item.id}
                    className={
                      styles.notificationItem +
                      " " +
                      (!item.readAt ? styles.isUnread : "")
                    }
                  >
                    <Icon size={19} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString("es-CL", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      <div className={styles.notificationActions}>
                        {item.href && (
                          <Link
                            href={item.href}
                            onClick={() => {
                              void read(item.id);
                              onClose();
                            }}
                          >
                            Ver ficha
                          </Link>
                        )}
                        {!item.readAt && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void read(item.id)}
                          >
                            Marcar leído
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
