CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "plants_name_unique" UNIQUE("name")
);
--> statement-breakpoint
