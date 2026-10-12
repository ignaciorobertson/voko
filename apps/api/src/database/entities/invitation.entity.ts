import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InvitationType, InvitationStatus } from '@voko/shared';
import { BusinessEntity } from './business.entity';
import { UserEntity } from './user.entity';

@Entity('invitations')
@Index(['tokenHash'], { unique: true })
@Index(['businessId'])
@Index(['email'])
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid', nullable: true })
  businessId?: string;

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ name: 'token_hash', length: 255 })
  tokenHash!: string;

  @Column({
    name: 'invitation_type',
    type: 'varchar',
    length: 50,
    default: InvitationType.CUSTOMER,
  })
  invitationType!: InvitationType;

  @Column({
    type: 'varchar',
    length: 50,
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column({ name: 'expires_at' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => BusinessEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business?: BusinessEntity;

  @ManyToOne(() => UserEntity, (user) => user.sentInvitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedByUser!: UserEntity;
}
