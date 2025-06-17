CREATE TABLE "frozen_kanbans" (
	"id" serial PRIMARY KEY NOT NULL,
	"process" integer NOT NULL,
	"kanban_id" integer NOT NULL,
	"frozen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_freeze_state" (
	"process" integer PRIMARY KEY NOT NULL,
	"is_frozen" boolean DEFAULT false NOT NULL,
	"frozen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "frozen_kanbans" ADD CONSTRAINT "frozen_kanbans_kanban_id_kanban_requests_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "public"."kanban_requests"("id") ON DELETE no action ON UPDATE no action;