ALTER TABLE "Invoice" ALTER COLUMN "value" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "Org" DROP COLUMN IF EXISTS "owner";