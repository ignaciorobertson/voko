import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  Length,
  Matches,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '@voko/shared';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Barbería Don Juan' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @ApiPropertyOptional({ example: 'barberia-don-juan', description: 'Slug único para URL pública' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe contener únicamente letras minúsculas, números y guiones medios',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Especialistas en cortes clásicos y cuidado de barba' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Barbería y Peluquería' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  industry?: string;

  @ApiProperty({ example: 'contacto@barberiadonjuan.com' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ example: '+54 11 5555-1234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '30-71234567-8' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'America/Argentina/Buenos_Aires', default: 'America/Argentina/Buenos_Aires' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'ARS', default: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'https://cdn.voko.app/logos/don-juan.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#1E40AF', description: 'Color primario de la marca (hex)' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'El color primario debe ser un código hexadecimal válido (#RGB o #RRGGBB)',
  })
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#38BDF8', description: 'Color secundario de la marca (hex)' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'El color secundario debe ser un código hexadecimal válido (#RGB o #RRGGBB)',
  })
  secondaryColor?: string;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Barbería Don Juan Club' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @ApiPropertyOptional({ example: 'barberia-don-juan-club' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe contener únicamente letras minúsculas, números y guiones medios',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Nueva descripción ampliada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Barbería Premium' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'nuevo@barberiadonjuan.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+54 11 9999-8888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '30-71234567-8' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'America/Argentina/Buenos_Aires' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'https://cdn.voko.app/logos/don-juan-updated.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#0F172A' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#0284C7' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  secondaryColor?: string;
}

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({ example: true, description: 'Permitir que clientes reserven sin invitación' })
  @IsOptional()
  @IsBoolean()
  allowPublicBooking?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Exigir validación previa de correo para reservar' })
  @IsOptional()
  @IsBoolean()
  requireEmailVerification?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Intervalo de slots en minutos (ej: 15, 30, 60)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  defaultSlotIntervalMinutes?: number;

  @ApiPropertyOptional({ example: '#1E40AF' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  brandPrimaryColor?: string;

  @ApiPropertyOptional({ example: '#38BDF8' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  brandSecondaryColor?: string;

  @ApiPropertyOptional({ example: { sendWhatsappReminder: false } })
  @IsOptional()
  customNotificationConfig?: Record<string, unknown>;
}

export class UpdateBusinessStatusDto {
  @ApiProperty({ enum: BusinessStatus, example: BusinessStatus.ACTIVE })
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;
}
