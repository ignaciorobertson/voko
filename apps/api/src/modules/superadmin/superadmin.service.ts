import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import {
  BusinessEntity,
  BranchEntity,
  BusinessMembershipEntity,
  BusinessSettingsEntity,
  UserEntity,
  ServiceEntity,
  ResourceEntity,
  AppointmentEntity,
  AuditLogEntity,
} from '../../database/entities';
import {
  BusinessStatus,
  UserRole,
  MembershipStatus,
  AppointmentStatus,
} from '@voko/shared';
import {
  CreateBusinessSuperadminDto,
  UpdateBusinessStatusDto,
  AssignBusinessAdminDto,
  SuperadminQueryDto,
} from './dto/superadmin.dto';

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(private readonly dataSource: DataSource) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async listBusinesses(query?: SuperadminQueryDto) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const appRepo = this.dataSource.getRepository(AppointmentEntity);

    let businesses = await businessRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (query?.status) {
      businesses = businesses.filter((b) => b.status === query.status);
    }

    if (query?.search) {
      const s = query.search.toLowerCase().trim();
      businesses = businesses.filter(
        (b) =>
          b.name.toLowerCase().includes(s) ||
          b.slug.toLowerCase().includes(s) ||
          b.contactEmail.toLowerCase().includes(s) ||
          (b.industry && b.industry.toLowerCase().includes(s)),
      );
    }

    // Enriquecer cada negocio con métricas operativas
    const results = await Promise.all(
      businesses.map(async (b) => {
        const [
          branchesCount,
          servicesCount,
          resourcesCount,
          memberships,
          appointmentsCount,
        ] = await Promise.all([
          branchRepo.count({ where: { businessId: b.id } }),
          serviceRepo.count({ where: { businessId: b.id } }),
          resourceRepo.count({ where: { businessId: b.id } }),
          membershipRepo.find({
            where: { businessId: b.id },
            relations: ['user'],
          }),
          appRepo.count({ where: { businessId: b.id } }),
        ]);

        const ownerMembership = memberships.find(
          (m) => m.role === UserRole.OWNER && m.status === MembershipStatus.ACTIVE,
        );

        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          industry: b.industry || 'General',
          status: b.status,
          contactEmail: b.contactEmail,
          phone: b.phone,
          timezone: b.timezone,
          currency: b.currency,
          createdAt: b.createdAt.toISOString(),
          metrics: {
            branchesCount,
            servicesCount,
            resourcesCount,
            membersCount: memberships.length,
            appointmentsCount,
          },
          owner: ownerMembership?.user
            ? {
                id: ownerMembership.user.id,
                name: `${ownerMembership.user.firstName} ${ownerMembership.user.lastName}`,
                email: ownerMembership.user.email,
              }
            : null,
        };
      }),
    );

    return results;
  }

  async getBusinessDetails(businessId: string) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);
    const appRepo = this.dataSource.getRepository(AppointmentEntity);

    const business = await businessRepo.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException(`Negocio con ID '${businessId}' no encontrado`);
    }

    const [
      branches,
      services,
      resources,
      memberships,
      settings,
      totalApps,
      completedApps,
      cancelledApps,
      noShowApps,
      recentApps,
    ] = await Promise.all([
      branchRepo.find({ where: { businessId } }),
      serviceRepo.find({ where: { businessId } }),
      resourceRepo.find({ where: { businessId } }),
      membershipRepo.find({ where: { businessId }, relations: ['user'] }),
      settingsRepo.findOne({ where: { businessId } }),
      appRepo.count({ where: { businessId } }),
      appRepo.count({ where: { businessId, status: AppointmentStatus.COMPLETED } }),
      appRepo.count({
        where: [
          { businessId, status: AppointmentStatus.CANCELLED_BY_CUSTOMER },
          { businessId, status: AppointmentStatus.CANCELLED_BY_BUSINESS },
        ],
      }),
      appRepo.count({ where: { businessId, status: AppointmentStatus.NO_SHOW } }),
      appRepo.find({
        where: { businessId },
        relations: ['service', 'customer'],
        order: { startTime: 'DESC' },
        take: 10,
      }),
    ]);

    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        industry: business.industry,
        contactEmail: business.contactEmail,
        phone: business.phone,
        timezone: business.timezone,
        currency: business.currency,
        status: business.status,
        createdAt: business.createdAt.toISOString(),
      },
      settings,
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        isDefault: b.isDefault,
        isActive: b.isActive,
      })),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price,
        bookingMode: s.bookingMode,
        isActive: s.isActive,
      })),
      resources: resources.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.resourceType,
        isActive: r.isActive,
      })),
      members: memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Desconocido',
        email: m.user?.email,
        role: m.role,
        status: m.status,
      })),
      stats: {
        totalAppointments: totalApps,
        completedAppointments: completedApps,
        cancelledAppointments: cancelledApps,
        noShowAppointments: noShowApps,
      },
      recentAppointments: recentApps.map((a) => ({
        id: a.id,
        serviceName: a.service?.name || 'Servicio',
        customerName: a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : 'Cliente',
        customerEmail: a.customer?.email,
        startTime: a.startTime.toISOString(),
        status: a.status,
        price: a.snapshotPrice,
      })),
    };
  }

  async createBusiness(dto: CreateBusinessSuperadminDto, superadminId: string) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const auditRepo = this.dataSource.getRepository(AuditLogEntity);

    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const existingSlug = await businessRepo.findOne({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Ya existe un negocio registrado con el identificador / slug '${slug}'`);
    }

    // 1. Crear el Negocio
    const business = await businessRepo.save(
      businessRepo.create({
        name: dto.name.trim(),
        slug,
        industry: dto.industry?.trim() || 'General',
        contactEmail: dto.contactEmail.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        timezone: dto.timezone || 'America/Argentina/Buenos_Aires',
        currency: dto.currency || 'ARS',
        status: BusinessStatus.ACTIVE,
      }),
    );

    // 2. Crear configuración por defecto
    await settingsRepo.save(
      settingsRepo.create({
        businessId: business.id,
        brandPrimaryColor: '#0284C7',
        brandSecondaryColor: '#0369A1',
        allowPublicBooking: true,
        defaultSlotIntervalMinutes: 30,
      }),
    );

    // 3. Crear sucursal matriz
    const branch = await branchRepo.save(
      branchRepo.create({
        businessId: business.id,
        name: 'Sede Principal',
        address: 'Dirección Comercial Principal',
        isDefault: true,
        isActive: true,
      }),
    );

    // 4. Buscar o crear Usuario Propietario (OWNER)
    const normalizedOwnerEmail = dto.ownerEmail.trim().toLowerCase();
    let ownerUser = await userRepo.findOne({ where: { email: normalizedOwnerEmail } });

    if (!ownerUser) {
      const passwordToHash = dto.initialPassword || 'Propietario123!';
      const passwordHash = await argon2.hash(passwordToHash);
      ownerUser = await userRepo.save(
        userRepo.create({
          firstName: dto.ownerFirstName.trim(),
          lastName: dto.ownerLastName.trim(),
          email: normalizedOwnerEmail,
          passwordHash,
          isActive: true,
          isSuperadmin: false,
          emailVerifiedAt: new Date(),
        }),
      );
    }

    // 5. Asignar Membresía OWNER
    await membershipRepo.save(
      membershipRepo.create({
        businessId: business.id,
        userId: ownerUser.id,
        role: UserRole.OWNER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      }),
    );

    // 6. Registrar Auditoría Global
    await auditRepo.save(
      auditRepo.create({
        businessId: business.id,
        actorUserId: superadminId,
        action: 'BUSINESS_CREATED_BY_SUPERADMIN',
        entityName: 'BusinessEntity',
        entityId: business.id,
        diffData: {
          businessName: business.name,
          slug: business.slug,
          ownerEmail: ownerUser.email,
        },
      }),
    );

    this.logger.log(
      `Negocio '${business.name}' creado exitosamente por Superadmin ${superadminId} con propietario ${ownerUser.email}`,
    );

    return {
      business,
      defaultBranch: branch,
      owner: {
        id: ownerUser.id,
        name: `${ownerUser.firstName} ${ownerUser.lastName}`,
        email: ownerUser.email,
        role: UserRole.OWNER,
      },
    };
  }

  async updateBusinessStatus(
    businessId: string,
    dto: UpdateBusinessStatusDto,
    superadminId: string,
  ) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const auditRepo = this.dataSource.getRepository(AuditLogEntity);

    const business = await businessRepo.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException(`Negocio con ID '${businessId}' no encontrado`);
    }

    const oldStatus = business.status;
    business.status = dto.status;
    await businessRepo.save(business);

    // Registrar en auditoría de la plataforma
    const actionName =
      dto.status === BusinessStatus.SUSPENDED
        ? 'BUSINESS_SUSPENDED'
        : dto.status === BusinessStatus.ACTIVE
        ? 'BUSINESS_ACTIVATED'
        : 'BUSINESS_STATUS_MODIFIED';

    await auditRepo.save(
      auditRepo.create({
        businessId: business.id,
        actorUserId: superadminId,
        action: actionName,
        entityName: 'BusinessEntity',
        entityId: business.id,
        diffData: {
          oldStatus,
          newStatus: dto.status,
          reason: dto.reason || 'Sin justificación especificada',
        },
      }),
    );

    this.logger.log(
      `Estado de negocio '${business.name}' modificado de ${oldStatus} a ${dto.status} por Superadmin ${superadminId}`,
    );

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      status: business.status,
      previousStatus: oldStatus,
      reason: dto.reason,
      message: `El negocio '${business.name}' ahora se encuentra en estado ${business.status}.`,
    };
  }

  async assignAdmin(
    businessId: string,
    dto: AssignBusinessAdminDto,
    superadminId: string,
  ) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const auditRepo = this.dataSource.getRepository(AuditLogEntity);

    const business = await businessRepo.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException(`Negocio con ID '${businessId}' no encontrado`);
    }

    const email = dto.email.trim().toLowerCase();
    let user = await userRepo.findOne({ where: { email } });

    if (!user) {
      const tempPasswordHash = await argon2.hash(crypto.randomBytes(16).toString('hex'));
      user = await userRepo.save(
        userRepo.create({
          firstName: dto.firstName?.trim() || 'Administrador',
          lastName: dto.lastName?.trim() || 'Asignado',
          email,
          passwordHash: tempPasswordHash,
          isActive: true,
          isSuperadmin: false,
          emailVerifiedAt: new Date(),
        }),
      );
    }

    let membership = await membershipRepo.findOne({
      where: { businessId, userId: user.id },
    });

    const targetRole = dto.role || UserRole.ADMIN;

    if (membership) {
      membership.role = targetRole;
      membership.status = MembershipStatus.ACTIVE;
      await membershipRepo.save(membership);
    } else {
      membership = await membershipRepo.save(
        membershipRepo.create({
          businessId,
          userId: user.id,
          role: targetRole,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        }),
      );
    }

    await auditRepo.save(
      auditRepo.create({
        businessId,
        actorUserId: superadminId,
        action: 'ADMIN_ASSIGNED_BY_SUPERADMIN',
        entityName: 'BusinessMembershipEntity',
        entityId: membership.id,
        diffData: {
          adminEmail: user.email,
          role: targetRole,
          businessName: business.name,
        },
      }),
    );

    return {
      membershipId: membership.id,
      businessId,
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: membership.role,
      status: membership.status,
    };
  }

  async listUsers(search?: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);

    let users = await userRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (search) {
      const s = search.toLowerCase().trim();
      users = users.filter(
        (u) =>
          u.firstName.toLowerCase().includes(s) ||
          u.lastName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s),
      );
    }

    const results = await Promise.all(
      users.map(async (u) => {
        const membershipsCount = await membershipRepo.count({
          where: { userId: u.id, status: MembershipStatus.ACTIVE },
        });

        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          isActive: u.isActive,
          isSuperadmin: u.isSuperadmin,
          activeMembershipsCount: membershipsCount,
          createdAt: u.createdAt.toISOString(),
        };
      }),
    );

    return results;
  }

  async toggleUserSuperadmin(targetUserId: string, superadminId: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const auditRepo = this.dataSource.getRepository(AuditLogEntity);

    const targetUser = await userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`Usuario con ID '${targetUserId}' no encontrado`);
    }

    // Prevenir que el único superadmin se degrade a sí mismo
    if (targetUser.id === superadminId && targetUser.isSuperadmin) {
      const totalSuperadmins = await userRepo.count({ where: { isSuperadmin: true } });
      if (totalSuperadmins <= 1) {
        throw new ForbiddenException(
          'Operación rechazada: no es posible revocar los permisos al único Superadministrador del sistema.',
        );
      }
    }

    const previousStatus = targetUser.isSuperadmin;
    targetUser.isSuperadmin = !targetUser.isSuperadmin;
    await userRepo.save(targetUser);

    await auditRepo.save(
      auditRepo.create({
        actorUserId: superadminId,
        action: 'SUPERADMIN_ROLE_TOGGLED',
        entityName: 'UserEntity',
        entityId: targetUser.id,
        diffData: {
          targetUserEmail: targetUser.email,
          previousStatus,
          newStatus: targetUser.isSuperadmin,
        },
      }),
    );

    return {
      userId: targetUser.id,
      email: targetUser.email,
      isSuperadmin: targetUser.isSuperadmin,
      message: targetUser.isSuperadmin
        ? `Se han concedido privilegios globales de Superadmin a ${targetUser.email}.`
        : `Se han revocado los privilegios globales de Superadmin a ${targetUser.email}.`,
    };
  }

  async getGlobalMetrics() {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const appRepo = this.dataSource.getRepository(AppointmentEntity);

    const [
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      pendingBusinesses,
      totalUsers,
      totalSuperadmins,
      totalAppointments,
      completedAppointments,
      cancelledByCustomer,
      cancelledByBusiness,
      noShowAppointments,
      allAppointments,
      businesses,
    ] = await Promise.all([
      businessRepo.count(),
      businessRepo.count({ where: { status: BusinessStatus.ACTIVE } }),
      businessRepo.count({ where: { status: BusinessStatus.SUSPENDED } }),
      businessRepo.count({ where: { status: BusinessStatus.PENDING_REVIEW } }),
      userRepo.count(),
      userRepo.count({ where: { isSuperadmin: true } }),
      appRepo.count(),
      appRepo.count({ where: { status: AppointmentStatus.COMPLETED } }),
      appRepo.count({ where: { status: AppointmentStatus.CANCELLED_BY_CUSTOMER } }),
      appRepo.count({ where: { status: AppointmentStatus.CANCELLED_BY_BUSINESS } }),
      appRepo.count({ where: { status: AppointmentStatus.NO_SHOW } }),
      appRepo.find({ where: { status: AppointmentStatus.COMPLETED } }),
      businessRepo.find({ select: ['id', 'industry', 'status'] }),
    ]);

    // Volumen transaccionado (suma de citas completadas)
    const totalVolumeRevenue = allAppointments.reduce(
      (sum, a) => sum + (Number(a.snapshotPrice) || 0),
      0,
    );

    // Desglose por industria (agregado sin PII)
    const industryMap: Record<string, number> = {};
    for (const b of businesses) {
      const ind = b.industry || 'General';
      industryMap[ind] = (industryMap[ind] || 0) + 1;
    }

    const industryBreakdown = Object.entries(industryMap).map(([industry, count]) => ({
      industry,
      count,
    }));

    return {
      overview: {
        totalBusinesses,
        activeBusinesses,
        suspendedBusinesses,
        pendingBusinesses,
        totalUsers,
        totalSuperadmins,
        totalAppointments,
        completedAppointments,
        totalVolumeRevenue,
        currency: 'ARS',
      },
      appointmentsStatusBreakdown: {
        completed: completedAppointments,
        cancelledByCustomer,
        cancelledByBusiness,
        noShow: noShowAppointments,
        pendingOrConfirmed:
          totalAppointments -
          (completedAppointments + cancelledByCustomer + cancelledByBusiness + noShowAppointments),
      },
      industryBreakdown,
    };
  }

  async getAuditLogs(limit = 50) {
    const auditRepo = this.dataSource.getRepository(AuditLogEntity);
    const logs = await auditRepo.find({
      relations: ['actorUser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      businessId: log.businessId,
      action: log.action,
      entityName: log.entityName,
      entityId: log.entityId,
      actor: log.actorUser
        ? {
            id: log.actorUser.id,
            name: `${log.actorUser.firstName} ${log.actorUser.lastName}`,
            email: log.actorUser.email,
          }
        : null,
      diffData: log.diffData,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}
