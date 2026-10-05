export const codeStates: Record<string, string> = {
  Activo: "DETECTED",
  Pendiente: "PENDING",
  Resuelto: "RESOLVED",
  Ignorado: "IGNORED",
};
export const serviceStates: Record<string, string> = {
  Pendiente: "PENDING",
  "En curso": "IN_PROGRESS",
  Finalizado: "COMPLETED",
  Cancelado: "CANCELLED",
};
export const reverse = (map: Record<string, string>, v: string) =>
  Object.keys(map).find((k) => map[k] === v) ?? v;
export function mapOrder(r: any, admin: boolean) {
  return {
    id: r.id,
    workshopId: r.workshop_id,
    number: r.order_number,
    date: r.entry_day,
    time: r.entry_time,
    customerId: r.customer_id,
    vehicleId: r.vehicle_id,
    mechanicId: r.mechanic_id ?? "",
    mileage: r.mileage,
    reason: r.reason,
    symptoms: r.symptoms ?? "",
    diagnosis: r.diagnosis ?? "",
    findings: r.faults_found ?? "",
    observations: r.observations ?? "",
    status: r.status,
    cancellation:
      r.status === "CANCELLED" ? (r.cancellation ?? undefined) : undefined,
    codes: (r.codes ?? []).map((x: any) => ({
      id: x.id,
      code: x.code,
      description: x.description ?? "",
      status: reverse(codeStates, x.status),
      notes: x.observation ?? "",
    })),
    services: (r.services ?? []).map((x: any) => ({
      id: x.id,
      name: x.name,
      description: x.description ?? "",
      mechanicId: x.mechanic_id ?? "",
      price: admin ? Number(x.price) : 0,
      status: reverse(serviceStates, x.status),
    })),
    parts: (r.parts ?? []).map((x: any) => ({
      id: x.id,
      name: x.name,
      brand: x.brand ?? "",
      partNumber: x.part_number ?? "",
      quantity: Number(x.quantity),
      price: admin ? Number(x.unit_price) : 0,
      notes: x.observations ?? "",
    })),
    photos: (r.photos ?? []).map((x: any) => ({
      id: x.id,
      url: x.file_url,
      category: x.category,
      description: x.description ?? "",
      date: new Date(x.taken_at ?? x.created_at).toISOString(),
      userId: x.uploaded_by ?? "",
    })),
  };
}
