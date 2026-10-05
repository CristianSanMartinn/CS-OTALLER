export async function apiRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/backend/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Respuesta inválida del servidor." }));
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(" · ")
      : data.message;
    throw Object.assign(
      new Error(message ?? "No se pudo completar la operación."),
      { status: response.status },
    );
  }
  return data as T;
}
