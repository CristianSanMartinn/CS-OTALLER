"use client";
import styles from "./Dashboard.module.css";
import { DashboardHeader } from "./header/DashboardHeader";
import { MaintenanceStatus } from "./maintenance/MaintenanceStatus";
import { DashboardStats } from "./stats/DashboardStats";
import { ActiveWorkOrders } from "./work-orders/ActiveWorkOrders";
import { TodayAppointments } from "./appointments/TodayAppointments";
import { PendingVehicles } from "./work-orders/PendingVehicles";
import { RecentActivity } from "./activity/RecentActivity";
export function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <DashboardStats />
      <MaintenanceStatus />
      <div className={styles.dashboardColumns}>
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
