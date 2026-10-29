ALTER TABLE "inventory_items" ADD COLUMN "unit_type" text DEFAULT 'unidade' NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_unit_type_check" CHECK ("unit_type" IN ('unidade', 'caixa', 'pacote'));
