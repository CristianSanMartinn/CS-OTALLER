import { ClientDetails } from "@/features/clientes/components/ClientDetails";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDetails id={id} />;
}
