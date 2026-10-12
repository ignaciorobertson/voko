import AppDataSource from '../../../database/data-source';
import { UserEntity } from '../../../database/entities/user.entity';
import * as argon2 from 'argon2';

async function createSuperadmin() {
  const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@voko.app').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperadminVoko2026!';
  const firstName = process.env.SUPERADMIN_FIRSTNAME || 'Superadmin';
  const lastName = process.env.SUPERADMIN_LASTNAME || 'Voko';

  console.log(`🔐 Inicializando creación segura de Superadmin para: ${email}...`);
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(UserEntity);
  let user = await userRepo.findOne({ where: { email } });

  const passwordHash = await argon2.hash(password);

  if (user) {
    user.isSuperadmin = true;
    user.isActive = true;
    user.passwordHash = passwordHash;
    await userRepo.save(user);
    console.log(`✅ Usuario existente ${email} actualizado con rol Superadmin y nueva contraseña hasheada.`);
  } else {
    user = await userRepo.save(
      userRepo.create({
        firstName,
        lastName,
        email,
        passwordHash,
        isActive: true,
        isSuperadmin: true,
        emailVerifiedAt: new Date(),
      }),
    );
    console.log(`✅ Superadmin creado con éxito con ID: ${user.id}`);
  }

  await AppDataSource.destroy();
}

createSuperadmin().catch((err) => {
  console.error('❌ Error creando Superadmin:', err);
  process.exit(1);
});
