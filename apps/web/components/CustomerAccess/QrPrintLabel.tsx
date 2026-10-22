"use client";
import { createPortal } from "react-dom";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
type LabelProps = {
  url: string;
  workshop: string;
  plate?: string;
  logo?: string;
  demo?: boolean;
};
export function QrLabelContent({
  url,
  workshop,
  plate,
  logo,
  demo = false,
}: LabelProps) {
  return (
    <article
      className="qr-sticker"
      aria-label={"Etiqueta QR de " + workshop + (plate ? " · " + plate : "")}
    >
      <header className={"sticker-header" + (logo ? " has-logo" : "")}>
        {logo ? (
          <Image
            unoptimized
            src={logo}
            alt={"Logo de " + workshop}
            loading="eager"
            width={340}
            height={340}
            className="sticker-logo"
          />
        ) : (
          <svg
            className="sticker-car"
            viewBox="0 0 400 110"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M25 78H52L83 61L139 27C161 17 218 14 242 27L290 56L347 65L375 80V93H341M306 93H111M75 93H43L25 78Z"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M97 59H283L236 30C211 22 166 24 146 31L97 59Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M77 94a19 19 0 0 1 38 0M304 94a19 19 0 0 1 38 0M4 68H54M15 49H82M25 88H53"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
        {!logo && (
          <>
            <strong className="sticker-brand">{workshop}</strong>
            <span className="sticker-specialty">MECÁNICA AUTOMOTRIZ</span>
          </>
        )}
      </header>
      <div className="sticker-body">
        <h2>HISTORIAL DE MANTENCIONES</h2>
        <div className="sticker-divider" />
        {plate && <b className="sticker-plate">{plate}</b>}
        <div className="sticker-qr-frame">
          <QRCodeSVG
            value={url}
            size={208}
            level="M"
            marginSize={4}
            title="QR permanente del cliente"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <strong className="sticker-instruction">
          Escanea y selecciona tu vehículo
        </strong>
        <p className="sticker-features">
          Trabajos · Fotografías · Próxima mantención
        </p>
        <p className="sticker-note">
          Conserva este QR. Se reutiliza en cada visita.
          <br />
          Acceso público a los vehículos asociados.
        </p>
        {demo && (
          <small className="sticker-demo">ETIQUETA DE DEMOSTRACIÓN</small>
        )}
      </div>
    </article>
  );
}
export function QrPrintLabel(props: LabelProps) {
  return createPortal(
    <div id="customer-qr-print">
      <QrLabelContent {...props} />
    </div>,
    document.body,
  );
}
