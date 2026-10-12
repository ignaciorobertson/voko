import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUUID,
  IsEnum,
  Matches,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExceptionType } from '@voko/shared';

export class CreateAvailabilityRuleDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de sucursal (opcional)' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'ID de recurso específico (opcional)' })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @ApiProperty({ example: 1, description: 'Día de la semana: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00', description: 'Hora de inicio en formato HH:mm o HH:mm:ss' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'startTime debe tener formato HH:mm (ej: 09:00)',
  })
  startTime!: string;

  @ApiProperty({ example: '13:00', description: 'Hora de fin en formato HH:mm o HH:mm:ss' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'endTime debe tener formato HH:mm (ej: 13:00)',
  })
  endTime!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAvailabilityRuleDto {
  @ApiPropertyOptional({ example: '09:30' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  startTime?: string;

  @ApiPropertyOptional({ example: '13:30' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  endTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateAvailabilityExceptionDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @ApiProperty({ example: '2026-12-25T00:00:00Z', description: 'Inicio de la excepción (ISO 8601 UTC)' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-12-25T23:59:59Z', description: 'Fin de la excepción (ISO 8601 UTC)' })
  @IsDateString()
  endTime!: string;

  @ApiProperty({
    enum: ExceptionType,
    example: ExceptionType.HOLIDAY,
    description: 'Tipo de excepción: HOLIDAY, VACATION, BREAK, EXTRAORDINARY_OPENING, BLOCK',
  })
  @IsEnum(ExceptionType)
  exceptionType!: ExceptionType;

  @ApiPropertyOptional({ example: 'Feriado de Navidad' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'True si bloquea disponibilidad; False si es apertura extraordinaria',
  })
  @IsOptional()
  @IsBoolean()
  isBlocking?: boolean;
}

export class QueryAvailableSlotsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del servicio a consultar' })
  @IsUUID('4')
  serviceId!: string;

  @ApiProperty({ example: '2026-10-20', description: 'Fecha a consultar en formato YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'ID de sucursal específica' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002', description: 'ID de recurso específico' })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;
}
