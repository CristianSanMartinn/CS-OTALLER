"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/http";
export function usePublicPortal<T>(path: string, enabled: boolean) {
  const [state, setState] = useState<{
    path: string;
    data: T | null;
    error: string;
  }>({ path: "", data: null, error: "" });
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    apiRequest<T>(path)
      .then((data) => {
        if (current) setState({ path, data, error: "" });
      })
      .catch((e) => {
        if (current) setState({ path, data: null, error: e.message });
      });
    return () => {
      current = false;
    };
  }, [path, enabled]);
  return state.path === path ? state : { data: null, error: "" };
}
