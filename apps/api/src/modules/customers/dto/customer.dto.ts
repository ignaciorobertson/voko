import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerNotesDto {
  @ApiPropertyOptional({ description: 'Notas internas y observaciones sobre el cliente' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class QueryCustomersDto {
  @ApiPropertyOptional({ description: 'Término de búsqueda (nombre, email o teléfono)' })
  @IsString()
  @IsOptional()
  search?: string;
}
