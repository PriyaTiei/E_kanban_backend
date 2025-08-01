ALTER TABLE "frozen_kanbans" DROP CONSTRAINT "frozen_kanbans_kanban_id_kanban_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "kanban_actions" DROP CONSTRAINT "kanban_actions_kanban_id_kanban_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "kanban_actions" DROP CONSTRAINT "kanban_actions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "kanban_requests" DROP CONSTRAINT "kanban_requests_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "kanban_requests" DROP CONSTRAINT "kanban_requests_station_id_stations_id_fk";
--> statement-breakpoint
ALTER TABLE "kanban_requests" DROP CONSTRAINT "kanban_requests_part_id_parts_id_fk";
--> statement-breakpoint
ALTER TABLE "kanban_requests" DROP CONSTRAINT "kanban_requests_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_entry_logs" DROP CONSTRAINT "product_entry_logs_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "product_entry_logs" DROP CONSTRAINT "product_entry_logs_station_id_stations_id_fk";
--> statement-breakpoint
ALTER TABLE "product_entry_logs" DROP CONSTRAINT "product_entry_logs_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_part_exceptions" DROP CONSTRAINT "product_part_exceptions_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_part_exceptions" DROP CONSTRAINT "product_part_exceptions_part_id_parts_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" DROP CONSTRAINT "station_parts_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" DROP CONSTRAINT "station_parts_station_id_stations_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" DROP CONSTRAINT "station_parts_part_id_parts_id_fk";
--> statement-breakpoint
ALTER TABLE "station_parts" DROP CONSTRAINT "station_parts_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stations" DROP CONSTRAINT "stations_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_plant_id_plants_id_fk";
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "variant" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "frozen_kanbans" ADD CONSTRAINT "frozen_kanbans_kanban_id_kanban_requests_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "public"."kanban_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_actions" ADD CONSTRAINT "kanban_actions_kanban_id_kanban_requests_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "public"."kanban_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_actions" ADD CONSTRAINT "kanban_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_entry_logs" ADD CONSTRAINT "product_entry_logs_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_entry_logs" ADD CONSTRAINT "product_entry_logs_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_entry_logs" ADD CONSTRAINT "product_entry_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_part_exceptions" ADD CONSTRAINT "product_part_exceptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_part_exceptions" ADD CONSTRAINT "product_part_exceptions_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_variant_unique" UNIQUE("variant");--> statement-breakpoint
DROP TYPE "public"."product_variant";