"use client";
import { ReactNode, useEffect, useState } from "react";
import { StoreContext } from "./StoreProvider";
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
import {
  emptyData,
  loadLiveData,
  saveLiveCustomer,
  saveLiveVehicle,
} from "../services/liveData";
import { ProfileInput } from "@/features/perfil/types/profile.types";
import { disconnectCurrentPresence } from "@/features/trabajadores/services/workers.service";
import { apiRequest } from "@/lib/http";
import { Cancellation, CancellationInput, VisitKind } from "../types/domain";
import { applyCancellation } from "../services/cancellation";
export function LiveStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>(emptyData),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    loadLiveData()
      .then((result) => {
        if (active) {
          setData(result.data);
          setUser(result.user);
        }
      })
      .catch((err) => {
        if (active && (err as { status?: number }).status !== 401)
          setError((err as Error).message);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  async function login(
    email: string,
    password: string,
    remember: boolean,
    workshopId?: string,
  ) {
    await apiRequest("auth/login", "POST", {
      email,
      password,
      remember,
      workshopId,
    });
    const result = await loadLiveData();
    setData(result.data);
    setUser(result.user);
    setError("");
  }
  function logout() {
    void disconnectCurrentPresence()
      .then(() => apiRequest("auth/logout", "POST", {}))
      .then(() => {
        setUser(null);
        setData(emptyData());
      })
      .catch((err) => setMessage((err as Error).message));
  }
  async function saveCustomer(customer: Customer, editing: boolean) {
    const saved = await saveLiveCustomer(customer, editing);
    setData((d) => ({
      ...d,
      customers: editing
        ? d.customers.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...d.customers],
    }));
    return saved;
  }
  async function saveVehicle(vehicle: Vehicle, editing: boolean) {
    const saved = await saveLiveVehicle(vehicle, editing);
    setData((d) => ({
      ...d,
      vehicles: editing
        ? d.vehicles.map((v) => (v.id === saved.id ? saved : v))
        : [saved, ...d.vehicles],
    }));
    return saved;
  }
  async function saveWorker(worker: User, password?: string, editing = false) {
    const saved = await apiRequest<User>(
      "users" + (editing ? "/" + worker.id : ""),
      editing ? "PATCH" : "POST",
      {
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        rut: worker.rut,
        specialty: worker.specialty,
        avatarUrl: worker.avatarUrl,
        role: worker.role,
        active: worker.active,
        ...(!editing ? { password } : {}),
      },
    );
    setData((d) => ({
      ...d,
      users: editing
        ? d.users.map((u) => (u.id === saved.id ? saved : u))
        : [...d.users, saved],
    }));
    if (saved.id === user?.id) setUser(saved);
    return saved;
  }
  async function refreshAfterSave() {
    try {
      const next = await loadLiveData();
      setData(next.data);
      setUser(next.user);
    } catch {
      setMessage(
        "Guardado realizado. No se pudo actualizar la vista; recarga la página.",
      );
    }
  }
  async function setCustomerActive(id: string, active: boolean) {
    await apiRequest(
      "customers/" + id + (active ? "/restore" : "/archive"),
      "POST",
      {},
    );
    setData((d) => ({
      ...d,
      customers: d.customers.map((c) => (c.id === id ? { ...c, active } : c)),
    }));
    await refreshAfterSave();
  }
  async function cancelVisit(
    kind: VisitKind,
    id: string,
    input: CancellationInput,
  ) {
    const result = await apiRequest<{ cancellation: Cancellation }>(
      (kind === "order" ? "work-orders" : "appointments") +
        "/" +
        id +
        "/cancel",
      "POST",
      input,
    );
    setData((d) => applyCancellation(d, kind, id, result.cancellation));
    await refreshAfterSave();
    return result.cancellation;
  }
  async function saveWorkOrder(order: WorkOrder, editing: boolean) {
    const {
      customerId,
      vehicleId,
      mechanicId,
      date,
      time,
      mileage,
      reason,
      symptoms,
      diagnosis,
      findings,
      observations,
      status,
      codes,
      services,
      parts,
      photos,
    } = order;
    const result = await apiRequest<{ id: string; number: string }>(
      "work-orders" + (editing ? "/" + order.id : ""),
      editing ? "PATCH" : "POST",
      {
        customerId,
        vehicleId,
        mechanicId,
        date,
        time,
        mileage,
        reason,
        symptoms,
        diagnosis,
        findings,
        observations,
        status,
        codes,
        services,
        parts,
        photos,
      },
    );
    const saved = { ...order, ...result };
    setData((d) => ({
      ...d,
      orders: editing
        ? d.orders.map((o) => (o.id === saved.id ? saved : o))
        : [saved, ...d.orders],
      vehicles: d.vehicles.map((v) =>
        v.id === saved.vehicleId
          ? { ...v, mileage: Math.max(v.mileage, saved.mileage) }
          : v,
      ),
    }));
    await refreshAfterSave();
    return saved;
  }
  async function saveAppointment(a: Appointment, editing: boolean) {
    const {
      customerId,
      vehicleId,
      mechanicId,
      service,
      date,
      time,
      notes,
      status,
    } = a;
    const result = await apiRequest<{ id: string }>(
      "appointments" + (editing ? "/" + a.id : ""),
      editing ? "PATCH" : "POST",
      { customerId, vehicleId, mechanicId, service, date, time, notes, status },
    );
    const saved = { ...a, id: result.id };
    setData((d) => ({
      ...d,
      appointments: editing
        ? d.appointments.map((x) => (x.id === saved.id ? saved : x))
        : [saved, ...d.appointments],
    }));
    await refreshAfterSave();
    return saved;
  }
  async function saveMaintenance(m: Maintenance) {
    const {
      vehicleId,
      orderId,
      mechanicId,
      type,
      mileage,
      oilType,
      viscosity,
      brand,
      quantity,
      filter,
      filterBrand,
      date,
      nextMileage,
      nextDate,
      notes,
    } = m;
    const result = await apiRequest<{ id: string }>("maintenance", "POST", {
      vehicleId,
      orderId,
      mechanicId,
      type,
      mileage,
      oilType,
      viscosity,
      brand,
      quantity,
      filter,
      filterBrand,
      date,
      nextMileage,
      nextDate,
      notes,
    });
    const saved = { ...m, id: result.id };
    setData((d) => ({
      ...d,
      maintenance: [saved, ...d.maintenance],
      vehicles: d.vehicles.map((v) =>
        v.id === saved.vehicleId
          ? { ...v, mileage: Math.max(v.mileage, saved.mileage) }
          : v,
      ),
    }));
    await refreshAfterSave();
    return saved;
  }
  async function saveWorkshop(workshop: Workshop) {
    const { name, rut, phone, email, address, hours, preference, logo } =
      workshop;
    await apiRequest("workshop", "PATCH", {
      name,
      rut,
      phone,
      email,
      address,
      hours,
      preference,
      logo,
    });
    setData((d) => ({ ...d, workshop }));
    await refreshAfterSave();
  }
  async function saveProfile(profile: ProfileInput) {
    const saved = await apiRequest<User>("auth/profile", "PATCH", profile);
    setUser(saved);
    setData((d) => ({
      ...d,
      users: d.users.map((u) => (u.id === saved.id ? saved : u)),
    }));
  }
  if (error)
    return (
      <div className="loading">
        <div>
          <p role="alert">{error}</p>
          <button className="button" onClick={() => window.location.reload()}>
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  return (
    <StoreContext.Provider
      value={{
        live: true,
        setCustomerActive,
        cancelVisit,
        saveWorkOrder,
        saveAppointment,
        saveMaintenance,
        saveWorkshop,
        saveWorker,
        data,
        user,
        ready,
        login,
        logout,
        saveCustomer,
        saveVehicle,
        saveProfile,
        notify: setMessage,
        update: () =>
          setMessage("Este módulo todavía no está conectado a la API."),
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
