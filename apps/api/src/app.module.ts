import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { BranchesModule } from './modules/branches/branches.module';
import { ServicesModule } from './modules/services/services.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 30,  // Máximo 30 solicitudes por minuto
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    InvitationsModule,
    BusinessesModule,
    BranchesModule,
    ServicesModule,
    ResourcesModule,
    AvailabilityModule,
    AppointmentsModule,
    SessionsModule,
    PublicBookingModule,
    CustomersModule,
    CustomerPortalModule,
    ReportsModule,
    SuperadminModule,
    NotificationsModule,
  ],
})
export class AppModule {}
