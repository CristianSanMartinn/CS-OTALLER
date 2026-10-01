import { OrdersPage } from "@/features/ordenes/components/OrdersPage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const query = await searchParams;
  return (
    <OrdersPage key={query.estado ?? "all"} initialStatus={query.estado} />
  );
}
