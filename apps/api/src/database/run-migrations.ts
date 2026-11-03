import AppDataSource from './data-source';

async function main() {
  console.log('🔄 Conectando con PostgreSQL para ejecutar migraciones...');
  await AppDataSource.initialize();
  console.log('🔄 Ejecutando migraciones pendientes en PostgreSQL...');
  const migrations = await AppDataSource.runMigrations();
  if (migrations.length === 0) {
    console.log('ℹ️ No hay migraciones pendientes. El esquema ya está actualizado.');
  } else {
    console.log(`✅ ${migrations.length} migración(es) aplicada(s) exitosamente:`);
    migrations.forEach((m) => console.log(`   - ${m.name}`));
  }
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Error ejecutando migraciones en PostgreSQL:', err);
  process.exit(1);
});

