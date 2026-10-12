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
import { ResourceType } from '@voko/shared';
import { BusinessEntity } from './business.entity';
import { BranchEntity } from './branch.entity';
import { UserEntity } from './user.entity';
import { ServiceResourceEntity } from './service-resource.entity';
import { AvailabilityRuleEntity } from './availability-rule.entity';
import { AvailabilityExceptionEntity } from './availability-exception.entity';
import { SessionEntity } from './session.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('resources')
@Index(['businessId'])
@Index(['branchId'])
export class ResourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ length: 150 })
  name!: string;

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 50,
    default: ResourceType.STAFF,
  })
  resourceType!: ResourceType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.resources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @ManyToOne(() => BranchEntity, (branch) => branch.resources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @OneToMany(() => ServiceResourceEntity, (sr) => sr.resource)
  serviceResources?: ServiceResourceEntity[];

  @OneToMany(() => AvailabilityRuleEntity, (rule) => rule.resource)
  availabilityRules?: AvailabilityRuleEntity[];

  @OneToMany(() => AvailabilityExceptionEntity, (ex) => ex.resource)
  availabilityExceptions?: AvailabilityExceptionEntity[];

  @OneToMany(() => SessionEntity, (session) => session.resource)
  sessions?: SessionEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.resource)
  appointments?: AppointmentEntity[];
}
