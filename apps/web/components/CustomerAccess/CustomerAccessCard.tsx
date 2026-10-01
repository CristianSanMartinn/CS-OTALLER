"use client";
import { useState } from "react";
import Link from "next/link";
import { QrCode, ExternalLink, Copy, Printer } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { Field } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { clientAccessPath } from "@/features/portal-cliente/services/clientAccessService";
import { QrLabelContent, QrPrintLabel } from "./QrPrintLabel";
export function CustomerAccessCard({
  customerId,
  plate,
}: {
  customerId: string;
  plate?: string;
}) {
  const { data, notify } = useStore();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const customer = data.customers.find(
    (c) => c.id === customerId && c.workshopId === data.workshop.id,
  );
  if (!customer) return null;
  const path = clientAccessPath(customer);
  let url = "";
  try {
    const parsed = new URL(origin);
    if (
      ["http:", "https:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    )
      url = parsed.origin + path;
  } catch {}
  return (
    <>
      <section className="customer-access">
        <span className="stat-icon blue">
          <QrCode size={24} />
        </span>
        <div>
          <h2>QR permanente del cliente</h2>
          <p>
            El mismo código en todos sus autos. Selecciona el vehículo para ver
            su historial.
          </p>
        </div>
        <div className="row-actions">
          <Link href={path} className="button">
            <ExternalLink size={16} />
            Ver como cliente
          </Link>
          <button
            className="button primary"
            onClick={() => {
              setOrigin(window.location.origin);
              setOpen(true);
            }}
          >
            <QrCode size={16} />
            Ver / imprimir QR
          </button>
        </div>
      </section>
      {open && (
        <Modal title="Etiqueta QR del cliente" onClose={() => setOpen(false)}>
          <div className="qr-content">
            {url && (
              <>
                <QrLabelContent
                  url={url}
                  workshop={data.workshop.name}
                  plate={plate}
                />
                <QrPrintLabel
                  url={url}
                  workshop={data.workshop.name}
                  plate={plate}
                />
              </>
            )}
            <Field
              label="Dirección donde se ejecuta la demo"
              value={origin}
              placeholder="https://mi-taller.example"
              onChange={(e) => setOrigin(e.target.value)}
            />
            {!url && (
              <p className="error">
                Ingresa una dirección HTTP o HTTPS válida.
              </p>
            )}
            {url && (
              <>
                <code className="qr-url">{url}</code>
                <div className="row-actions">
                  <button
                    className="button primary"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} />
                    Imprimir etiqueta QR
                  </button>
                  <button
                    className="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        notify("Enlace copiado");
                      } catch {
                        notify("Copia manualmente el enlace mostrado.");
                      }
                    }}
                  >
                    <Copy size={15} />
                    Copiar enlace
                  </button>
                </div>
              </>
            )}
            <p className="help-text">
              La etiqueta mide 80 mm de ancho. Imprime a escala 100%, sin
              encabezados ni pies del navegador. Cada auto puede llevar su
              patente y el mismo QR del cliente.
            </p>
            <p className="info-box">
              Demo: para escanear desde otro teléfono usa una dirección
              accesible por red, no localhost. Las modificaciones no se
              sincronizan todavía. Antes de imprimir etiquetas definitivas
              necesitaremos una dirección estable y almacenamiento real.
            </p>
            <p className="help-text">
              Acceso público: cualquiera que tenga el código verá los vehículos
              asociados y sus mantenciones. La etiqueta no incluye RUT ni datos
              de contacto personales.
            </p>
            <Link
              href={path}
              className="text-link"
              onClick={() => setOpen(false)}
            >
              Abrir vista cliente en esta sesión →
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
