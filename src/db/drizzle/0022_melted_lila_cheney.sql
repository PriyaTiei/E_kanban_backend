ALTER TABLE "parts" ADD COLUMN "plant_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_part_exceptions" ADD COLUMN "plant_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "plant_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_part_exceptions" ADD CONSTRAINT "product_part_exceptions_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;