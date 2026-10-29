import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import * as argon2 from 'argon2';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { InvitationsService } from '../invitations/invitations.service';
import { DecoupledEmailService } from './email/password-reset-email.provider';
import {
  ALL_ENTITIES,
  UserEntity,
  BusinessEntity,
  BusinessMembershipEntity,
  InvitationEntity,
  AuthSessionEntity,
} from '../../database/entities';
import { UserRole, MembershipStatus, InvitationStatus, InvitationType } from '@voko/shared';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('Hito 3: Autenticación, Usuarios y Autorización Multiempresa', () => {
  let dataSource: DataSource;
  let authService: AuthService;
  let invitationsService: InvitationsService;
  let tokenService: TokenService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      dropSchema: true,
      entities: ALL_ENTITIES,
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
      ],
      providers: [
        AuthService,
        InvitationsService,
        TokenService,
        DecoupledEmailService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    invitationsService = module.get<InvitationsService>(InvitationsService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('1. Registro y Hashing Seguro (Argon2id)', () => {
    it('debe registrar un usuario guardando su contraseña con hash Argon2id (nunca texto plano)', async () => {
      const result = await authService.register(
        {
          firstName: 'Nicolás',
          lastName: 'Tester',
          email: 'nicolas@voko.test',
          password: 'PasswordSuperSegura2026!',
          phone: '+5491111111111',
        },
        '127.0.0.1',
        'Jest/Node',
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('nicolas@voko.test');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verificar en base de datos que la contraseña no sea texto plano
      const userInDb = await dataSource.getRepository(UserEntity).findOneBy({ email: 'nicolas@voko.test' });
      expect(userInDb?.passwordHash).toBeDefined();
      expect(userInDb?.passwordHash).not.toBe('PasswordSuperSegura2026!');
      expect(userInDb?.passwordHash).toMatch(/^\$argon2id\$/);

      const isValidHash = await argon2.verify(userInDb!.passwordHash!, 'PasswordSuperSegura2026!');
      expect(isValidHash).toBe(true);
    });

    it('debe rechazar registro duplicado con el mismo correo electrónico', async () => {
      await expect(
        authService.register({
          firstName: 'Nicolás',
          lastName: 'Clon',
          email: 'nicolas@voko.test',
          password: 'OtraPassword123!',
        }),
      ).rejects.toThrow('Ya existe una cuenta registrada');
    });
  });

  describe('2. Inicio de Sesión y Rotación de Refresh Tokens', () => {
    it('debe permitir login con credenciales correctas y generar sesión en base de datos', async () => {
      const result = await authService.login(
        { email: 'nicolas@voko.test', password: 'PasswordSuperSegura2026!' },
        '127.0.0.1',
        'Jest',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verificar payload del JWT
      const decoded: any = tokenService.decode(result.accessToken);
      expect(decoded.email).toBe('nicolas@voko.test');
      expect(decoded.sub).toBe(result.user.id);

      // Verificar que el hash del refresh token esté almacenado
      const sessionCount = await dataSource.getRepository(AuthSessionEntity).count({
        where: { userId: result.user.id, isRevoked: false },
      });
      expect(sessionCount).toBeGreaterThan(0);
    });

    it('debe rechazar login con contraseña incorrecta', async () => {
      await expect(
        authService.login({ email: 'nicolas@voko.test', password: 'PasswordErronea' }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('debe rotar el Refresh Token: revocar el anterior y emitir un par nuevo', async () => {
      const initial = await authService.login(
        { email: 'nicolas@voko.test', password: 'PasswordSuperSegura2026!' },
        '127.0.0.1',
      );

      const refreshed = await authService.refresh(initial.refreshToken, '127.0.0.1');
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).not.toBe(initial.refreshToken);

      // El token anterior debe haber quedado revocado
      await expect(authService.refresh(initial.refreshToken)).rejects.toThrow();
    });

    it('debe revocar la sesión activa al hacer logout', async () => {
      const loginResult = await authService.login(
        { email: 'nicolas@voko.test', password: 'PasswordSuperSegura2026!' },
        '127.0.0.1',
      );

      await authService.logout(loginResult.refreshToken);

      // Intento de refresh con token cerrado debe fallar
      await expect(authService.refresh(loginResult.refreshToken)).rejects.toThrow();
    });
  });

  describe('3. Recuperación Segura de Contraseña', () => {
    it('debe generar token de restablecimiento y permitir actualizar la contraseña revocando sesiones previas', async () => {
      const forgotResult = await authService.forgotPassword({ email: 'nicolas@voko.test' });
      expect(forgotResult.debugToken).toBeDefined();

      const resetResult = await authService.resetPassword({
        token: forgotResult.debugToken!,
        newPassword: 'NuevaPassword2026Robusta!',
      });
      expect(resetResult.message).toContain('Contraseña actualizada con éxito');

      // Login con la contraseña anterior debe fallar
      await expect(
        authService.login({ email: 'nicolas@voko.test', password: 'PasswordSuperSegura2026!' }),
      ).rejects.toThrow('Credenciales inválidas');

      // Login con la nueva contraseña debe tener éxito
      const newLogin = await authService.login({
        email: 'nicolas@voko.test',
        password: 'NuevaPassword2026Robusta!',
      });
      expect(newLogin.accessToken).toBeDefined();
    });
  });

  describe('4. Flujo Seguro de Invitaciones', () => {
    let bizId: string;
    let inviterUser: UserEntity;

    beforeAll(async () => {
      const bizRepo = dataSource.getRepository(BusinessEntity);
      const userRepo = dataSource.getRepository(UserEntity);

      const biz = await bizRepo.save(
        bizRepo.create({ name: 'Estudio Jurídico', slug: 'estudio-juridico', contactEmail: 'legal@voko.test' }),
      );
      bizId = biz.id;

      inviterUser = await userRepo.save(
        userRepo.create({ firstName: 'Dr. Martín', lastName: 'Socio', email: 'martin@legal.test' }),
      );
    });

    it('debe generar una invitación con token criptográfico y fecha de expiración', async () => {
      const inv = await invitationsService.create(
        { email: 'abogado.junior@legal.test', role: UserRole.STAFF, businessId: bizId },
        inviterUser.id,
      );

      expect(inv.id).toBeDefined();
      expect(inv.token).toBeDefined();
      expect(inv.expiresAt).toBeInstanceOf(Date);

      const verified = await invitationsService.verify(inv.token);
      expect(verified.valid).toBe(true);
      expect(verified.email).toBe('abogado.junior@legal.test');
      expect(verified.businessName).toBe('Estudio Jurídico');
    });

    it('debe permitir aceptar la invitación, creando usuario y membresía en el negocio', async () => {
      const inv = await invitationsService.create(
        { email: 'asistente@legal.test', role: UserRole.STAFF, businessId: bizId },
        inviterUser.id,
      );

      const session = await invitationsService.accept({
        token: inv.token,
        password: 'PasswordEmpleado2026!',
        firstName: 'Lucía',
        lastName: 'Asistente',
      });

      expect(session.accessToken).toBeDefined();
      expect(session.user.email).toBe('asistente@legal.test');

      // Comprobar membresía asignada en el negocio
      const mem = await dataSource.getRepository(BusinessMembershipEntity).findOne({
        where: { businessId: bizId, userId: session.user.id },
      });
      expect(mem).not.toBeNull();
      expect(mem?.role).toBe(UserRole.STAFF);

      // Comprobar que la invitación ahora está en estado ACCEPTED
      const invInDb = await dataSource.getRepository(InvitationEntity).findOneBy({ id: inv.id });
      expect(invInDb?.status).toBe(InvitationStatus.ACCEPTED);
      expect(invInDb?.acceptedAt).toBeInstanceOf(Date);
    });

    it('debe rechazar intento de reutilizar una invitación ya aceptada', async () => {
      const inv = await invitationsService.create(
        { email: 'otro@legal.test', role: UserRole.CUSTOMER, businessId: bizId },
        inviterUser.id,
      );

      await invitationsService.accept({
        token: inv.token,
        password: 'Password12345!',
      });

      // Segundo intento con el mismo token
      await expect(
        invitationsService.accept({ token: inv.token, password: 'Password12345!' }),
      ).rejects.toThrow();
    });
  });

  describe('5. Aislamiento Multi-Tenant (TenantContextGuard)', () => {
    let bizAId: string;
    let bizBId: string;
    let adminA: UserEntity;
    let customerA: UserEntity;
    let superadmin: UserEntity;
    let guard: TenantContextGuard;

    beforeAll(async () => {
      const bizRepo = dataSource.getRepository(BusinessEntity);
      const userRepo = dataSource.getRepository(UserEntity);
      const memRepo = dataSource.getRepository(BusinessMembershipEntity);

      const bizA = await bizRepo.save(bizRepo.create({ name: 'Negocio Alpha', slug: 'alpha', contactEmail: 'a@voko.test' }));
      const bizB = await bizRepo.save(bizRepo.create({ name: 'Negocio Beta', slug: 'beta', contactEmail: 'b@voko.test' }));
      bizAId = bizA.id;
      bizBId = bizB.id;

      adminA = await userRepo.save(userRepo.create({ firstName: 'Admin', lastName: 'Alpha', email: 'admin.alpha@voko.test' }));
      customerA = await userRepo.save(userRepo.create({ firstName: 'Cliente', lastName: 'Alpha', email: 'client.alpha@voko.test' }));
      superadmin = await userRepo.save(userRepo.create({ firstName: 'Root', lastName: 'Platform', email: 'root@voko.test', isSuperadmin: true }));

      // Membresías en Negocio Alpha
      await memRepo.save([
        memRepo.create({ businessId: bizAId, userId: adminA.id, role: UserRole.ADMIN, status: MembershipStatus.ACTIVE }),
        memRepo.create({ businessId: bizAId, userId: customerA.id, role: UserRole.CUSTOMER, status: MembershipStatus.ACTIVE }),
      ]);

      guard = new TenantContextGuard(dataSource);
    });

    it('debe permitir acceso al administrador de Negocio A en Negocio A', async () => {
      const req: any = {
        user: { id: adminA.id, email: adminA.email, isSuperadmin: false },
        params: { businessId: bizAId },
        headers: {},
        query: {},
      };
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      };

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(req.tenant.role).toBe(UserRole.ADMIN);
    });

    it('PREVENCIÓN DE CROSS-TENANT LEAK: debe rechazar al administrador de Negocio A intentando acceder a Negocio B', async () => {
      const req: any = {
        user: { id: adminA.id, email: adminA.email, isSuperadmin: false },
        params: { businessId: bizBId }, // Intentando entrar a Beta
        headers: {},
        query: {},
      };
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      };

      await expect(guard.canActivate(mockContext)).rejects.toThrow('Acceso denegado: no posee una membresía activa');
    });

    it('SUPERADMIN OVERRIDE: debe permitir al Superadmin acceder a cualquier negocio', async () => {
      const req: any = {
        user: { id: superadmin.id, email: superadmin.email, isSuperadmin: true },
        params: { businessId: bizBId },
        headers: {},
        query: {},
      };
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      };

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(req.tenant.isSuperadminOverride).toBe(true);
    });
  });

  describe('6. Control de Acceso por Roles (RolesGuard)', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;

    beforeAll(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    it('debe permitir acceso a usuario con rol OWNER o ADMIN', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      const mockContext: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            tenant: { role: UserRole.ADMIN },
          }),
        }),
      };

      expect(rolesGuard.canActivate(mockContext)).toBe(true);
    });

    it('debe rechazar a un CUSTOMER cuando la ruta requiere rol ADMIN', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      const mockContext: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            tenant: { role: UserRole.CUSTOMER },
          }),
        }),
      };

      expect(() => rolesGuard.canActivate(mockContext)).toThrow('Permiso denegado');
    });
  });
});
