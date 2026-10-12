import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { UserEntity } from '../../database/entities/user.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AppointmentEntity,
      BusinessMembershipEntity,
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
