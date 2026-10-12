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
import { AppointmentStatus } from '@voko/shared';
import { BusinessEntity } from './business.entity';
import { BranchEntity } from './branch.entity';
import { ServiceEntity } from './service.entity';
import { ResourceEntity } from './resource.entity';
import { SessionEntity } from './session.entity';
import { UserEntity } from './user.entity';
import { AppointmentEventEntity } from './appointment-event.entity';

@Entity('appointments')
@Index(['businessId'])
@Index(['branchId'])
@Index(['customerId'])
@Index(['resourceId', 'startTime', 'endTime'])
@Index(['businessId', 'startTime'])
export class AppointmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId!: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId?: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'start_time' })
  startTime!: Date;

  @Column({ name: 'end_time' })
  endTime!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: AppointmentStatus.PENDING,
  })
  status!: AppointmentStatus;

  @Column({ name: 'snapshot_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  snapshotPrice?: number;

  @Column({ name: 'snapshot_duration_minutes', type: 'integer' })
  snapshotDurationMinutes!: number;

  @Column({ name: 'snapshot_currency', length: 10, default: 'ARS' })
  snapshotCurrency!: string;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes?: string;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes?: string;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', length: 255, nullable: true })
  cancellationReason?: string;

  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelledByUserId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @ManyToOne(() => BranchEntity, (branch) => branch.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @ManyToOne(() => ServiceEntity, (service) => service.appointments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @ManyToOne(() => ResourceEntity, (resource) => resource.appointments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'resource_id' })
  resource?: ResourceEntity;

  @ManyToOne(() => SessionEntity, (session) => session.appointments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'session_id' })
  session?: SessionEntity;

  @ManyToOne(() => UserEntity, (user) => user.appointments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @OneToMany(() => AppointmentEventEntity, (event) => event.appointment)
  events?: AppointmentEventEntity[];
}
