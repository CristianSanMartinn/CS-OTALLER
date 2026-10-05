export type CancellationReason =
  "CLIENT_CANCELLED" | "NO_BUDGET" | "DIAGNOSIS_ONLY" | "OTHER";
export interface Cancellation {
  reason: CancellationReason;
  notes: string;
  date: string;
  userId: string;
}
export type VisitKind = "order" | "appointment";
export type CancellationInput = Pick<Cancellation, "reason" | "notes">;
export type Role = "ADMIN" | "WORKER";
export interface Entity {
  id: string;
  workshopId: string;
}
export interface User extends Entity {
  name: string;
  email: string;
  role: Role;
  active: boolean;
  rut: string;
  phone: string;
  specialty: string;
  avatarUrl?: string;
}
export interface ReminderPreferences {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  consent: boolean;
  consentAt?: string;
  daysBefore: 7 | 15 | 30;
}
export interface Customer extends Entity {
  active?: boolean;
  photos?: Photo[];
  publicAccessToken?: string;
  reminderPreferences?: ReminderPreferences;
  name: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  notes: string;
}
export interface Vehicle extends Entity {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  vin: string;
  engine: string;
  fuel: string;
  transmission: string;
  mileage: number;
  color: string;
  photos?: Photo[];
}
export type OrderStatus =
  | "RECEIVED"
  | "DIAGNOSIS"
  | "WAITING_PARTS"
  | "IN_REPAIR"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";
export interface ScannerCode {
  id: string;
  code: string;
  description: string;
  status: string;
  notes: string;
}
export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  mechanicId: string;
  price: number;
  status: string;
}
export interface PartItem {
  id: string;
  name: string;
  brand: string;
  partNumber: string;
  quantity: number;
  price: number;
  notes: string;
}
export interface Photo {
  id: string;
  url: string;
  category: "BEFORE" | "DURING" | "AFTER";
  description: string;
  date: string;
  userId: string;
}
export interface WorkOrder extends Entity {
  assignmentType?: "INDIVIDUAL" | "TEAM";
  updatedAt?: string;
  cancellation?: Cancellation;
  number: string;
  date: string;
  time: string;
  customerId: string;
  vehicleId: string;
  mechanicId: string;
  mileage: number;
  reason: string;
  symptoms: string;
  diagnosis: string;
  findings: string;
  observations: string;
  status: OrderStatus;
  codes: ScannerCode[];
  services: ServiceItem[];
  parts: PartItem[];
  photos: Photo[];
}
export interface Maintenance extends Entity {
  vehicleId: string;
  orderId: string;
  mechanicId: string;
  type: string;
  mileage: number;
  oilType: string;
  viscosity: string;
  brand: string;
  quantity: number;
  filter: string;
  filterBrand: string;
  date: string;
  nextMileage: number;
  nextDate: string;
  notes: string;
}
export type AppointmentStatus =
  "Programada" | "Confirmada" | "En taller" | "Finalizada" | "Cancelada";
export interface Appointment extends Entity {
  cancellation?: Cancellation;
  customerId: string;
  vehicleId: string;
  mechanicId: string;
  service: string;
  date: string;
  time: string;
  notes: string;
  status: AppointmentStatus;
}
export interface Workshop extends Entity {
  name: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  logo: string;
  preference: string;
}
export interface Activity extends Entity {
  text: string;
  date: string;
  userId: string;
  orderId?: string;
}
export interface Store {
  users: User[];
  customers: Customer[];
  vehicles: Vehicle[];
  orders: WorkOrder[];
  maintenance: Maintenance[];
  appointments: Appointment[];
  workshop: Workshop;
  activity: Activity[];
}
