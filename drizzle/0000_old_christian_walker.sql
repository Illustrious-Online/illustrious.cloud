DO $$ BEGIN
 CREATE TYPE "public"."Role" AS ENUM('CLIENT', 'ADMIN', 'OWNER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Authentication" (
	"id" text PRIMARY KEY NOT NULL,
	"sub" text NOT NULL
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
CREATE TABLE IF NOT EXISTS "OrgUser" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "Role" DEFAULT 'CLIENT' NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Org" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Report" (
	"id" text PRIMARY KEY NOT NULL,
	"rating" integer NOT NULL,
	"notes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserAuthentications" (
	"userId" text NOT NULL,
	"authId" text NOT NULL,
	CONSTRAINT "UserAuthentication_pkey" PRIMARY KEY("authId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserInvoice" (
	"userId" text NOT NULL,
	"invoiceId" text NOT NULL,
	CONSTRAINT "UserInvoice_pkey" PRIMARY KEY("userId","invoiceId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserReport" (
	"userId" text NOT NULL,
	"reportId" text NOT NULL,
	CONSTRAINT "UserReport_pkey" PRIMARY KEY("userId","reportId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgUser" ADD CONSTRAINT "OrgUser_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgUser" ADD CONSTRAINT "OrgUser_orgId_Org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserAuthentications" ADD CONSTRAINT "UserAuthentications_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserAuthentications" ADD CONSTRAINT "UserAuthentications_authId_Authentication_id_fk" FOREIGN KEY ("authId") REFERENCES "public"."Authentication"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInvoice" ADD CONSTRAINT "UserInvoice_invoiceId_Invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportId_Report_id_fk" FOREIGN KEY ("reportId") REFERENCES "public"."Report"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");