import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInAppNotifications1700000000002 implements MigrationInterface {
  name = 'CreateInAppNotifications1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "in_app_notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid REFERENCES "businesses"("id") ON DELETE CASCADE,
        "recipient_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "target_role" varchar(50),
        "event_type" varchar(100) NOT NULL,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_in_app_notif_recipient_read" ON "in_app_notifications" ("recipient_user_id", "is_read");
      CREATE INDEX IF NOT EXISTS "idx_in_app_notif_business_created" ON "in_app_notifications" ("business_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_in_app_notif_recipient_created" ON "in_app_notifications" ("recipient_user_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "in_app_notifications" CASCADE;`);
  }
}

