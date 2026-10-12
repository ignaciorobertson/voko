import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationChannel, NotificationStatus } from '@voko/shared';

@Entity('notifications')
@Index(['status'])
@Index(['scheduledAt'])
@Index(['businessId'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid', nullable: true })
  businessId?: string;

  @Column({ name: 'recipient_user_id', type: 'uuid', nullable: true })
  recipientUserId?: string;

  @Column({ name: 'recipient_email', length: 255 })
  recipientEmail!: string;

  @Column({ name: 'event_type', length: 100 })
  eventType!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: NotificationChannel.EMAIL,
  })
  channel!: NotificationChannel;

  @Column({
    type: 'varchar',
    length: 50,
    default: NotificationStatus.PENDING,
  })
  status!: NotificationStatus;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'simple-json' })
  payload!: Record<string, unknown>;

  @Column({ name: 'scheduled_at', default: () => 'CURRENT_TIMESTAMP' })
  scheduledAt!: Date;

  @Column({ name: 'processed_at', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
