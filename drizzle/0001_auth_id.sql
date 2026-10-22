ALTER TABLE "users" ADD COLUMN "auth_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");