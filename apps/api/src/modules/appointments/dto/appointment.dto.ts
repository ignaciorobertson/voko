import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@voko/shared';

export class CreateAppointmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del servicio' })
  @IsUUID('4')
  serviceId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'ID de sucursal (opcional)' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002', description: 'ID del profesional/recurso (opcional)' })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @ApiProperty({ example: '2026-10-25T14:30:00Z', description: 'Inicio del turno en ISO 8601 UTC' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: 'Por favor corte con tijera en los laterales' })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-10-26T16:00:00Z', description: 'Nuevo inicio del turno en ISO 8601 UTC' })
  @IsDateString()
  newStartTime!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002', description: 'Nuevo profesional asignado' })
  @IsOptional()
  @IsUUID('4')
  newResourceId?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Motivos de fuerza mayor / reprogramación de viaje' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class NewCustomerInput {
  @ApiProperty({ example: 'Mariano' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'mariano.gonzalez@correo.com' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: '+54 11 5555-9999' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ManualAppointmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4')
  serviceId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @ApiProperty({ example: '2026-10-25T14:30:00Z' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174003', description: 'ID de cliente existente' })
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @ApiPropertyOptional({ description: 'Datos del cliente para crear sobre la marcha' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewCustomerInput)
  newCustomer?: NewCustomerInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ example: 'Cliente vip - agendado por recepción' })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.COMPLETED })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @ApiPropertyOptional({ example: 'Atención brindada satisfactoriamente' })
  @IsOptional()
  @IsString()
  notes?: string;
}
