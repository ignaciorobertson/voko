import { DataSource } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { BusinessSettingsEntity } from '../../database/entities/business-settings.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { AvailabilityRuleEntity } from '../../database/entities/availability-rule.entity';
import { AvailabilityExceptionEntity } from '../../database/entities/availability-exception.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentEventEntity } from '../../database/entities/appointment-event.entity';
import { InvitationEntity } from '../../database/entities/invitation.entity';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { InAppNotificationEntity } from '../../database/entities/in-app-notification.entity';
import { AuthSessionEntity } from '../../database/entities/auth-session.entity';
import { PasswordResetEntity } from '../../database/entities/password-reset.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

import { BusinessesService } from './businesses.service';
import { BranchesService } from '../branches/branches.service';
import { ServicesService } from '../services/services.service';
import { ResourcesService } from '../resources/resources.service';

import {
  UserRole,
  MembershipStatus,
  BusinessStatus,
  BookingMode,
  ConfirmationMode,
  ResourceType,
} from '@voko/shared';
import * as argon2 from 'argon2';

describe('Hito 4: Negocios, Sucursales, Servicios y Recursos', () => {
  let dataSource: DataSource;
  let businessesService: BusinessesService;
  let branchesService: BranchesService;
  let servicesService: ServicesService;
  let resourcesService: ResourcesService;

  let ownerUser: UserEntity;
  let adminOtherUser: UserEntity;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      dropSchema: true,
      entities: [
        UserEntity,
        BusinessEntity,
        BranchEntity,
        BusinessSettingsEntity,
        BusinessMembershipEntity,
        ServiceEntity,
        ResourceEntity,
        ServiceResourceEntity,
        AvailabilityRuleEntity,
        AvailabilityExceptionEntity,
        SessionEntity,
        AppointmentEntity,
        AppointmentEventEntity,
        InvitationEntity,
        NotificationEntity,
        InAppNotificationEntity,
        AuthSessionEntity,
        PasswordResetEntity,
        AuditLogEntity,
      ],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    businessesService = new BusinessesService(dataSource);
    branchesService = new BranchesService(dataSource);
    servicesService = new ServicesService(dataSource);
    resourcesService = new ResourcesService(dataSource);

    const userRepo = dataSource.getRepository(UserEntity);
    ownerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Carlos',
        lastName: 'Dueño',
        email: 'carlos.dueno@voko.test',
        passwordHash: await argon2.hash('Secret123!'),
        isActive: true,
      }),
    );

    adminOtherUser = await userRepo.save(
      userRepo.create({
        firstName: 'Esteban',
        lastName: 'Externo',
        email: 'esteban.externo@voko.test',
        passwordHash: await argon2.hash('Secret123!'),
        isActive: true,
      }),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('1. Creación y Configuración Atómica de Negocios', () => {
    let createdBusiness: BusinessEntity;

    it('debe crear un negocio con sucursal principal, settings de marca y membresía de OWNER de forma atómica', async () => {
      createdBusiness = await businessesService.create(ownerUser.id, {
        name: 'Voko Barber Club',
        slug: 'voko-barber-club',
        description: 'Barbería moderna con reservas en línea',
        industry: 'Barbería',
        contactEmail: 'contacto@vokobarber.test',
        phone: '+54 11 5555-1234',
        primaryColor: '#0F172A',
        secondaryColor: '#38BDF8',
      });

      expect(createdBusiness.id).toBeDefined();
      expect(createdBusiness.name).toBe('Voko Barber Club');
      expect(createdBusiness.slug).toBe('voko-barber-club');
      expect(createdBusiness.status).toBe(BusinessStatus.ACTIVE);

      // Verificar sucursal principal por defecto
      const branchRepo = dataSource.getRepository(BranchEntity);
      const branches = await branchRepo.find({ where: { businessId: createdBusiness.id } });
      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('Sucursal Principal');
      expect(branches[0].isDefault).toBe(true);
      expect(branches[0].isActive).toBe(true);

      // Verificar settings de identidad visual
      const settingsRepo = dataSource.getRepository(BusinessSettingsEntity);
      const settings = await settingsRepo.findOne({ where: { businessId: createdBusiness.id } });
      expect(settings).toBeDefined();
      expect(settings?.brandPrimaryColor).toBe('#0F172A');
      expect(settings?.brandSecondaryColor).toBe('#38BDF8');
      expect(settings?.allowPublicBooking).toBe(true);

      // Verificar membresía de OWNER
      const membershipRepo = dataSource.getRepository(BusinessMembershipEntity);
      const membership = await membershipRepo.findOne({
        where: { businessId: createdBusiness.id, userId: ownerUser.id },
      });
      expect(membership).toBeDefined();
      expect(membership?.role).toBe(UserRole.OWNER);
      expect(membership?.status).toBe(MembershipStatus.ACTIVE);
    });

    it('debe rechazar la creación de un negocio con un slug duplicado con 409 Conflict', async () => {
      await expect(
        businessesService.create(ownerUser.id, {
          name: 'Voko Barber Club Clon',
          slug: 'voko-barber-club', // Mismo slug
          contactEmail: 'otro@vokobarber.test',
        }),
      ).rejects.toThrow("El slug 'voko-barber-club' ya está en uso");
    });

    it('debe permitir actualizar información y colores de marca del negocio', async () => {
      const updated = await businessesService.update(createdBusiness.id, {
        name: 'Voko Barber Club & Lounge',
        primaryColor: '#1E293B',
      });

      expect(updated.name).toBe('Voko Barber Club & Lounge');

      const settings = await businessesService.getSettings(createdBusiness.id);
      expect(settings.brandPrimaryColor).toBe('#1E293B');
    });
  });

  describe('2. Administración de Sucursales (Branches)', () => {
    let bizId: string;
    let defaultBranch: BranchEntity;

    beforeAll(async () => {
      const biz = await businessesService.create(ownerUser.id, {
        name: 'Clínica Dental Sonrisas',
        contactEmail: 'sonrisas@voko.test',
      });
      bizId = biz.id;
      const branches = await branchesService.findByBusiness(bizId);
      defaultBranch = branches[0];
    });

    it('debe crear una sucursal adicional no predeterminada', async () => {
      const newBranch = await branchesService.create(bizId, {
        name: 'Sucursal Belgrano',
        address: 'Cabildo 2040',
        city: 'CABA',
        phone: '+54 11 4781-0000',
        isDefault: false,
      });

      expect(newBranch.id).toBeDefined();
      expect(newBranch.name).toBe('Sucursal Belgrano');
      expect(newBranch.isDefault).toBe(false);

      const all = await branchesService.findByBusiness(bizId);
      expect(all).toHaveLength(2);
    });

    it('al marcar una sucursal como default, debe desmarcar automáticamente la anterior', async () => {
      const newDefault = await branchesService.create(bizId, {
        name: 'Sucursal Recoleta Central',
        address: 'Av. Alvear 1800',
        city: 'CABA',
        isDefault: true,
      });

      expect(newDefault.isDefault).toBe(true);

      const prev = await branchesService.findById(bizId, defaultBranch.id);
      expect(prev.isDefault).toBe(false);
    });

    it('debe rechazar desactivar la sucursal predeterminada sin designar otra previamente', async () => {
      const branches = await branchesService.findByBusiness(bizId);
      const currentDefault = branches.find((b) => b.isDefault)!;

      await expect(
        branchesService.update(bizId, currentDefault.id, { isActive: false }),
      ).rejects.toThrow('No se puede desactivar la sucursal predeterminada');
    });
  });

  describe('3. Administración de Servicios y Modalidades de Reserva', () => {
    let bizId: string;

    beforeAll(async () => {
      const biz = await businessesService.create(ownerUser.id, {
        name: 'Gimnasio & Deportes Olympus',
        contactEmail: 'olympus@voko.test',
      });
      bizId = biz.id;
    });

    it('debe crear un servicio individual con parámetros válidos de tiempo, precio y márgenes', async () => {
      const service = await servicesService.create(bizId, {
        name: 'Sesión de Entrenamiento Personalizado',
        description: 'Rutina individual con entrenador personal',
        durationMinutes: 60,
        price: 15000,
        currency: 'ARS',
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 10,
        minBookingNoticeMinutes: 120,
        maxBookingAdvanceDays: 14,
        cancellationDeadlineMinutes: 240,
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
      });

      expect(service.id).toBeDefined();
      expect(service.durationMinutes).toBe(60);
      expect(service.bufferBeforeMinutes).toBe(5);
      expect(service.bufferAfterMinutes).toBe(10);
      expect(service.bookingMode).toBe(BookingMode.INDIVIDUAL);
      expect(service.isActive).toBe(true);
    });

    it('debe crear un servicio para sesiones grupales con cupos', async () => {
      const groupService = await servicesService.create(bizId, {
        name: 'Clase Grupal de Spinning',
        durationMinutes: 45,
        price: 8000,
        bookingMode: BookingMode.GROUP_SESSION,
        confirmationMode: ConfirmationMode.AUTOMATIC,
      });

      expect(groupService.id).toBeDefined();
      expect(groupService.bookingMode).toBe(BookingMode.GROUP_SESSION);
    });

    it('debe crear un servicio de reserva exclusiva de recursos (canchas/salas)', async () => {
      const resourceService = await servicesService.create(bizId, {
        name: 'Alquiler de Cancha de Pádel Techada',
        durationMinutes: 90,
        price: 22000,
        bookingMode: BookingMode.RESOURCE_ONLY,
        confirmationMode: ConfirmationMode.AUTOMATIC,
      });

      expect(resourceService.id).toBeDefined();
      expect(resourceService.bookingMode).toBe(BookingMode.RESOURCE_ONLY);
    });

    it('debe permitir cambiar el estado activo/inactivo de un servicio', async () => {
      const service = await servicesService.create(bizId, {
        name: 'Servicio Temporal Descontinuable',
        durationMinutes: 30,
      });

      const deactivated = await servicesService.toggleStatus(bizId, service.id, false);
      expect(deactivated.isActive).toBe(false);

      const activeOnly = await servicesService.findByBusiness(bizId, { isActive: true });
      expect(activeOnly.some((s) => s.id === service.id)).toBe(false);
    });
  });

  describe('4. Administración de Recursos y Asignación de Servicios', () => {
    let bizId: string;
    let branchId: string;
    let haircutServiceId: string;
    let massageServiceId: string;

    beforeAll(async () => {
      const biz = await businessesService.create(ownerUser.id, {
        name: 'Spa Urbano Relax',
        contactEmail: 'relax@voko.test',
      });
      bizId = biz.id;
      const branches = await branchesService.findByBusiness(bizId);
      branchId = branches[0].id;

      const s1 = await servicesService.create(bizId, {
        name: 'Masaje Descontracturante',
        durationMinutes: 50,
      });
      haircutServiceId = s1.id;

      const s2 = await servicesService.create(bizId, {
        name: 'Circuito de Sauna y Relax',
        durationMinutes: 60,
      });
      massageServiceId = s2.id;
    });

    it('debe crear recursos de tipo STAFF y ROOM asignados a la sucursal', async () => {
      const staffResource = await resourcesService.create(bizId, {
        name: 'Dra. Laura Gómez',
        resourceType: ResourceType.STAFF,
        branchId,
        description: 'Kinesióloga y masoterapeuta',
        serviceIds: [haircutServiceId],
      });

      expect(staffResource.id).toBeDefined();
      expect(staffResource.resourceType).toBe(ResourceType.STAFF);

      const roomResource = await resourcesService.create(bizId, {
        name: 'Cabina Zen 01',
        resourceType: ResourceType.ROOM,
        branchId,
        serviceIds: [haircutServiceId, massageServiceId],
      });

      expect(roomResource.id).toBeDefined();
      expect(roomResource.resourceType).toBe(ResourceType.ROOM);

      // Verificar vinculación en detalle de recurso
      const detail = await resourcesService.findById(bizId, roomResource.id);
      expect(detail.services).toHaveLength(2);
    });

    it('PREVENCIÓN DE CONTAMINACIÓN CROSS-TENANT: debe rechazar asignar un recurso de otro negocio a un servicio', async () => {
      // Crear segundo negocio ajeno
      const otherBiz = await businessesService.create(adminOtherUser.id, {
        name: 'Taller Mecánico El Rayo',
        contactEmail: 'rayo@voko.test',
      });
      const otherBranches = await branchesService.findByBusiness(otherBiz.id);
      const alienResource = await resourcesService.create(otherBiz.id, {
        name: 'Elevador Hidráulico #1',
        resourceType: ResourceType.EQUIPMENT,
        branchId: otherBranches[0].id,
      });

      // Intentar vincular el elevador de 'El Rayo' al servicio de 'Spa Urbano'
      await expect(
        servicesService.create(bizId, {
          name: 'Servicio Contaminado Inválido',
          durationMinutes: 30,
          resourceIds: [alienResource.id],
        }),
      ).rejects.toThrow('Uno o más recursos asignados no existen o no pertenecen a este negocio');
    });

    it('debe rechazar crear un recurso si la sucursal no pertenece al negocio indicado', async () => {
      const otherBiz = await businessesService.create(adminOtherUser.id, {
        name: 'Barbería Segunda',
        contactEmail: 'segunda@voko.test',
      });
      const otherBranches = await branchesService.findByBusiness(otherBiz.id);

      await expect(
        resourcesService.create(bizId, {
          name: 'Empleado Fuera de Sucursal',
          resourceType: ResourceType.STAFF,
          branchId: otherBranches[0].id, // Sucursal del otro negocio
        }),
      ).rejects.toThrow('La sucursal indicada no existe o no pertenece a este negocio');
    });

    it('debe permitir actualizar la asignación de servicios de un recurso', async () => {
      const resource = await resourcesService.create(bizId, {
        name: 'Camilla Térmica #2',
        resourceType: ResourceType.EQUIPMENT,
        branchId,
        serviceIds: [haircutServiceId],
      });

      // Actualizar vinculando ambos servicios
      await resourcesService.update(bizId, resource.id, {
        serviceIds: [haircutServiceId, massageServiceId],
      });

      const updated = await resourcesService.findById(bizId, resource.id);
      expect(updated.services).toHaveLength(2);
    });
  });
});
