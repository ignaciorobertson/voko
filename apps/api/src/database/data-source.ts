import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno del archivo raíz o local
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { ALL_ENTITIES } from './entities/index';
import { InitialHealthSchema1700000000000 } from './migrations/1700000000000-InitialHealthSchema';
import { InitialSchema1700000000001 } from './migrations/1700000000001-InitialSchema';
import { CreateInAppNotifications1700000000002 } from './migrations/1700000000002-CreateInAppNotifications';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'voko_user',
  password: process.env.DB_PASSWORD || 'voko_secure_password',
  database: process.env.DB_NAME || 'voko_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false, // Migraciones obligatorias versionadas
  logging: process.env.NODE_ENV === 'development',
  entities: ALL_ENTITIES,
  migrations: [
    InitialHealthSchema1700000000000,
    InitialSchema1700000000001,
    CreateInAppNotifications1700000000002,
  ],
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
