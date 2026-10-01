"use client";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardStats } from "./DashboardStats";
import { ActiveWorkOrders } from "./ActiveWorkOrders";
import { TodayAppointments } from "./TodayAppointments";
import { PendingVehicles } from "./PendingVehicles";
import { RecentActivity } from "./RecentActivity";
export function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <DashboardStats />
      <div className="dashboard-columns">
        <div>
          <ActiveWorkOrders />
          <PendingVehicles />
        </div>
        <div>
          <TodayAppointments />
          <RecentActivity />
        </div>
      </div>
    </>
  );
}
