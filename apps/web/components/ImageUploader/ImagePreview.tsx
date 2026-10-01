"use client";
import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal/Modal";
export function ImagePreview({
  src,
  description,
}: {
  src: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="image-preview-trigger"
        aria-label={"Ampliar fotografía: " + description}
        onClick={() => setOpen(true)}
      >
        <Image
          unoptimized
          width={640}
          height={400}
          src={src}
          alt={description}
        />
      </button>
      {open && (
        <Modal title="Evidencia fotográfica" onClose={() => setOpen(false)}>
          <div className="full-image-preview">
            <Image
              unoptimized
              width={1200}
              height={900}
              src={src}
              alt={description}
            />
            <p>{description}</p>
          </div>
        </Modal>
      )}
    </>
  );
}
