"use client";
import { useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Vehicle } from "@/features/shared/types/domain";
import { PhotoGallery } from "@/components/ImageUploader/PhotoGallery";
export function VehiclePhotoGallery({ vehicle }: { vehicle: Vehicle }) {
  const { data, user, saveVehicle, notify, live } = useStore();
  const [photos, setPhotos] = useState(vehicle.photos ?? []);
  const [preparing, setPreparing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveVehicle({ ...vehicle, photos }, true);
      notify("Fotografías del vehículo guardadas");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
          {user?.role === "ADMIN" ? (
            <ImageUploader
              photos={photos}
              userId={user!.id}
              onChange={setPhotos}
              onBusyChange={setPreparing}
            />
          ) : (
            <PhotoGallery photos={vehicle.photos ?? []} />
          )}
          {user?.role === "ADMIN" && (
            <button
              type="button"
              className="button primary"
              disabled={busy || preparing}
              onClick={save}
            >
              {busy ? "Guardando…" : "Guardar fotografías"}
            </button>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="help-text">
            Estas fotos también se muestran en la vista del cliente. Se guardan
            al pulsar Guardar fotografías.{" "}
            {live
              ? "Se conservan en el historial del vehículo."
              : "Datos de demostración."}
          </p>
        </div>
      </Panel>
      <PhotoGallery photos={evidence} />
    </>
  );
}
