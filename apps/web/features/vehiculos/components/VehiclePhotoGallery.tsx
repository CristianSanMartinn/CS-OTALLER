"use client";
import { Panel } from "@/components/ui/primitives";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Vehicle } from "@/features/shared/types/domain";
import { PhotoGallery } from "@/components/ImageUploader/PhotoGallery";
export function VehiclePhotoGallery({ vehicle }: { vehicle: Vehicle }) {
  const { data, user, update, notify } = useStore();
  const evidence = data.orders
    .filter(
      (o) => o.vehicleId === vehicle.id && o.workshopId === vehicle.workshopId,
    )
    .flatMap((o) => o.photos);
  return (
    <>
      <Panel
        title="Galería del vehículo"
        subtitle="Agrega fotos de recepción o del estado del vehículo, sin crear una orden."
      >
        <div className="panel-padding">
          <ImageUploader
            photos={vehicle.photos ?? []}
            userId={user!.id}
            onChange={(photos) => {
              update((d) => ({
                ...d,
                vehicles: d.vehicles.map((v) =>
                  v.id === vehicle.id && v.workshopId === user!.workshopId
                    ? { ...v, photos }
                    : v,
                ),
              }));
              notify("Galería actualizada en esta sesión");
            }}
          />
          <p className="help-text">
            Estas fotos también se muestran en la vista del cliente. Se
            conservan mientras esta página permanezca abierta.
          </p>
        </div>
      </Panel>
      <PhotoGallery photos={evidence} />
    </>
  );
}
