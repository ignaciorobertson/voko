import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('in_app_notifications')
@Index(['recipientUserId', 'isRead'])
@Index(['businessId', 'createdAt'])
@Index(['recipientUserId', 'createdAt'])
export class InAppNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid', nullable: true })
  businessId?: string;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId!: string;

  @Column({ name: 'target_role', type: 'varchar', length: 50, nullable: true })
  targetRole?: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'simple-json', nullable: true })
  data?: Record<string, unknown>;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
