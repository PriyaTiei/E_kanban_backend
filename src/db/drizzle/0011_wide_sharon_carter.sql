CREATE TABLE "product_part_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	CONSTRAINT "product_part_exceptions_product_id_part_id_pk" PRIMARY KEY("product_id","part_id")
);
--> statement-breakpoint
ALTER TABLE "product_part_exceptions" ADD CONSTRAINT "product_part_exceptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_part_exceptions" ADD CONSTRAINT "product_part_exceptions_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;