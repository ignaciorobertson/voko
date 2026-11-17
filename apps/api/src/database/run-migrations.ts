import AppDataSource from './data-source';

async function main() {
  try {
    console.log('🔌 Conectando con PostgreSQL...');

    await AppDataSource.initialize();

    console.log('✅ Conexión establecida.');
    console.log('🔄 Verificando migraciones pendientes...');

    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('✅ No hay migraciones pendientes.');
    } else {
      console.log(`✅ Se ejecutaron ${migrations.length} migraciones:`);

      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexión con PostgreSQL cerrada.');
    }
  }
}

main().catch((error: unknown) => {
  console.error('❌ Error ejecutando las migraciones:', error);
  process.exitCode = 1;
});

// import AppDataSource from './data-source';

// async function main() {
//   console.log('🔄 Conectando con PostgreSQL para ejecutar migraciones...');
//   await AppDataSource.initialize();
//   console.log('🔄 Ejecutando migraciones pendientes en PostgreSQL...');
//   const migrations = await AppDataSource.runMigrations();
//   if (migrations.length === 0) {
//     console.log('ℹ️ No hay migraciones pendientes. El esquema ya está actualizado.');
//   } else {
//     console.log(`✅ ${migrations.length} migración(es) aplicada(s) exitosamente:`);
//     migrations.forEach((m) => console.log(`   - ${m.name}`));
//   }
//   await AppDataSource.destroy();
// }

// main().catch((err) => {
//   console.error('❌ Error ejecutando migraciones en PostgreSQL:', err);
//   process.exit(1);
// });

