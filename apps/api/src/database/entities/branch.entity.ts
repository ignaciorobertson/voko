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
import { BusinessEntity } from './business.entity';
import { ResourceEntity } from './resource.entity';
import { SessionEntity } from './session.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('branches')
@Index(['businessId'])
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @OneToMany(() => ResourceEntity, (resource) => resource.branch)
  resources?: ResourceEntity[];

  @OneToMany(() => SessionEntity, (session) => session.branch)
  sessions?: SessionEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.branch)
  appointments?: AppointmentEntity[];
}
