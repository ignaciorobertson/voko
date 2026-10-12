import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus, UserRole } from '@voko/shared';

export class CreateBusinessSuperadminDto {
  @ApiProperty({ example: 'Centro Médico Integral' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'centro-medico-integral' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Salud y Medicina' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiProperty({ example: 'contacto@centromedico.test' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ example: '+5491133334444' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'America/Argentina/Buenos_Aires', default: 'America/Argentina/Buenos_Aires' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'ARS', default: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'dr.director@centromedico.test' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @MinLength(2)
  ownerFirstName!: string;

  @ApiProperty({ example: 'Giménez' })
  @IsString()
  @MinLength(2)
  ownerLastName!: string;

  @ApiPropertyOptional({ example: 'TempPassword123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  initialPassword?: string;
}

export class UpdateBusinessStatusDto {
  @ApiProperty({ enum: BusinessStatus, example: BusinessStatus.SUSPENDED })
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;

  @ApiPropertyOptional({ example: 'Falta de pago o violación de términos de servicio' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AssignBusinessAdminDto {
  @ApiProperty({ example: 'nuevo.admin@negocio.test' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: [UserRole.OWNER, UserRole.ADMIN], default: UserRole.ADMIN })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'Mariana' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'López' })
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class SuperadminQueryDto {
  @ApiPropertyOptional({ example: 'barberia' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BusinessStatus })
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;
}
