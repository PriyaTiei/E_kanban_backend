ALTER TABLE "kanban_requests" DROP CONSTRAINT "kanban_requests_exception_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" ADD COLUMN "exception_product_id" integer;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_exception_product_id_products_id_fk" FOREIGN KEY ("exception_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" DROP COLUMN "exception_product_id";