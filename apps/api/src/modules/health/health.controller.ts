import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@voko/shared';

@ApiTags('Sistema y Diagnóstico')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Diagnóstico de salud del backend y conectividad con PostgreSQL',
    description: 'Retorna el estado del servicio y comprueba la conectividad activa con la base de datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de salud del sistema retornado correctamente.',
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }
}
