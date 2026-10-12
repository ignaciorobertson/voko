import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceEntity,
      BranchEntity,
      ServiceEntity,
      ServiceResourceEntity,
      UserEntity,
    ]),
  ],
  providers: [ResourcesService],
  controllers: [ResourcesController],
  exports: [ResourcesService],
})
export class ResourcesModule {}
