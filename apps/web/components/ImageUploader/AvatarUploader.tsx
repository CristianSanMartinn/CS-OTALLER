"use client";
import { ChangeEvent, useRef, useState } from "react";
import { Camera, UploadCloud } from "lucide-react";
import Image from "next/image";
import { Avatar } from "@/components/ui/primitives";
import { optimizeImage } from "@/utils/imageOptimization";
export function AvatarUploader({
  name,
  value,
  onChange,
  onBusyChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function photo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        )
      )
        throw new Error("Selecciona una foto JPG, PNG, WebP o GIF.");
      onChange(
        await optimizeImage(file, { maxBytes: 180000, maxDimension: 960 }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="panel-padding">
      <h3>Fotografía del trabajador</h3>
      <div className="profile-photo">
        {value ? (
          <Image
            unoptimized
            src={value}
            alt={"Fotografía de " + name}
            width={120}
            height={120}
            style={{ objectFit: "cover", borderRadius: 16 }}
          />
        ) : (
          <Avatar name={name} />
        )}
        <div className="row-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <UploadCloud size={16} />
            {busy ? "Preparando foto…" : "Seleccionar foto"}
          </button>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => camera.current?.click()}
          >
            <Camera size={16} />
            Tomar foto
          </button>
          {value && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => onChange("")}
            >
              Quitar foto
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={photo}
        />
        <input
          ref={camera}
          type="file"
          hidden
          accept="image/*"
          capture="user"
          onChange={photo}
        />
      </div>
      <p className="help-text">
        Foto opcional · Hasta 30 MB · Se optimiza automáticamente y se guarda al
        confirmar el formulario.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
