import { CustomerVehiclesPortal } from "@/features/portal-cliente/components/CustomerVehiclesPortal";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CustomerVehiclesPortal token={token} />;
}
