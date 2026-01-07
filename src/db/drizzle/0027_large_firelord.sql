ALTER TABLE "kanban_requests" ALTER COLUMN "part_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD COLUMN "station_parts_id" integer;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "sequence_no" integer;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_station_parts_id_station_parts_id_fk" FOREIGN KEY ("station_parts_id") REFERENCES "public"."station_parts"("id") ON DELETE cascade ON UPDATE no action;