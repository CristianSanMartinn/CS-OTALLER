"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/http";
import type { OilProduct } from "../types/oil.types";

export function useOilCatalog() {
  const [products, setProducts] = useState<OilProduct[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<OilProduct[]>("maintenance/oils", "GET", undefined, {
      signal: controller.signal,
    })
      .then(setProducts)
      .catch((failure) => {
        if (!controller.signal.aborted) setError((failure as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return { products, loading, error };
}
