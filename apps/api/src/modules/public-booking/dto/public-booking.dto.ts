import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsUUID,
  IsISO8601,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicCustomerDto {
  @ApiProperty({ example: 'Martín', description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'González', description: 'Apellido del cliente' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'martin.gonzalez@example.com', description: 'Email de contacto' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+54 11 5555-8888', description: 'Teléfono o WhatsApp' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Preferencias o notas', description: 'Notas del cliente' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PublicBookAppointmentDto {
  @ApiProperty({ description: 'ID del servicio a reservar' })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'ID del profesional o recurso específico (opcional)' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ example: '2026-11-05T15:30:00.000Z', description: 'Fecha y hora de inicio en formato ISO-8601' })
  @IsISO8601()
  startTime!: string;

  @ApiProperty({ type: PublicCustomerDto, description: 'Datos del cliente que reserva' })
  @ValidateNested()
  @Type(() => PublicCustomerDto)
  customer!: PublicCustomerDto;
}

export class PublicJoinSessionDto {
  @ApiProperty({ type: PublicCustomerDto, description: 'Datos del cliente que se inscribe' })
  @ValidateNested()
  @Type(() => PublicCustomerDto)
  customer!: PublicCustomerDto;
}
