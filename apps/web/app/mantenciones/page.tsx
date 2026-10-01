import { MaintenancePage } from "@/features/mantenciones/components/MaintenancePage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string }>;
}) {
  const query = await searchParams;
  return <MaintenancePage key={query.orden ?? "all"} orderId={query.orden} />;
}
