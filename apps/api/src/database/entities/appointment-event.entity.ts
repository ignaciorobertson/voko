import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppointmentEventType, AppointmentStatus } from '@voko/shared';
import { AppointmentEntity } from './appointment.entity';
import { UserEntity } from './user.entity';

@Entity('appointment_events')
@Index(['appointmentId'])
@Index(['createdAt'])
export class AppointmentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'appointment_id', type: 'uuid' })
  appointmentId!: string;

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 50,
    default: AppointmentEventType.CREATED,
  })
  eventType!: AppointmentEventType;

  @Column({
    name: 'previous_status',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  previousStatus?: AppointmentStatus;

  @Column({
    name: 'new_status',
    type: 'varchar',
    length: 50,
  })
  newStatus!: AppointmentStatus;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => AppointmentEntity, (appointment) => appointment.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: AppointmentEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: UserEntity;
}
