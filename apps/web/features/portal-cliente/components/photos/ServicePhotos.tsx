"use client";
import { useState } from "react";
import { Images, ChevronRight } from "lucide-react";
import { PhotoGallery } from "@/components/ImageUploader/PhotoGallery";
import { ImagePreview } from "@/components/ImageUploader/ImagePreview";
import type { PortalPhoto } from "../../types/portal.types";
import { PortalSection } from "../layout/PortalSection";
export function ServicePhotos({
  photos,
  service = false,
}: {
  photos: PortalPhoto[];
  service?: boolean;
}) {
  const [all, setAll] = useState(false);
  const title = service
    ? "Fotografías del servicio"
    : "Fotografías de tu vehículo";
  return (
    <div className="portal-service-photos">
      {all ? (
        <>
          <button className="portal-photo-back" onClick={() => setAll(false)}>
            Volver a la vista previa
          </button>
          <PhotoGallery photos={photos} title={title} />
        </>
      ) : (
        <PortalSection
          title={title}
          action={
            photos.length > 0 ? (
              <button
                className="portal-text-button"
                onClick={() => setAll(true)}
              >
                Ver todas ({photos.length}) <ChevronRight size={15} />
              </button>
            ) : undefined
          }
        >
          {photos.length ? (
            <div className="portal-photos-horizontal">
              {photos.slice(0, 4).map((p) => (
                <figure key={p.id}>
                  <ImagePreview
                    src={p.url}
                    description={p.description || "Fotografía del servicio"}
                  />
                  <figcaption>
                    {p.description ||
                      { BEFORE: "Antes", DURING: "Durante", AFTER: "Después" }[
                        p.category
                      ]}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="portal-photos-empty">
              <Images size={30} />
              <p>
                Aún no hay fotografías registradas
                {service ? " para este servicio" : " para este vehículo"}.
              </p>
            </div>
          )}
        </PortalSection>
      )}
    </div>
  );
}
