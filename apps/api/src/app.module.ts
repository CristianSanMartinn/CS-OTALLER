import { PresenceModule } from "./presence/presence.module.js";
import { PortalModule } from './portal/portal.module.js';
import { WorkshopsModule } from "./workshops/workshops.module.js";
import { MaintenanceModule } from "./maintenance/maintenance.module.js";
import { AppointmentsModule } from "./appointments/appointments.module.js";
import { WorkOrdersModule } from "./work-orders/work-orders.module.js";
import { UsersModule } from "./users/users.module.js";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health/health.controller.js";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CustomersModule } from "./customers/customers.module.js";
import { VehiclesModule } from "./vehicles/vehicles.module.js";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    CustomersModule,
    VehiclesModule,
    UsersModule,
    WorkOrdersModule,
    AppointmentsModule,
    MaintenanceModule,
    WorkshopsModule,
    PortalModule,
    PresenceModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
