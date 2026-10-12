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
  Check,
} from 'typeorm';
import { SessionStatus } from '@voko/shared';
import { BusinessEntity } from './business.entity';
import { BranchEntity } from './branch.entity';
import { ServiceEntity } from './service.entity';
import { ResourceEntity } from './resource.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('sessions')
@Check(`"current_attendees" <= "max_capacity"`)
@Check(`"current_attendees" >= 0`)
@Index(['businessId'])
@Index(['branchId'])
@Index(['serviceId'])
@Index(['startTime', 'endTime'])
export class SessionEntity {
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

  @Column({ name: 'start_time' })
  startTime!: Date;

  @Column({ name: 'end_time' })
  endTime!: Date;

  @Column({ name: 'max_capacity', type: 'integer' })
  maxCapacity!: number;

  @Column({ name: 'current_attendees', type: 'integer', default: 0 })
  currentAttendees!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: SessionStatus.OPEN,
  })
  status!: SessionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @ManyToOne(() => BranchEntity, (branch) => branch.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @ManyToOne(() => ServiceEntity, (service) => service.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @ManyToOne(() => ResourceEntity, (resource) => resource.sessions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'resource_id' })
  resource?: ResourceEntity;

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.session)
  appointments?: AppointmentEntity[];
}
