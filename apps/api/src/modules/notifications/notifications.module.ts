import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { TemplatesService } from './templates.service';
import { EmailSenderService } from './email-sender.service';
import { N8nSenderService } from './n8n-sender.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      AppointmentEntity,
      UserEntity,
      BusinessEntity,
      ServiceEntity,
      BranchEntity,
      ResourceEntity,
    ]),
  ],
  providers: [
    TemplatesService,
    EmailSenderService,
    N8nSenderService,
    OutboxProcessorService,
    NotificationsService,
  ],
  controllers: [NotificationsController],
  exports: [
    NotificationsService,
    OutboxProcessorService,
    TemplatesService,
    EmailSenderService,
    N8nSenderService,
  ],
})
export class NotificationsModule {}
