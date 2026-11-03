import AppDataSource from '../data-source';
import { runDevSeeds } from './dev-seeds';
import { UserEntity } from '../entities';

async function main() {
  console.log('🌱 Conectando con la base de datos para sembrar datos de desarrollo...');
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(UserEntity);
  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@voko.app' } });

  if (existingAdmin) {
    console.log('ℹ️ Los datos de desarrollo (seeds) ya se encuentran cargados en la base de datos.');
  } else {
    console.log('🌱 Ejecutando semillas de desarrollo (3 modalidades, negocios, usuarios y turnos)...');
    await runDevSeeds(AppDataSource);
    console.log('✅ Semillas completadas con éxito.');
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Error ejecutando semillas:', err);
  process.exit(1);
});
