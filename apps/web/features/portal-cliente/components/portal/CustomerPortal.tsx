"use client";
import { useVehicleDetail } from "../../hooks/useVehicleDetail";
import { PortalSection } from "../layout/PortalSection";
import { PortalEntrance } from "../layout/PortalLoadingScreen";
import { VehicleDetail } from "./VehicleDetail";
export function CustomerPortal({
  token,
  clientVehicleId,
}: {
  token: string;
  clientVehicleId?: string;
}) {
  const result = useVehicleDetail(token, clientVehicleId);
  const content = !result.view ? (
    <div className="vehicle-detail-portal">
      <main className="vehicle-detail-content">
        <PortalSection
          title={result.loading ? "Cargando historial…" : "Ficha no disponible"}
        >
          <p>
            {result.loading
              ? "Estamos consultando los registros del taller."
              : "Solicita al taller un QR válido para consultar este vehículo."}
          </p>
        </PortalSection>
      </main>
    </div>
  ) : (
    <VehicleDetail
      key={result.view.vehicle.id}
      view={result.view}
      token={token}
      vehicles={result.vehicles}
      live={result.live}
      legacy={!clientVehicleId}
    />
  );
  return (
    <PortalEntrance
      key={token}
      token={token}
      ready={!result.loading}
      logo={result.view?.workshop.logo}
    >
      {content}
    </PortalEntrance>
  );
}
