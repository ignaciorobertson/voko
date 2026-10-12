import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, MinLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@voko/shared';

export class CreateInvitationDto {
  @ApiProperty({ example: 'empleado@barberia.com' })
  @IsEmail({}, { message: 'El correo electrónico es inválido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STAFF })
  @IsEnum(UserRole, { message: 'El rol especificado es inválido' })
  role!: UserRole;

  @ApiPropertyOptional({ example: 'uuid-del-negocio' })
  @IsUUID('4', { message: 'El identificador del negocio debe ser un UUID válido' })
  @IsOptional()
  businessId?: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'token-secreto-invitacion' })
  @IsString()
  @IsNotEmpty({ message: 'El token de invitación es obligatorio' })
  token!: string;

  @ApiPropertyOptional({ example: 'Laura' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Gómez' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'ContraseñaSegura123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsOptional()
  password?: string;
}
