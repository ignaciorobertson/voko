import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityRuleEntity } from '../../database/entities/availability-rule.entity';
import { AvailabilityExceptionEntity } from '../../database/entities/availability-exception.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { BusinessSettingsEntity } from '../../database/entities/business-settings.entity';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AvailabilityRuleEntity,
      AvailabilityExceptionEntity,
      ServiceEntity,
      ResourceEntity,
      ServiceResourceEntity,
      AppointmentEntity,
      BusinessSettingsEntity,
    ]),
  ],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
