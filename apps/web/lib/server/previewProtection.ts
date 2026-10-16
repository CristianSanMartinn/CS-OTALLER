import "server-only";

export function previewProtectionHeaders(apiUrl: URL): Record<string, string> {
  if (process.env.VERCEL_ENV !== "preview") return {};

  const secret = process.env.API_PREVIEW_BYPASS_SECRET?.trim();
  if (!secret) return {};

  if (
    apiUrl.protocol !== "https:" ||
    !apiUrl.hostname.endsWith(".vercel.app") ||
    apiUrl.username ||
    apiUrl.password
  ) {
    throw new Error("El acceso de Preview requiere una API HTTPS de Vercel.");
  }

  return { "x-vercel-protection-bypass": secret };
}
