import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import type { PortalWorkshop } from "../../types/portal.types";
export function PortalHeader({
  workshop,
  home,
  detail,
  onBack,
}: {
  workshop: PortalWorkshop;
  home: string;
  detail?: string;
  onBack?: () => void;
}) {
  return (
    <header className={"vehicle-portal-header" + (detail ? " is-detail" : "")}>
      {onBack ? (
        <button className="portal-return" onClick={onBack}>
          <ArrowLeft size={20} /> Volver al resumen
        </button>
      ) : (
        <Link href={home} className="portal-return">
          <ArrowLeft size={20} /> Mis vehículos
        </Link>
      )}
      <div className="vehicle-portal-brand">
        {workshop.logo ? (
          <Image
            src={workshop.logo}
            alt={"Logo de " + workshop.name}
            width={240}
            height={240}
            unoptimized
            priority
          />
        ) : (
          <strong>
            <Wrench size={25} />
            {workshop.name}
          </strong>
        )}
      </div>
      <div className="vehicle-portal-welcome">
        <span>HISTORIAL DIGITAL DEL TALLER</span>
        <h1>
          {detail ? "Detalle de mantenimiento" : "Tu vehículo, en buenas manos"}
        </h1>
        <p>
          {detail ??
            "Consulta los trabajos realizados, sus fotografías y los próximos cuidados de tu vehículo."}
        </p>
      </div>
    </header>
  );
}
