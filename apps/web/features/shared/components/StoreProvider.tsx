"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  ReactNode,
} from "react";
import {
  Customer,
  Store,
  User,
  Vehicle,
  WorkOrder,
  Maintenance,
  Appointment,
  Workshop,
} from "../types/domain";
import { createMockData } from "../services/mockData";
import {
  authService,
  sessionStore,
} from "@/features/auth/services/authService";
import { ProfileInput } from "@/features/perfil/types/profile.types";
import {
  restoreProfiles,
  saveUserProfile,
  persistProfile,
} from "@/features/perfil/services/profileService";
import { scopedData } from "../services/permissions";
import { saveOrder } from "@/features/ordenes/services/orderService";
import { Cancellation, CancellationInput, VisitKind } from "../types/domain";
import { applyCancellation } from "../services/cancellation";
export type Context = {
  setCustomerActive: (id: string, active: boolean) => Promise<void>;
  cancelVisit: (
    kind: VisitKind,
    id: string,
    input: CancellationInput,
  ) => Promise<Cancellation>;
  saveWorkOrder: (order: WorkOrder, editing: boolean) => Promise<WorkOrder>;
  saveAppointment: (
    appointment: Appointment,
    editing: boolean,
  ) => Promise<Appointment>;
  saveMaintenance: (record: Maintenance) => Promise<Maintenance>;
  saveWorkshop: (workshop: Workshop) => Promise<void>;
  live: boolean;
  saveWorker: (
    worker: User,
    password?: string,
    editing?: boolean,
  ) => Promise<User>;
  saveCustomer: (customer: Customer, editing: boolean) => Promise<Customer>;
  saveVehicle: (vehicle: Vehicle, editing: boolean) => Promise<Vehicle>;
  data: Store;
  user: User | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
    workshopId?: string,
  ) => Promise<void>;
  logout: () => void;
  update: (change: (data: Store) => Store) => void;
  notify: (text: string) => void;
  saveProfile: (profile: ProfileInput) => Promise<void>;
};
export const StoreContext = createContext<Context | null>(null);
import { LiveStoreProvider } from "./LiveStoreProvider";
export function StoreProvider({
  children,
  live = false,
}: {
  children: ReactNode;
  live?: boolean;
}) {
  return live ? (
    <LiveStoreProvider>{children}</LiveStoreProvider>
  ) : (
    <MockStoreProvider>{children}</MockStoreProvider>
  );
}
function MockStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>(() =>
    restoreProfiles(createMockData()),
  );
  const userId = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
  const ready = userId !== undefined;
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const user = data.users.find((u) => u.id === userId && u.active) ?? null;
  async function login(email: string, password: string, remember: boolean) {
    const next = authService.login(email, password, data.users);
    authService.save(next, remember);
    sessionStore.set(next.id);
  }
  async function saveProfile(profile: ProfileInput) {
    if (!user) throw new Error("Inicia sesión para editar tu perfil.");
    const next = saveUserProfile(data, user, profile);
    persistProfile(
      next.users.find(
        (u) => u.id === user.id && u.workshopId === user.workshopId,
      )!,
    );
    setData(next);
  }
  function logout() {
    authService.logout();
    sessionStore.set(null);
  }
  return (
    <StoreContext.Provider
      value={{
        live: false,
        setCustomerActive: async (id, active) => {
          if (
            user?.role !== "ADMIN" ||
            !data.customers.some(
              (c) => c.id === id && c.workshopId === user.workshopId,
            )
          )
            throw new Error("Cliente no encontrado o sin permiso.");
          if (
            !active &&
            (data.orders.some(
              (o) =>
                o.customerId === id &&
                !["DELIVERED", "CANCELLED"].includes(o.status),
            ) ||
              data.appointments.some(
                (a) =>
                  a.customerId === id &&
                  !["Cancelada", "Finalizada"].includes(a.status),
              ))
          )
            throw new Error(
              "Este cliente tiene órdenes o citas activas. Finalízalas o cancélalas antes de eliminarlo.",
            );
          setData((d) => ({
            ...d,
            customers: d.customers.map((c) =>
              c.id === id
                ? {
                    ...c,
                    active,
                    reminderPreferences:
                      !active && c.reminderPreferences
                        ? {
                            ...c.reminderPreferences,
                            emailEnabled: false,
                            whatsappEnabled: false,
                          }
                        : c.reminderPreferences,
                  }
                : c,
            ),
          }));
        },
        cancelVisit: async (kind, id, input) => {
          if (user?.role !== "ADMIN")
            throw new Error("Solo administración puede cancelar.");
          const record = (
            kind === "order" ? data.orders : data.appointments
          ).find((x) => x.id === id && x.workshopId === user.workshopId);
          if (
            !record ||
            ["CANCELLED", "DELIVERED", "Cancelada", "Finalizada"].includes(
              record.status,
            )
          )
            throw new Error("La atención no está disponible para cancelar.");
          if (input.reason === "OTHER" && !input.notes.trim())
            throw new Error("Describe el motivo de cancelación.");
          const cancellation = {
            ...input,
            date: new Date().toISOString(),
            userId: user.id,
          };
          setData((d) => applyCancellation(d, kind, id, cancellation));
          return cancellation;
        },
        saveWorkOrder: async (order) => {
          if (!user) throw new Error("Inicia sesión.");
          const next = saveOrder(data, user, order);
          setData(next);
          return next.orders.find((o) => o.id === order.id)!;
        },
        saveAppointment: async (a, editing) => {
          setData((d) => ({
            ...d,
            appointments: editing
              ? d.appointments.map((x) => (x.id === a.id ? a : x))
              : [a, ...d.appointments],
          }));
          return a;
        },
        saveMaintenance: async (m) => {
          setData((d) => ({
            ...d,
            maintenance: [m, ...d.maintenance],
            vehicles: d.vehicles.map((v) =>
              v.id === m.vehicleId
                ? { ...v, mileage: Math.max(v.mileage, m.mileage) }
                : v,
            ),
          }));
          return m;
        },
        saveWorkshop: async (workshop) => {
          setData((d) => ({ ...d, workshop }));
        },
        saveWorker: async (worker, password, editing) => {
          if (password) authService.registerCredential(worker.id, password);
          setData((d) => ({
            ...d,
            users: editing
              ? d.users.map((u) => (u.id === worker.id ? worker : u))
              : [...d.users, worker],
          }));
          return worker;
        },
        saveCustomer: async (customer, editing) => {
          setData((d) => ({
            ...d,
            customers: editing
              ? d.customers.map((c) => (c.id === customer.id ? customer : c))
              : [customer, ...d.customers],
          }));
          return customer;
        },
        saveVehicle: async (vehicle, editing) => {
          setData((d) => ({
            ...d,
            vehicles: editing
              ? d.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v))
              : [vehicle, ...d.vehicles],
          }));
          return vehicle;
        },
        data: user ? scopedData(data, user) : data,
        user,
        ready,
        login,
        logout,
        update: setData,
        notify: setMessage,
        saveProfile,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Cerrar aviso" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("StoreProvider requerido");
  return context;
}
