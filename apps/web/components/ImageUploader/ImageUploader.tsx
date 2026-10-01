"use client";
import { ImagePreview } from "@/components/ImageUploader/ImagePreview";
import { useRef, useState, ChangeEvent } from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import { Photo } from "@/features/shared/types/domain";
import { Field, SelectField } from "@/components/ui/primitives";
import { uid } from "@/utils/format";
export function ImageUploader({
  photos,
  onChange,
  userId,
}: {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  userId: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setError("");
    if (
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            f.type,
          ) || f.size > 8 * 1024 * 1024,
      )
    ) {
      setError("Selecciona imágenes JPG, PNG, WebP o GIF de hasta 8 MB.");
      return;
    }
    if (photos.length + files.length > 20) {
      setError("Máximo 20 fotografías por orden.");
      return;
    }
    try {
      const added = await Promise.all(
        files.map(
          (file) =>
            new Promise<Photo>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: uid(),
                  url: String(reader.result),
                  category: "BEFORE",
                  description: file.name,
                  date: new Date().toISOString(),
                  userId,
                });
              reader.onerror = () =>
                reject(new Error("No se pudo leer la imagen"));
              reader.readAsDataURL(file);
            }),
        ),
      );
      onChange([...photos, ...added]);
      if (input.current) input.current.value = "";
    } catch {
      setError("No se pudieron cargar las imágenes. Inténtalo nuevamente.");
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
          onClick={() => input.current?.click()}
        >
          Seleccionar imágenes
        </button>
        <small>JPG, PNG, WebP o GIF · Hasta 8 MB por imagen</small>
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
                {new Date(p.date).toLocaleDateString("es-CL")} · {p.userId}
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
