ALTER TABLE "plants" ADD COLUMN "plant_id" integer;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_plant_id_unique" UNIQUE("plant_id");