import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingMode, ConfirmationMode } from '@voko/shared';

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte y Perfilado de Barba' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @ApiPropertyOptional({ example: 'Servicio completo con toalla caliente y navaja' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 45, description: 'Duración neta en minutos (mínimo 5 min)' })
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes!: number;

  @ApiPropertyOptional({ example: 12000.0, description: 'Precio del servicio (opcional, >= 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'ARS', default: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 0, description: 'Margen de preparación antes del turno en minutos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional({ example: 10, description: 'Margen de limpieza/espera posterior en minutos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({ example: 60, description: 'Anticipación mínima para reservar en minutos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minBookingNoticeMinutes?: number;

  @ApiPropertyOptional({ example: 30, description: 'Anticipación máxima en días' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxBookingAdvanceDays?: number;

  @ApiPropertyOptional({ example: 120, description: 'Plazo límite para cancelar en minutos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationDeadlineMinutes?: number;

  @ApiPropertyOptional({
    enum: BookingMode,
    default: BookingMode.INDIVIDUAL,
    description: 'Modalidad de reserva: INDIVIDUAL, GROUP_SESSION, o RESOURCE_ONLY',
  })
  @IsOptional()
  @IsEnum(BookingMode)
  bookingMode?: BookingMode;

  @ApiPropertyOptional({
    enum: ConfirmationMode,
    default: ConfirmationMode.AUTOMATIC,
    description: 'Modalidad de confirmación: AUTOMATIC o MANUAL_APPROVAL',
  })
  @IsOptional()
  @IsEnum(ConfirmationMode)
  confirmationMode?: ConfirmationMode;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'IDs de recursos habilitados para brindar este servicio',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  resourceIds?: string[];
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Corte Premium y Barba' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 14000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minBookingNoticeMinutes?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxBookingAdvanceDays?: number;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationDeadlineMinutes?: number;

  @ApiPropertyOptional({ enum: BookingMode })
  @IsOptional()
  @IsEnum(BookingMode)
  bookingMode?: BookingMode;

  @ApiPropertyOptional({ enum: ConfirmationMode })
  @IsOptional()
  @IsEnum(ConfirmationMode)
  confirmationMode?: ConfirmationMode;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Actualizar lista de recursos asociados',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  resourceIds?: string[];
}

export class AssignResourcesDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
    description: 'Array de IDs de recursos a vincular',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  resourceIds!: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del recurso primario si corresponde',
  })
  @IsOptional()
  @IsUUID('4')
  primaryResourceId?: string;
}
