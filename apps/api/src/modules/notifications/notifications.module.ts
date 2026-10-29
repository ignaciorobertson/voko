import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { InAppNotificationEntity } from '../../database/entities/in-app-notification.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { TemplatesService } from './templates.service';
import { EmailSenderService } from './email-sender.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { InAppNotificationsController } from './in-app-notifications.controller';
import { RemindersSchedulerService } from './reminders-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      InAppNotificationEntity,
      AppointmentEntity,
      UserEntity,
      BusinessEntity,
      ServiceEntity,
      BranchEntity,
      ResourceEntity,
      BusinessMembershipEntity,
    ]),
  ],
  providers: [
    TemplatesService,
    EmailSenderService,
    OutboxProcessorService,
    NotificationsService,
    RemindersSchedulerService,
  ],
  controllers: [NotificationsController, InAppNotificationsController],
  exports: [
    NotificationsService,
    OutboxProcessorService,
    TemplatesService,
    EmailSenderService,
    RemindersSchedulerService,
  ],
})
export class NotificationsModule {}
