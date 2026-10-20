"use client";
import Image from "next/image";
import { ScanLine, PlusCircle } from "lucide-react";
import { usePublicPortal } from "../../hooks/usePublicPortal";
import { useStore } from "@/features/shared/components/store/StoreProvider";
import { clientAccess } from "../../services/clientAccessService";
import { PortalEntrance } from "../layout/PortalLoadingScreen";
import { PublicVehicleCard } from "./PublicVehicleCard";
import styles from "./CustomerVehiclesPortal.module.css";
export function CustomerVehiclesPortal({ token }: { token: string }) {
  const { data, live } = useStore();
  const remote = usePublicPortal<NonNullable<ReturnType<typeof clientAccess>>>(
    "portal/" + encodeURIComponent(token),
    live,
  );
  const access = live ? remote.data : clientAccess(data, token);
  const ready = !live || !!access || !!remote.error;
  const content = !access ? (
    <div className={styles.publicGarage}>
      <main className={styles.publicGarageContent}>
        <h1>
          {live && !remote.error
            ? "Cargando tus vehículos…"
            : "Código no disponible"}
        </h1>
        <p>
          {live && !remote.error
            ? "Estamos consultando el historial del taller."
            : "Solicita al taller el QR correspondiente a tu registro."}
        </p>
      </main>
    </div>
  ) : (
    <div className={styles.publicGarage}>
      <main className={styles.publicGarageContent}>
        <header className={styles.publicWorkshopLogo}>
          {access.workshop.logo ? (
            <Image
              unoptimized
              loading="eager"
              src={access.workshop.logo}
              width={240}
              height={240}
              alt={"Logo de " + access.workshop.name}
            />
          ) : (
            <strong>{access.workshop.name}</strong>
          )}
        </header>
        <section className={styles.publicWelcome}>
          <h1>Bienvenido</h1>
          <p>
            Aquí puedes consultar el historial y estado de mantenimiento de tus
            vehículos.
          </p>
        </section>
        <section className={styles.publicVehiclesSection}>
          <h2>Mis vehículos</h2>
          <p>
            Selecciona un vehículo para ver su historial, fotografías y próximas
            mantenciones.
          </p>
          <div className={styles.publicVehiclesList}>
            {access.vehicles.length ? (
              access.vehicles.map((v) => (
                <PublicVehicleCard key={v.id} vehicle={v} token={token} />
              ))
            ) : (
              <div className={styles.publicEmpty}>
                <h3>Aún no hay vehículos asociados</h3>
                <p>El taller agregará tus vehículos a este mismo QR.</p>
              </div>
            )}
          </div>
        </section>
        <aside className={styles.publicQrInfo}>
          <span>
            <ScanLine size={31} />
          </span>
          <div>
            <strong>
              Un mismo QR para todos <em>tus vehículos</em>
            </strong>
            <p>
              En cada visita, el taller actualiza tu historial con los trabajos
              registrados. Conserva tu etiqueta.
            </p>
          </div>
        </aside>
        <aside className={styles.publicNewVehicle}>
          <PlusCircle size={32} />
          <div>
            <strong>¿Tienes un nuevo vehículo?</strong>
            <p>
              La información se agregará cuando el taller lo registre en tu
              próxima visita.
            </p>
          </div>
        </aside>
        <footer className={styles.publicGarageFooter}>
          Este enlace permite consultar únicamente información del historial
          automotriz. No se muestran datos personales del propietario.
          <p>
            Cualquier persona que tenga este QR puede consultar el historial.
          </p>
          {!live && <span>Vista de demostración</span>}
        </footer>
      </main>
    </div>
  );
  return (
    <PortalEntrance
      key={token}
      token={token}
      ready={ready}
      logo={access?.workshop.logo}
    >
      {content}
    </PortalEntrance>
  );
}
