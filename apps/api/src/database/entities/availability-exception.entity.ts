import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExceptionType } from '@voko/shared';
import { BusinessEntity } from './business.entity';
import { BranchEntity } from './branch.entity';
import { ResourceEntity } from './resource.entity';

@Entity('availability_exceptions')
@Index(['businessId'])
@Index(['branchId'])
@Index(['resourceId'])
@Index(['startTime', 'endTime'])
export class AvailabilityExceptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ name: 'start_time' })
  startTime!: Date;

  @Column({ name: 'end_time' })
  endTime!: Date;

  @Column({
    name: 'exception_type',
    type: 'varchar',
    length: 50,
    default: ExceptionType.HOLIDAY,
  })
  exceptionType!: ExceptionType;

  @Column({ length: 255, nullable: true })
  reason?: string;

  @Column({ name: 'is_blocking', default: true })
  isBlocking!: boolean; // Si es true bloquea; si es false (ej. extraordinario) habilita

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.availabilityExceptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @ManyToOne(() => BranchEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch?: BranchEntity;

  @ManyToOne(() => ResourceEntity, (resource) => resource.availabilityExceptions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource?: ResourceEntity;
}
