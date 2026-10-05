"use client";
import { apiRequest } from "@/lib/http";
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
  const { data, notify, live } = useStore();
  const [selectedPlate, setSelectedPlate] = useState(plate ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const customer = data.customers.find(
    (c) => c.id === customerId && c.workshopId === data.workshop.id,
  );
  if (!customer) return null;
  const vehicles = data.vehicles.filter((v) => v.customerId === customerId);
  const labelPlate =
    plate ??
    (vehicles.some((v) => v.plate === selectedPlate)
      ? selectedPlate
      : vehicles[0]?.plate);
  const path = live
    ? token
      ? "/mi-taller/" + encodeURIComponent(token)
      : ""
    : clientAccessPath(customer);
  async function prepare() {
    if (!customer) return;
    setBusy(true);
    try {
      if (live) {
        const result = await apiRequest<{ token: string }>(
          "customers/" + customer.id + "/portal",
          "POST",
          {},
        );
        setToken(result.token);
      }
      setOrigin(window.location.origin);
      setOpen(true);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
          {path && (
            <Link href={path} className="button">
              <ExternalLink size={16} />
              Ver como cliente
            </Link>
          )}
          <button className="button primary" disabled={busy} onClick={prepare}>
            <QrCode size={16} />
            {busy ? "Preparando…" : "Ver / imprimir QR"}
          </button>
        </div>
      </section>
      {open && (
        <Modal title="Etiqueta QR del cliente" onClose={() => setOpen(false)}>
          <div className="qr-content">
            {!plate && vehicles.length > 0 && (
              <label className="field">
                Patente para la etiqueta
                <select
                  value={labelPlate ?? ""}
                  onChange={(e) => setSelectedPlate(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plate}>
                      {v.plate} · {v.brand} {v.model}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="help-text">
              El nombre y logo se toman de Configuración del taller. La patente
              identifica esta etiqueta; el QR sigue siendo el mismo para todos
              los vehículos del cliente.
            </p>
            {url && (
              <>
                <QrLabelContent
                  url={url}
                  workshop={data.workshop.name}
                  plate={labelPlate}
                  logo={data.workshop.logo}
                  demo={!live}
                />
                <QrPrintLabel
                  url={url}
                  workshop={data.workshop.name}
                  plate={labelPlate}
                  logo={data.workshop.logo}
                  demo={!live}
                />
              </>
            )}
            <Field
              label={
                live
                  ? "Dirección del taller"
                  : "Dirección donde se ejecuta la demo"
              }
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
            {!live && (
              <p className="info-box">
                Demo: para escanear desde otro teléfono usa una dirección
                accesible por red, no localhost. Las modificaciones no se
                sincronizan todavía. Antes de imprimir etiquetas definitivas
                necesitaremos una dirección estable y almacenamiento real.
              </p>
            )}
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
