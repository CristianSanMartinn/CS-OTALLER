import { NextRequest, NextResponse } from "next/server";
const cookieName = "otaller.auth";
const protectedPaths =
  /^(auth\/(me|profile)|customers(?:\/[0-9a-f-]{36}(?:\/(portal|archive|restore))?)?|users(?:\/[0-9a-f-]{36})?|work-orders(?:\/[0-9a-f-]{36}(?:\/cancel)?)?|appointments(?:\/[0-9a-f-]{36}(?:\/cancel)?)?|maintenance|workshop(?:\/(activity|related-customers))?|vehicles(?:\/[0-9a-f-]{36})?)$/i;
export async function backendProxy(request: NextRequest, segments: string[]) {
  const path = segments.join("/");
  const publicRoute =
    ["auth/login", "auth/setup", "auth/register"].includes(path) ||
    (request.method === "GET" &&
      /^portal\/[0-9a-f-]{36}(?:\/vehicles\/[0-9a-f-]{36})?$/i.test(path));
  if (!publicRoute && !protectedPaths.test(path))
    return NextResponse.json(
      { message: "Ruta no disponible." },
      { status: 404 },
    );
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== request.nextUrl.origin)
    )
      return NextResponse.json(
        { message: "Origen no permitido." },
        { status: 403 },
      );
  }
  if (path === "auth/login" && request.method !== "POST")
    return NextResponse.json(
      { message: "Método no permitido." },
      { status: 405 },
    );
  const rawBase = process.env.API_URL;
  if (!rawBase)
    return NextResponse.json(
      { message: "Falta configurar API_URL en el servidor del frontend." },
      { status: 503 },
    );
  const token = request.cookies.get(cookieName)?.value;
  if (!publicRoute && !token)
    return NextResponse.json(
      { message: "Inicia sesión para continuar." },
      { status: 401 },
    );
  let payload: string | undefined;
  try {
    if (request.method !== "GET") {
      payload = await request.text();
      if (payload.length > 2000000)
        return NextResponse.json(
          { message: "Solicitud demasiado grande." },
          { status: 413 },
        );
    }
    const base = new URL(rawBase);
    if (
      process.env.NODE_ENV === "production" &&
      base.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(base.hostname)
    )
      throw new Error("La API debe usar HTTPS.");
    const url = new URL(base.toString().replace(/\/$/, "") + "/" + path);
    const upstream = await fetch(url, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: payload,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const result = await upstream
      .json()
      .catch(() => ({ message: "La API devolvió una respuesta inválida." }));
    if (path === "auth/login" && upstream.ok) {
      const response = NextResponse.json({ user: result.user });
      const remember = JSON.parse(payload ?? "{}").remember === true;
      response.cookies.set(cookieName, result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(remember ? { maxAge: result.expiresIn } : {}),
      });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const response = NextResponse.json(result, { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    if (upstream.status === 401) response.cookies.delete(cookieName);
    return response;
  } catch {
    return NextResponse.json(
      {
        message:
          "No se pudo conectar con la API. Revisa su despliegue y API_URL.",
      },
      { status: 502 },
    );
  }
}
export function logout(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== request.nextUrl.origin)
  )
    return NextResponse.json(
      { message: "Origen no permitido." },
      { status: 403 },
    );
  const response = NextResponse.json({ message: "Sesión cerrada." });
  response.cookies.delete(cookieName);
  return response;
}
