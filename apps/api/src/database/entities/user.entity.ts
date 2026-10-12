import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BusinessMembershipEntity } from './business-membership.entity';
import { AppointmentEntity } from './appointment.entity';
import { AuthSessionEntity } from './auth-session.entity';
import { InvitationEntity } from './invitation.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email!: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'password_hash', length: 255, nullable: true })
  passwordHash?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_superadmin', default: false })
  isSuperadmin!: boolean;

  @Column({ name: 'email_verified_at', nullable: true })
  emailVerifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => BusinessMembershipEntity, (membership) => membership.user)
  memberships?: BusinessMembershipEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.customer)
  appointments?: AppointmentEntity[];

  @OneToMany(() => AuthSessionEntity, (session) => session.user)
  authSessions?: AuthSessionEntity[];

  @OneToMany(() => InvitationEntity, (invitation) => invitation.invitedByUser)
  sentInvitations?: InvitationEntity[];
}
