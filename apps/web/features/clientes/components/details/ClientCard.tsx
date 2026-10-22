import { Customer } from "@/features/shared/types/domain";
import { DetailGrid } from "@/components/ui/primitives";
import { dateLabel } from "@/utils/format";
export function ClientCard({ client }: { client: Customer }) {
  return (
    <DetailGrid
      items={[
        ["RUT", client.rut],
        ["Teléfono", client.phone],
        ["Correo", client.email],
        ["Dirección", client.address],
        ["Registrado", dateLabel(client.createdAt)],
        ["Observaciones", client.notes],
      ]}
    />
  );
}
