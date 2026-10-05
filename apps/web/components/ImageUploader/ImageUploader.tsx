"use client";
import { ImagePreview } from "@/components/ImageUploader/ImagePreview";
import { useRef, useState, ChangeEvent } from "react";
import { UploadCloud, Trash2, Camera } from "lucide-react";
import { Photo } from "@/features/shared/types/domain";
import { Field, SelectField } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { optimizeImage } from "@/utils/imageOptimization";
import { uid } from "@/utils/format";
export function ImageUploader({
  photos,
  onChange,
  userId,
  onBusyChange,
}: {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  userId: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { live, data } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setError("");
    if (
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            f.type,
          ) || f.size > 30 * 1024 * 1024,
      )
    ) {
      setError(
        "Selecciona imágenes JPG, PNG, WebP o GIF de hasta 30 MB. Se optimizarán automáticamente.",
      );
      return;
    }
    if (photos.length + files.length > 20) {
      setError("Máximo 20 fotografías por ficha.");
      return;
    }
    if (!files.length) return;
    setBusy(true);
    onBusyChange?.(true);
    try {
      const remaining =
        1500000 - photos.reduce((total, p) => total + p.url.length, 0);
      if (live && remaining < 10000)
        throw new Error(
          "La ficha ya tiene muchas fotografías. Quita alguna antes de agregar otra.",
        );
      const imageBytes = live
        ? Math.min(
            180000,
            Math.floor(remaining / (Math.max(1, files.length) * 1.4)),
          )
        : 180000;
      const added = await Promise.all(
        files.map(async (file) => ({
          id: uid(),
          url: await optimizeImage(file, { maxBytes: imageBytes }),
          category: "BEFORE" as const,
          description: file.name,
          date: new Date().toISOString(),
          userId,
        })),
      );
      if (
        live &&
        [...photos, ...added].reduce((total, p) => total + p.url.length, 0) >
          1500000
      ) {
        setError(
          "No queda espacio para estas fotografías. Quita alguna o selecciona menos imágenes.",
        );
        return;
      }
      onChange([...photos, ...added]);
      if (input.current) input.current.value = "";
      if (camera.current) camera.current.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <>
      <div className="upload-zone">
        <UploadCloud size={29} />
        <strong>Agrega evidencia del trabajo</strong>
        <p>Selecciona fotografías desde tu computador o celular.</p>
        <button
          type="button"
          className="button small"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Preparando imágenes…" : "Seleccionar imágenes"}
        </button>
        <button
          type="button"
          className="button small"
          disabled={busy}
          onClick={() => camera.current?.click()}
        >
          <Camera size={16} /> Tomar foto
        </button>
        <small>
          Fotos de hasta 30 MB · Se ajustan automáticamente para guardarlas
        </small>
        <input
          ref={camera}
          hidden
          type="file"
          accept="image/*"
          capture="environment"
          onChange={upload}
        />
        <input
          ref={input}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={upload}
        />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="photo-grid">
        {photos.map((p) => (
          <div className="photo-card" key={p.id}>
            <ImagePreview
              src={p.url}
              description={p.description || "Evidencia del vehículo"}
            />
            <div>
              <SelectField
                label="Categoría"
                value={p.category}
                onChange={(e) =>
                  onChange(
                    photos.map((x) =>
                      x.id === p.id
                        ? {
                            ...x,
                            category: e.target.value as Photo["category"],
                          }
                        : x,
                    ),
                  )
                }
              >
                <option value="BEFORE">ANTES</option>
                <option value="DURING">DURANTE</option>
                <option value="AFTER">DESPUÉS</option>
              </SelectField>
              <Field
                label="Descripción"
                value={p.description}
                onChange={(e) =>
                  onChange(
                    photos.map((x) =>
                      x.id === p.id ? { ...x, description: e.target.value } : x,
                    ),
                  )
                }
              />
              <small>
                {new Date(p.date).toLocaleDateString("es-CL")} ·{" "}
                {data.users.find((u) => u.id === p.userId)?.name ??
                  "Registrado en el taller"}
              </small>
              <button
                type="button"
                className="text-button danger"
                onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
