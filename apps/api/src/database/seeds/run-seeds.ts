import AppDataSource from '../data-source';
import { runDevSeeds } from './dev-seeds';

async function main() {
  console.log('🌱 Conectando con la base de datos para sembrar datos de desarrollo...');
  await AppDataSource.initialize();
  console.log('🌱 Ejecutando semillas de desarrollo (3 modalidades, negocios, usuarios y turnos)...');
  await runDevSeeds(AppDataSource);
  console.log('✅ Semillas completadas con éxito.');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Error ejecutando semillas:', err);
  process.exit(1);
});
