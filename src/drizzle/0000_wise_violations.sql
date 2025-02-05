CREATE TABLE IF NOT EXISTS "Authentication" (
	"id" text PRIMARY KEY NOT NULL,
	"sub" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"paid" boolean NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"start" timestamp NOT NULL,
	"end" timestamp NOT NULL,
	"due" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrgInvoice" (
	"orgId" text NOT NULL,
	"invoiceId" text NOT NULL,
	CONSTRAINT "OrgInvoice_pkey" PRIMARY KEY("orgId","invoiceId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrgReport" (
	"orgId" text NOT NULL,
	"reportId" text NOT NULL,
	CONSTRAINT "OrgReport_pkey" PRIMARY KEY("orgId","reportId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrgUser" (
	"role" integer DEFAULT 0 NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	CONSTRAINT "OrgUser_pkey" PRIMARY KEY("orgId","userId")
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
	"notes" text,
	"createdAt" timestamp NOT NULL
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
	"identifier" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"picture" text,
	"phone" text,
	"super_admin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgInvoice" ADD CONSTRAINT "OrgInvoice_orgId_Org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgInvoice" ADD CONSTRAINT "OrgInvoice_invoiceId_Invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgReport" ADD CONSTRAINT "OrgReport_orgId_Org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrgReport" ADD CONSTRAINT "OrgReport_reportId_Report_id_fk" FOREIGN KEY ("reportId") REFERENCES "public"."Report"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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