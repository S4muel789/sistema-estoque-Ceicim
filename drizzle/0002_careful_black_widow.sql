DROP INDEX "uq_inventory_active_identity";--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "cabinet_number" integer;--> statement-breakpoint
CREATE INDEX "idx_inventory_cabinet" ON "inventory_items" USING btree ("cabinet_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_active_identity" ON "inventory_items" USING btree ("normalized_name","normalized_category","cabinet_number") WHERE "inventory_items"."archived_at" is null;