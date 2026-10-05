import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'C.S.OTALLER API AHORA SOLO DEBEMOS CONSUMIR API PERROOOOO!' };
  }
}
