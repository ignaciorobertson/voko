import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentEventEntity } from '../../database/entities/appointment-event.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { AvailabilityExceptionEntity } from '../../database/entities/availability-exception.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      AppointmentEventEntity,
      ServiceEntity,
      ResourceEntity,
      ServiceResourceEntity,
      AvailabilityExceptionEntity,
      UserEntity,
      BusinessEntity,
      BranchEntity,
      NotificationEntity,
      BusinessMembershipEntity,
    ]),
  ],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
