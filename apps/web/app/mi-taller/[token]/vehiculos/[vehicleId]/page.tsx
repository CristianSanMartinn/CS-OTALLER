import { CustomerPortal } from "@/features/portal-cliente/components/portal/CustomerPortal";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string; vehicleId: string }>;
}) {
  const { token, vehicleId } = await params;
  return <CustomerPortal token={token} clientVehicleId={vehicleId} />;
}
