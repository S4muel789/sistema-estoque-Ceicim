CREATE TABLE "storage_cabinets" (
	"number" integer PRIMARY KEY NOT NULL,
	"created_at" bigint NOT NULL
);--> statement-breakpoint
INSERT INTO "storage_cabinets" ("number", "created_at")
SELECT number, (extract(epoch from clock_timestamp()) * 1000)::bigint
FROM generate_series(1, 18) AS number
ON CONFLICT ("number") DO NOTHING;
