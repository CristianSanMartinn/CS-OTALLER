import { WorkOrderForm } from "@/features/ordenes/components/WorkOrderForm";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkOrderForm key={id} id={id} />;
}
