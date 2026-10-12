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
import { UserRole, MembershipStatus } from '@voko/shared';
import { UserEntity } from './user.entity';
import { BusinessEntity } from './business.entity';

@Entity('business_memberships')
@Index(['businessId', 'userId'], { unique: true })
@Index(['businessId'])
@Index(['userId'])
export class BusinessMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({ name: 'custom_permissions', type: 'simple-json', nullable: true })
  customPermissions?: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 50,
    default: MembershipStatus.ACTIVE,
  })
  status!: MembershipStatus;

  @Column({ name: 'joined_at', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BusinessEntity, (business) => business.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: BusinessEntity;

  @ManyToOne(() => UserEntity, (user) => user.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
