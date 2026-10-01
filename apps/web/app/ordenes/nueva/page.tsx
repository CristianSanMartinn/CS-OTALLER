import { WorkOrderForm } from "@/features/ordenes/components/WorkOrderForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; vehiculo?: string }>;
}) {
  const query = await searchParams;
  return (
    <WorkOrderForm
      key={(query.vehiculo ?? "") + (query.cliente ?? "")}
      initialCustomerId={query.cliente}
      initialVehicleId={query.vehiculo}
    />
  );
}
