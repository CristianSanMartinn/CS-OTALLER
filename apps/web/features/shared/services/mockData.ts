import { Store, WorkOrder } from "../types/domain";
import { today } from "@/utils/format";
export const WORKSHOP_ID = "workshop-otaller";
export function createMockData(): Store {
  const workshopId = WORKSHOP_ID;
  const date = today();
  const customers = [
    [
      "c1",
      "Matías González",
      "16.482.315-7",
      "+56 9 7842 1930",
      "matias.g@email.com",
      "Av. Los Leones 1450, Providencia",
    ],
    [
      "c2",
      "Camila Fuentes",
      "18.735.290-4",
      "+56 9 6231 4509",
      "camila.f@email.com",
      "Los Olmos 342, Ñuñoa",
    ],
    [
      "c3",
      "Rodrigo Pérez",
      "14.923.671-2",
      "+56 9 9120 8834",
      "rodrigo.p@email.com",
      "Av. Grecia 2250, Ñuñoa",
    ],
    [
      "c4",
      "Valentina Rojas",
      "19.302.486-5",
      "+56 9 5632 7741",
      "valentina.r@email.com",
      "Manuel Montt 980, Providencia",
    ],
    [
      "c5",
      "Transportes del Sur",
      "76.482.310-6",
      "+56 2 2450 8890",
      "flota@transportes.example",
      "Camino Industrial 420, Quilicura",
    ],
    [
      "c6",
      "Javier Muñoz",
      "15.630.228-9",
      "+56 9 8921 3400",
      "javier.m@email.com",
      "Las Encinas 830, La Florida",
    ],
  ].map(([id, name, rut, phone, email, address]) => ({
    id,
    workshopId,
    name,
    rut,
    phone,
    email,
    address,
    createdAt: "2026-08-12",
    notes: "",
  }));
  const users = [
    {
      id: "u1",
      workshopId,
      name: "Cristian Soto",
      email: "admin@otaller.cl",
      role: "ADMIN" as const,
      active: true,
      rut: "17.452.381-2",
      phone: "+56 9 7412 3800",
      specialty: "Administración",
    },
    {
      id: "u2",
      workshopId,
      name: "Diego Morales",
      email: "mecanico@otaller.cl",
      role: "WORKER" as const,
      active: true,
      rut: "18.431.267-0",
      phone: "+56 9 8765 4321",
      specialty: "Mecánica general",
    },
    {
      id: "u3",
      workshopId,
      name: "Felipe Contreras",
      email: "felipe@otaller.cl",
      role: "WORKER" as const,
      active: true,
      rut: "16.231.456-8",
      phone: "+56 9 6123 4500",
      specialty: "Diagnóstico electrónico",
    },
    {
      id: "u4",
      workshopId,
      name: "Andrés Silva",
      email: "andres@otaller.cl",
      role: "WORKER" as const,
      active: false,
      rut: "19.112.456-3",
      phone: "+56 9 7456 1230",
      specialty: "Suspensión y frenos",
    },
  ];
  const vehicles = [
    [
      "v1",
      "c1",
      "JKPL-84",
      "Toyota",
      "Corolla",
      "1.8 GLI",
      "2020",
      "158430",
      "Gris plata",
    ],
    [
      "v2",
      "c2",
      "LBCD-32",
      "Hyundai",
      "Tucson",
      "2.0 GLS",
      "2022",
      "64200",
      "Blanco",
    ],
    [
      "v3",
      "c3",
      "GHRT-19",
      "Chevrolet",
      "Onix",
      "1.0 Turbo",
      "2021",
      "89350",
      "Azul",
    ],
    [
      "v4",
      "c4",
      "PDRS-67",
      "Kia",
      "Sportage",
      "2.0 EX",
      "2023",
      "32100",
      "Rojo",
    ],
    [
      "v5",
      "c5",
      "FTVL-55",
      "Peugeot",
      "Partner",
      "1.6 HDI",
      "2019",
      "204800",
      "Blanco",
    ],
    [
      "v6",
      "c6",
      "KBXZ-21",
      "Suzuki",
      "Swift",
      "1.2 GL",
      "2021",
      "75600",
      "Grafito",
    ],
    ["v7", "c1", "PLRW-90", "Mazda", "CX-5", "2.0 R", "2024", "18200", "Negro"],
  ].map(
    ([id, customerId, plate, brand, model, version, year, mileage, color]) => ({
      id,
      workshopId,
      customerId,
      plate,
      brand,
      model,
      version,
      year: Number(year),
      mileage: Number(mileage),
      color,
      vin: "MOCKVIN" + id.padStart(10, "0"),
      engine: version.split(" ")[0],
      fuel: id === "v5" ? "Diésel" : "Gasolina",
      transmission: "Automática",
    }),
  );
  const states: WorkOrder["status"][] = [
    "IN_REPAIR",
    "DIAGNOSIS",
    "WAITING_PARTS",
    "READY",
    "RECEIVED",
    "DELIVERED",
  ];
  const reasons = [
    "Mantención de 160.000 km",
    "Ruido en tren delantero",
    "Falla de encendido intermitente",
    "Cambio de pastillas de freno",
    "Revisión sistema de refrigeración",
    "Cambio de aceite y filtros",
  ];
  const orders: WorkOrder[] = vehicles
    .slice(0, 6)
    .map((v, i) => ({
      id: "o" + (i + 1),
      workshopId,
      number: "OT-" + (1048 - i),
      date,
      time: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00"][i],
      customerId: v.customerId,
      vehicleId: v.id,
      mechanicId: i % 2 ? "u3" : "u2",
      mileage: v.mileage,
      reason: reasons[i],
      symptoms:
        i === 2
          ? "Tirones al acelerar y testigo de motor encendido."
          : "Revisión solicitada por el cliente.",
      diagnosis:
        i === 0
          ? "Aceite degradado. Se recomienda cambio de aceite y filtros."
          : "",
      findings: "",
      observations: "",
      status: states[i],
      codes:
        i === 2
          ? [
              {
                id: "code1",
                code: "P0300",
                description: "Fallo de encendido aleatorio",
                status: "Activo",
                notes: "Revisar bobinas y bujías",
              },
            ]
          : [],
      services: [
        {
          id: "s" + i,
          name: reasons[i],
          description: "",
          mechanicId: i % 2 ? "u3" : "u2",
          price: 45000 + i * 5000,
          status: i === 3 || i === 5 ? "Finalizado" : "Pendiente",
        },
      ],
      parts:
        i === 0
          ? [
              {
                id: "p1",
                name: "Aceite 5W-30",
                brand: "Mobil",
                partNumber: "MOB-530",
                quantity: 1,
                price: 38900,
                notes: "Envase 5 litros",
              },
            ]
          : [],
      photos: [],
    }));
  return {
    users,
    customers,
    vehicles,
    orders,
    maintenance: [
      {
        id: "m1",
        workshopId,
        vehicleId: "v1",
        orderId: "",
        mechanicId: "u2",
        type: "Cambio de aceite",
        mileage: 148430,
        oilType: "Sintético",
        viscosity: "5W-30",
        brand: "Mobil",
        quantity: 4.5,
        filter: "Filtro de aceite",
        filterBrand: "Mann",
        date: "2026-03-20",
        nextMileage: 158430,
        nextDate: date,
        notes: "Revisar nivel en 1.000 km.",
      },
    ],
    appointments: vehicles
      .slice(0, 4)
      .map((v, i) => ({
        id: "a" + i,
        workshopId,
        customerId: v.customerId,
        vehicleId: v.id,
        mechanicId: i % 2 ? "u3" : "u2",
        service: [
          "Mantención preventiva",
          "Diagnóstico electrónico",
          "Revisión de frenos",
          "Cambio de aceite",
        ][i],
        date,
        time: ["09:00", "11:30", "14:00", "16:30"][i],
        notes: "",
        status: i === 0 ? "En taller" : "Confirmada",
      })),
    workshop: {
      id: workshopId,
      workshopId,
      name: "Taller Central",
      rut: "76.432.180-9",
      phone: "+56 2 2345 6789",
      email: "contacto@otaller.cl",
      address: "Av. Irarrázaval 2450, Ñuñoa",
      hours: "Lunes a viernes · 08:30 a 18:30",
      logo: "",
      preference: "Kilómetros · CLP",
    },
    activity: [
      {
        id: "act1",
        workshopId,
        text: "OT-1045 lista para entregar",
        date: new Date().toISOString(),
        userId: "u3",
        orderId: "o4",
      },
      {
        id: "act2",
        workshopId,
        text: "Se inició la reparación de OT-1048",
        date: new Date().toISOString(),
        userId: "u2",
        orderId: "o1",
      },
    ],
  };
}
