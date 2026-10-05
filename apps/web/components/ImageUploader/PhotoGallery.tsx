"use client";
import { useState } from "react";
import { Panel, EmptyState } from "@/components/ui/primitives";
import { ImagePreview } from "@/components/ImageUploader/ImagePreview";
import { Photo } from "@/features/shared/types/domain";
import { dateLabel } from "@/utils/format";
const categories = { BEFORE: "ANTES", DURING: "DURANTE", AFTER: "DESPUÉS" };
export function PhotoGallery({
  photos,
  title = "Fotografías de tu vehículo",
  subtitle = "Evidencias de la recepción y de los trabajos realizados",
}: {
  photos: Omit<Photo, "userId">[];
  title?: string;
  subtitle?: string;
}) {
  const [filter, setFilter] = useState("ALL");
  const rows = photos.filter((p) => filter === "ALL" || p.category === filter);
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        <select
          aria-label="Filtrar fotografías"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">Todas</option>
          {Object.entries(categories).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      }
    >
      <div className="photo-grid">
        {rows.length ? (
          rows.map((p) => (
            <figure key={p.id}>
              <ImagePreview
                src={p.url}
                description={p.description || "Fotografía del vehículo"}
              />
              <figcaption>
                <span className="badge received">{categories[p.category]}</span>
                <p>{p.description}</p>
                <small>{dateLabel(p.date.slice(0, 10))}</small>
              </figcaption>
            </figure>
          ))
        ) : (
          <EmptyState
            title="Sin fotografías en esta categoría"
            description="Las fotografías que registre el taller aparecerán aquí."
          />
        )}
      </div>
    </Panel>
  );
}
