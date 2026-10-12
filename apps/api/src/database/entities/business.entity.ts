import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { BusinessStatus } from '@voko/shared';
import { BranchEntity } from './branch.entity';
import { BusinessMembershipEntity } from './business-membership.entity';
import { ServiceEntity } from './service.entity';
import { ResourceEntity } from './resource.entity';
import { BusinessSettingsEntity } from './business-settings.entity';
import { AvailabilityRuleEntity } from './availability-rule.entity';
import { AvailabilityExceptionEntity } from './availability-exception.entity';
import { SessionEntity } from './session.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('businesses')
export class BusinessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  industry?: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ name: 'contact_email', length: 255 })
  contactEmail!: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'tax_id', length: 50, nullable: true })
  taxId?: string;

  @Column({ length: 50, default: 'America/Argentina/Buenos_Aires' })
  timezone!: string;

  @Column({ length: 10, default: 'ARS' })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: BusinessStatus.ACTIVE,
  })
  status!: BusinessStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => BranchEntity, (branch) => branch.business)
  branches?: BranchEntity[];

  @OneToMany(() => BusinessMembershipEntity, (membership) => membership.business)
  memberships?: BusinessMembershipEntity[];

  @OneToMany(() => ServiceEntity, (service) => service.business)
  services?: ServiceEntity[];

  @OneToMany(() => ResourceEntity, (resource) => resource.business)
  resources?: ResourceEntity[];

  @OneToMany(() => AvailabilityRuleEntity, (rule) => rule.business)
  availabilityRules?: AvailabilityRuleEntity[];

  @OneToMany(() => AvailabilityExceptionEntity, (ex) => ex.business)
  availabilityExceptions?: AvailabilityExceptionEntity[];

  @OneToMany(() => SessionEntity, (session) => session.business)
  sessions?: SessionEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.business)
  appointments?: AppointmentEntity[];

  @OneToOne(() => BusinessSettingsEntity, (settings) => settings.business)
  settings?: BusinessSettingsEntity;
}
