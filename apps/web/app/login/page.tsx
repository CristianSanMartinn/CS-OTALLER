import { LoginForm } from "@/features/auth/components/LoginForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ taller?: string }>;
}) {
  const query = await searchParams;
  return (
    <LoginForm
      workshopId={typeof query.taller === "string" ? query.taller : ""}
    />
  );
}
