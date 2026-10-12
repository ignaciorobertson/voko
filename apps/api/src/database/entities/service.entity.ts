import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingMode, ConfirmationMode } from '@voko/shared';
import { BusinessEntity } from './business.entity';
import { ServiceResourceEntity } from './service-resource.entity';
import { SessionEntity } from './session.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('services')
@Index(['businessId'])
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column({ length: 10, default: 'ARS' })
  currency!: string;

  @Column({ name: 'buffer_before_minutes', type: 'integer', default: 0 })
  bufferBeforeMinutes!: number;

  @Column({ name: 'buffer_after_minutes', type: 'integer', default: 0 })
  bufferAfterMinutes!: number;

  @Column({ name: 'min_booking_notice_minutes', type: 'integer', default: 60 })
  minBookingNoticeMinutes!: number;

  @Column({ name: 'max_booking_advance_days', type: 'integer', default: 30 })
  maxBookingAdvanceDays!: number;

  @Column({ name: 'cancellation_deadline_minutes', type: 'integer', default: 120 })
  cancellationDeadlineMinutes!: number;

  @Column({
    name: 'booking_mode',
    type: 'varchar',
    length: 50,
    default: BookingMode.INDIVIDUAL,
  })
  bookingMode!: BookingMode;

  @Column({
    name: 'confirmation_mode',
    type: 'varchar',
    length: 50,
    default: ConfirmationMode.AUTOMATIC,
  })
  confirmationMode!: ConfirmationMode;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @OneToMany(() => ServiceResourceEntity, (sr) => sr.service)
  serviceResources?: ServiceResourceEntity[];

  @OneToMany(() => SessionEntity, (session) => session.service)
  sessions?: SessionEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.service)
  appointments?: AppointmentEntity[];
}
