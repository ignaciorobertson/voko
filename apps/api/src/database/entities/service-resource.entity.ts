import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceEntity } from './service.entity';
import { ResourceEntity } from './resource.entity';

@Entity('service_resources')
@Index(['serviceId', 'resourceId'], { unique: true })
export class ServiceResourceEntity {
  @PrimaryColumn({ name: 'service_id', type: 'uuid' })
  serviceId!: string;

  @PrimaryColumn({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ServiceEntity, (service) => service.serviceResources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @ManyToOne(() => ResourceEntity, (resource) => resource.serviceResources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity;
}
