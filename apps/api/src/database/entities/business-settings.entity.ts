import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BusinessEntity } from './business.entity';

@Entity('business_settings')
@Index(['businessId'], { unique: true })
export class BusinessSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'allow_public_booking', default: true })
  allowPublicBooking!: boolean;

  @Column({ name: 'require_email_verification', default: false })
  requireEmailVerification!: boolean;

  @Column({ name: 'default_slot_interval_minutes', type: 'integer', default: 30 })
  defaultSlotIntervalMinutes!: number;

  @Column({ name: 'brand_primary_color', length: 20, default: '#1E40AF' })
  brandPrimaryColor!: string;

  @Column({ name: 'brand_secondary_color', length: 20, default: '#38BDF8' })
  brandSecondaryColor!: string;

  @Column({ name: 'custom_notification_config', type: 'simple-json', nullable: true })
  customNotificationConfig?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => BusinessEntity, (business) => business.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;
}
