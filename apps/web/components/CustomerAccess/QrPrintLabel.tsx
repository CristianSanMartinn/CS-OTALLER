"use client";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
export function QrLabelContent({
  url,
  workshop,
  plate,
}: {
  url: string;
  workshop: string;
  plate?: string;
}) {
  return (
    <div className="qr-sticker">
      <strong className="sticker-brand">{workshop}</strong>
      <span>HISTORIAL DE MANTENCIONES</span>
      {plate && <b className="sticker-plate">{plate}</b>}
      <QRCodeSVG
        value={url}
        size={208}
        level="M"
        marginSize={4}
        title="QR permanente del cliente"
      />
      <strong>Escanea y selecciona tu vehículo</strong>
      <small>Trabajos · Fotografías · Próxima mantención</small>
      <p>Conserva este QR. Se reutiliza en cada visita.</p>
      <small>Acceso público a los vehículos asociados.</small>
      <small className="sticker-demo">ETIQUETA DE DEMOSTRACIÓN</small>
    </div>
  );
}
export function QrPrintLabel(props: {
  url: string;
  workshop: string;
  plate?: string;
}) {
  return createPortal(
    <div id="customer-qr-print">
      <QrLabelContent {...props} />
    </div>,
    document.body,
  );
}
