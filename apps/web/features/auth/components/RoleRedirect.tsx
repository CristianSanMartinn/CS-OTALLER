"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
export function RoleRedirect() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? "/dashboard" : "/login");
  }, [ready, user, router]);
  return <div className="loading">Abriendo tu espacio de trabajo…</div>;
}
