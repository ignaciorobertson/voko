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
import { BusinessEntity } from './business.entity';
import { BranchEntity } from './branch.entity';
import { ResourceEntity } from './resource.entity';

@Entity('availability_rules')
@Index(['businessId'])
@Index(['branchId'])
@Index(['resourceId'])
@Index(['dayOfWeek'])
export class AvailabilityRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ name: 'day_of_week', type: 'smallint' }) // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' }) // HH:MM:SS
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' }) // HH:MM:SS
  endTime!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.availabilityRules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @ManyToOne(() => BranchEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch?: BranchEntity;

  @ManyToOne(() => ResourceEntity, (resource) => resource.availabilityRules, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource?: ResourceEntity;
}
