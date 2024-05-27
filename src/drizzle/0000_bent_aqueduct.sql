-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
DO $$ BEGIN
 CREATE TYPE "public"."Role" AS ENUM('CLIENT', 'ADMIN', 'OWNER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"paid" boolean NOT NULL,
	"value" numeric(65, 30) NOT NULL,
	"start" timestamp(3) NOT NULL,
	"end" timestamp(3) NOT NULL,
	"due" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Org" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"orgUserId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrgUser" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "Role" DEFAULT 'CLIENT' NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Report" (
	"id" text PRIMARY KEY NOT NULL,
	"rating" integer NOT NULL,
	"notes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserInvoice" (
	"userId" text NOT NULL,
	"invoiceId" text NOT NULL,
	"orgUserId" text,
	CONSTRAINT "UserInvoice_pkey" PRIMARY KEY("userId","invoiceId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserReport" (
	"userId" text NOT NULL,
	"reportId" text NOT NULL,
	"orgUserId" text,
	CONSTRAINT "UserReport_pkey" PRIMARY KEY("userId","reportId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Org" ADD CONSTRAINT "Org_orgUserId_fkey" FOREIGN KEY ("orgUserId") REFERENCES "public"."OrgUser"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgUser" ADD CONSTRAINT "OrgUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_orgUserId_fkey" FOREIGN KEY ("orgUserId") REFERENCES "public"."OrgUser"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."Report"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_orgUserId_fkey" FOREIGN KEY ("orgUserId") REFERENCES "public"."OrgUser"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Org_name_key" ON "Org" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Org_orgUserId_key" ON "Org" ("orgUserId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");
*/