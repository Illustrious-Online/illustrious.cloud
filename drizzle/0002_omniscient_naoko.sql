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
ALTER TABLE "Report" ALTER COLUMN "notes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Invoice" ADD COLUMN "owner" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Report" ADD COLUMN "owner" text NOT NULL;--> statement-breakpoint
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
