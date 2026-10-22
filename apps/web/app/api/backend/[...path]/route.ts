import { NextRequest } from "next/server";
import { backendProxy, logout } from "@/lib/server/backendProxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (path.join("/") === "auth/logout" && request.method === "POST")
    return logout(request);
  return backendProxy(request, path);
}
export { handler as GET, handler as POST, handler as PATCH };
