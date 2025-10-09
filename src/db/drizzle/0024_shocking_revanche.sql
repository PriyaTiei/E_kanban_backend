ALTER TABLE "frozen_kanbans" ALTER COLUMN "process" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "process_freeze_state" ALTER COLUMN "process" SET DATA TYPE varchar(20);