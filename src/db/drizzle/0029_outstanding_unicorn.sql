CREATE TABLE "delay_kanbans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer DEFAULT 1 NOT NULL,
	"kanban_id" integer,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"arranged_by_logistics" boolean DEFAULT false NOT NULL,
	"arranged_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "delay_kanbans" ADD CONSTRAINT "delay_kanbans_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delay_kanbans" ADD CONSTRAINT "delay_kanbans_kanban_id_kanban_requests_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "public"."kanban_requests"("id") ON DELETE cascade ON UPDATE no action;