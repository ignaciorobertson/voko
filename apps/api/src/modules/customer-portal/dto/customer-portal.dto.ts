import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ description: 'Nombre de pila' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Apellido' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;
}

export class PortalRescheduleAppointmentDto {
  @ApiProperty({ description: 'Nueva fecha y hora de inicio (ISO-8601)' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ description: 'Identificador del nuevo recurso o profesional deseado' })
  @IsString()
  @IsOptional()
  resourceId?: string;
}

export class PortalCancelAppointmentDto {
  @ApiPropertyOptional({ description: 'Motivo de la cancelación' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}
