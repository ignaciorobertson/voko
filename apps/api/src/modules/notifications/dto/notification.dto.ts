import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationStatus } from '@voko/shared';

export class NotificationQueryDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ example: 'APPOINTMENT_CONFIRMED' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class CreateOutboxNotificationDto {
  @ApiProperty({ example: '05952d76-e170-4bc3-9596-fce1d2f6fb39' })
  @IsString()
  businessId!: string;

  @ApiPropertyOptional({ example: 'f87a8f1e-f3b1-4f11-8255-a50d2c67b361' })
  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @ApiProperty({ example: 'cliente@ejemplo.com' })
  @IsEmail()
  recipientEmail!: string;

  @ApiProperty({ example: 'APPOINTMENT_CONFIRMED' })
  @IsString()
  eventType!: string;

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.EMAIL })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty({ example: { serviceName: 'Corte de Pelo', startTime: '2026-10-15T15:00:00Z' } })
  @IsObject()
  payload!: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  scheduledAt?: Date;
}

export class TestPreviewDto {
  @ApiProperty({ example: 'APPOINTMENT_CONFIRMED', enum: ['APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER'] })
  @IsString()
  eventType!: 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_REMINDER';

  @ApiProperty({ example: { businessName: 'Voko Barber', customerName: 'Lucas Paz', serviceName: 'Corte Clásico', startTime: '2026-10-15T15:00:00Z' } })
  @IsObject()
  payload!: Record<string, any>;
}
