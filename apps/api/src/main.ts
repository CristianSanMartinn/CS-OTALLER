import "reflect-metadata";
import { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser("json", { limit: "2mb" });
  const config = app.get(ConfigService);
  const port = Number(config.get<string>("PORT") ?? "3001");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT debe ser un puerto válido.");
  const origins = (
    config.get<string>("CORS_ORIGINS") ?? "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  await app.listen(
    port,
    config.get<string>("HOST") ??
      (process.env.VERCEL ? "0.0.0.0" : "127.0.0.1"),
  );
  console.log("API iniciada. Endpoint de comprobación: /api/health");
}
bootstrap().catch((error: unknown) => {
  console.error(
    "No se pudo iniciar la API:",
    error instanceof Error ? error.message : "Error desconocido",
  );
  process.exitCode = 1;
});
