ALTER TABLE "kanban_requests" ALTER COLUMN "plant_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "product_entry_logs" ALTER COLUMN "plant_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "station_parts" ALTER COLUMN "plant_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "plant_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plant_id" SET DEFAULT 1;