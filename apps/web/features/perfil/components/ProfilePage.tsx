"use client";
import { PageHeading } from "@/components/ui/primitives";
import { ProfileForm } from "./ProfileForm";
import { useStore } from "@/features/shared/components/StoreProvider";
export function ProfilePage() {
  const { user } = useStore();
  if (!user) return null;
  return (
    <>
      <PageHeading
        title="Mi perfil"
        description="Tu información personal y foto de perfil."
      />
      <ProfileForm key={user.id} />
    </>
  );
}
