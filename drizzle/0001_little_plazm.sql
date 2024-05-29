ALTER TABLE "User" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "picture" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "phone" text;