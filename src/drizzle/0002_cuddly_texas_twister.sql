CREATE TABLE "Inquiry" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"service" text NOT NULL,
	"message" text NOT NULL,
	"recaptchaToken" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "OrgInquiry" (
	"orgId" text NOT NULL,
	"inquiryId" text NOT NULL,
	CONSTRAINT "OrgInquiry_pkey" PRIMARY KEY("orgId","inquiryId")
);
--> statement-breakpoint
ALTER TABLE "OrgInquiry" ADD CONSTRAINT "OrgInquiry_inquiryId_Inquiry_id_fk" FOREIGN KEY ("inquiryId") REFERENCES "public"."Inquiry"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OrgInquiry" ADD CONSTRAINT "OrgInquiry_orgId_Org_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE restrict ON UPDATE cascade;