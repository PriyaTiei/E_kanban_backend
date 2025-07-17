ALTER TABLE "station_parts" DROP CONSTRAINT "station_parts_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" DROP CONSTRAINT "station_parts_exception_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" ADD COLUMN "allowed_for_all_products" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "station_parts" ADD COLUMN "process" integer;--> statement-breakpoint
ALTER TABLE "station_parts" ADD COLUMN "prep-location" varchar(50);--> statement-breakpoint
ALTER TABLE "station_parts" ADD COLUMN "supply-location" varchar(50);--> statement-breakpoint
ALTER TABLE "station_parts" DROP COLUMN "product_id";--> statement-breakpoint
ALTER TABLE "station_parts" DROP COLUMN "exception_product_id";