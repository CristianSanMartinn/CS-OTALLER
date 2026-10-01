import { VehicleDetails } from "@/features/vehiculos/components/VehicleDetails";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetails id={id} />;
}
