import { CustomerPortal } from "@/features/portal-cliente/components/CustomerPortal";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CustomerPortal token={token} />;
}
