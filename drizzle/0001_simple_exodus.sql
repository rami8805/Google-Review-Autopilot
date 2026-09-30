CREATE TABLE "oauth_states" (
	"id" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "oauth_states_state_unique" UNIQUE("state")
);
--> statement-breakpoint
ALTER TABLE "job_records" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_records" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "job_records" ADD COLUMN "available_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "job_records" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_records" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_records" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_states_state" ON "oauth_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_tenant_id" ON "oauth_states" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_user_id" ON "oauth_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_expires_at" ON "oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_google_conn_tenant_loc_acc" ON "google_connections" USING btree ("tenant_id","business_location_id","google_account_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_available_at" ON "job_records" USING btree ("available_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_locked_at" ON "job_records" USING btree ("locked_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_idempotency_key" ON "job_records" USING btree ("idempotency_key");