CREATE TYPE "public"."kanban_action_type" AS ENUM('created', 'acknowledged', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."product_variant" AS ENUM('328', '319', '425');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('logistics', 'supplier', 'admin');--> statement-breakpoint
CREATE TABLE "kanban_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kanban_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action_type" "kanban_action_type" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_by_logistics" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"fulfilled" boolean DEFAULT false NOT NULL,
	"fulfilled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "product_entry_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"station_id" integer NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant" "product_variant" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"consumption_per_product" integer NOT NULL,
	"bin_quantity" integer NOT NULL,
	"current_quantity" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"role" "user_role" NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "kanban_actions" ADD CONSTRAINT "kanban_actions_kanban_id_kanban_requests_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "public"."kanban_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_actions" ADD CONSTRAINT "kanban_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_requests" ADD CONSTRAINT "kanban_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_entry_logs" ADD CONSTRAINT "product_entry_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_entry_logs" ADD CONSTRAINT "product_entry_logs_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_parts" ADD CONSTRAINT "station_parts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;