import { WorkshopRegistrationService } from "./workshop-registration.service.js";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "../database/database.module.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AdminGuard } from "./admin.guard.js";
@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>("JWT_SECRET");
        if (secret.length < 32)
          throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
        return {
          secret,
          signOptions: {
            algorithm: "HS256" as const,
            issuer: "otaller-api",
            audience: "otaller-web",
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard, WorkshopRegistrationService],
  exports: [AuthService, AuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
