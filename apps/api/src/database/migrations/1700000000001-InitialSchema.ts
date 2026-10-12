import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(50),
        "password_hash" varchar(255),
        "birth_date" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_superadmin" boolean NOT NULL DEFAULT false,
        "email_verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email_unique" ON "users" (LOWER("email")) WHERE "deleted_at" IS NULL;
    `);

    // 2. businesses
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "businesses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "description" text,
        "industry" varchar(100),
        "logo_url" text,
        "contact_email" varchar(255) NOT NULL,
        "phone" varchar(50),
        "tax_id" varchar(50),
        "timezone" varchar(50) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
        "currency" varchar(10) NOT NULL DEFAULT 'ARS',
        "status" varchar(50) NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_businesses_slug_unique" ON "businesses" ("slug");
    `);

    // 3. branches
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name" varchar(150) NOT NULL,
        "address" varchar(255),
        "city" varchar(100),
        "phone" varchar(50),
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_branches_business_id" ON "branches" ("business_id");
    `);

    // 4. business_memberships
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_memberships" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" varchar(50) NOT NULL DEFAULT 'CUSTOMER',
        "custom_permissions" jsonb,
        "status" varchar(50) NOT NULL DEFAULT 'ACTIVE',
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_business_user_membership" UNIQUE ("business_id", "user_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_memberships_business" ON "business_memberships" ("business_id");
      CREATE INDEX IF NOT EXISTS "idx_memberships_user" ON "business_memberships" ("user_id");
    `);

    // 5. services
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name" varchar(150) NOT NULL,
        "description" text,
        "duration_minutes" integer NOT NULL,
        "price" numeric(10, 2),
        "currency" varchar(10) NOT NULL DEFAULT 'ARS',
        "buffer_before_minutes" integer NOT NULL DEFAULT 0,
        "buffer_after_minutes" integer NOT NULL DEFAULT 0,
        "min_booking_notice_minutes" integer NOT NULL DEFAULT 60,
        "max_booking_advance_days" integer NOT NULL DEFAULT 30,
        "cancellation_deadline_minutes" integer NOT NULL DEFAULT 120,
        "booking_mode" varchar(50) NOT NULL DEFAULT 'INDIVIDUAL',
        "confirmation_mode" varchar(50) NOT NULL DEFAULT 'AUTOMATIC',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_services_business" ON "services" ("business_id");
    `);

    // 6. resources
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resources" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "name" varchar(150) NOT NULL,
        "resource_type" varchar(50) NOT NULL DEFAULT 'STAFF',
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_resources_business" ON "resources" ("business_id");
      CREATE INDEX IF NOT EXISTS "idx_resources_branch" ON "resources" ("branch_id");
    `);

    // 7. service_resources
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_resources" (
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("service_id", "resource_id")
      );
    `);

    // 8. availability_rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availability_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "resource_id" uuid REFERENCES "resources"("id") ON DELETE CASCADE,
        "day_of_week" smallint NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_avail_rules_business" ON "availability_rules" ("business_id");
      CREATE INDEX IF NOT EXISTS "idx_avail_rules_resource" ON "availability_rules" ("resource_id");
      CREATE INDEX IF NOT EXISTS "idx_avail_rules_day" ON "availability_rules" ("day_of_week");
    `);

    // 9. availability_exceptions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availability_exceptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "resource_id" uuid REFERENCES "resources"("id") ON DELETE CASCADE,
        "start_time" timestamptz NOT NULL,
        "end_time" timestamptz NOT NULL,
        "exception_type" varchar(50) NOT NULL DEFAULT 'HOLIDAY',
        "reason" varchar(255),
        "is_blocking" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_avail_exc_business" ON "availability_exceptions" ("business_id");
      CREATE INDEX IF NOT EXISTS "idx_avail_exc_resource" ON "availability_exceptions" ("resource_id");
      CREATE INDEX IF NOT EXISTS "idx_avail_exc_time" ON "availability_exceptions" ("start_time", "end_time");
    `);

    // 10. sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "resource_id" uuid REFERENCES "resources"("id") ON DELETE SET NULL,
        "start_time" timestamptz NOT NULL,
        "end_time" timestamptz NOT NULL,
        "max_capacity" integer NOT NULL,
        "current_attendees" integer NOT NULL DEFAULT 0,
        "status" varchar(50) NOT NULL DEFAULT 'OPEN',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_sessions_capacity" CHECK ("current_attendees" <= "max_capacity"),
        CONSTRAINT "chk_sessions_attendees_positive" CHECK ("current_attendees" >= 0)
      );
      CREATE INDEX IF NOT EXISTS "idx_sessions_business_time" ON "sessions" ("business_id", "start_time");
      CREATE INDEX IF NOT EXISTS "idx_sessions_service" ON "sessions" ("service_id");
    `);

    // 11. appointments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE RESTRICT,
        "resource_id" uuid REFERENCES "resources"("id") ON DELETE SET NULL,
        "session_id" uuid REFERENCES "sessions"("id") ON DELETE SET NULL,
        "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "start_time" timestamptz NOT NULL,
        "end_time" timestamptz NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "snapshot_price" numeric(10, 2),
        "snapshot_duration_minutes" integer NOT NULL,
        "snapshot_currency" varchar(10) NOT NULL DEFAULT 'ARS',
        "customer_notes" text,
        "internal_notes" text,
        "cancelled_at" timestamptz,
        "cancellation_reason" varchar(255),
        "cancelled_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_appointments_business_start" ON "appointments" ("business_id", "start_time");
      CREATE INDEX IF NOT EXISTS "idx_appointments_res_overlap" ON "appointments" ("resource_id", "start_time", "end_time") WHERE "status" IN ('PENDING', 'CONFIRMED');
      CREATE INDEX IF NOT EXISTS "idx_appointments_customer" ON "appointments" ("customer_id");
    `);

    // 12. appointment_events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointment_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
        "event_type" varchar(50) NOT NULL DEFAULT 'CREATED',
        "previous_status" varchar(50),
        "new_status" varchar(50) NOT NULL,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_app_events_appointment" ON "appointment_events" ("appointment_id");
      CREATE INDEX IF NOT EXISTS "idx_app_events_created" ON "appointment_events" ("created_at");
    `);

    // 13. invitations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid REFERENCES "businesses"("id") ON DELETE CASCADE,
        "invited_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "email" varchar(255) NOT NULL,
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "invitation_type" varchar(50) NOT NULL DEFAULT 'CUSTOMER',
        "status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_invitations_business" ON "invitations" ("business_id");
      CREATE INDEX IF NOT EXISTS "idx_invitations_email" ON "invitations" ("email");
    `);

    // 14. notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid REFERENCES "businesses"("id") ON DELETE CASCADE,
        "recipient_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "recipient_email" varchar(255) NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "channel" varchar(50) NOT NULL DEFAULT 'EMAIL',
        "status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "payload" jsonb NOT NULL,
        "scheduled_at" timestamptz NOT NULL DEFAULT now(),
        "processed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" ("status");
      CREATE INDEX IF NOT EXISTS "idx_notifications_scheduled" ON "notifications" ("scheduled_at");
    `);

    // 15. auth_sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "refresh_token_hash" varchar(255) NOT NULL UNIQUE,
        "user_agent" text,
        "ip_address" varchar(50),
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_auth_sessions_user" ON "auth_sessions" ("user_id");
    `);

    // 16. password_resets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "is_used" boolean NOT NULL DEFAULT false,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_password_resets_user" ON "password_resets" ("user_id");
    `);

    // 17. business_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL UNIQUE REFERENCES "businesses"("id") ON DELETE CASCADE,
        "allow_public_booking" boolean NOT NULL DEFAULT true,
        "require_email_verification" boolean NOT NULL DEFAULT false,
        "default_slot_interval_minutes" integer NOT NULL DEFAULT 30,
        "brand_primary_color" varchar(20) NOT NULL DEFAULT '#1E40AF',
        "brand_secondary_color" varchar(20) NOT NULL DEFAULT '#38BDF8',
        "custom_notification_config" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 18. audit_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid REFERENCES "businesses"("id") ON DELETE SET NULL,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(100) NOT NULL,
        "entity_name" varchar(100) NOT NULL,
        "entity_id" uuid,
        "diff_data" jsonb,
        "ip_address" varchar(50),
        "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_business" ON "audit_logs" ("business_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs" ("created_at");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_resets" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_exceptions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_rules" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_resources" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resources" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_memberships" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branches" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "businesses" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
  }
}
