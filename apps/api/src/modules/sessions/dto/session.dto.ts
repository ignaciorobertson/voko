import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@voko/shared';

export class CreateSessionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del servicio grupal' })
  @IsUUID('4')
  serviceId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'ID de la sucursal' })
  @IsUUID('4')
  branchId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002', description: 'ID del instructor o sala (opcional)' })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @ApiProperty({ example: '2026-10-30T18:00:00Z', description: 'Inicio de la clase (ISO UTC)' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-10-30T19:00:00Z', description: 'Fin de la clase (ISO UTC)' })
  @IsDateString()
  endTime!: string;

  @ApiProperty({ example: 15, description: 'Cupo máximo de asistentes (>= 1)' })
  @IsInt()
  @Min(1)
  maxCapacity!: number;
}

export class JoinSessionDto {
  @ApiPropertyOptional({ example: 'Primera clase de prueba' })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class UpdateSessionStatusDto {
  @ApiProperty({ enum: SessionStatus, example: SessionStatus.CANCELLED })
  @IsEnum(SessionStatus)
  status!: SessionStatus;
}
