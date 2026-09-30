CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"actor_user_id" text,
	"actor_type" text DEFAULT 'USER' NOT NULL,
	"action" text NOT NULL,
	"target_resource_type" text NOT NULL,
	"target_resource_id" text NOT NULL,
	"details_json" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_location_id" text,
	"star_rating" integer NOT NULL,
	"max_risk_level" text DEFAULT 'LOW' NOT NULL,
	"action" text DEFAULT 'REQUIRE_APPROVAL' NOT NULL,
	"delay_minutes" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_voice" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_location_id" text,
	"tone" text DEFAULT 'WARM_AND_PROFESSIONAL' NOT NULL,
	"sign_off_template" text,
	"owner_title" text,
	"contact_email" text,
	"contact_phone" text,
	"core_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prohibited_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_id" text NOT NULL,
	"google_location_id" text NOT NULL,
	"google_place_id" text,
	"location_name" text NOT NULL,
	"address_lines" jsonb NOT NULL,
	"locality" text NOT NULL,
	"administrative_area" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"primary_phone" text,
	"primary_category" text,
	"is_connected" boolean DEFAULT false NOT NULL,
	"automation_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"industry_category" text,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_location_id" text NOT NULL,
	"google_account_id" text NOT NULL,
	"google_location_name" text NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"token_expiry" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'CONNECTED' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"operation" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body_json" jsonb,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"operation" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payload_json" jsonb,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "job_records_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"channel" text DEFAULT 'IN_APP' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"link_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paddle_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paddle_customers_paddle_customer_id_unique" UNIQUE("paddle_customer_id")
);
--> statement-breakpoint
CREATE TABLE "paddle_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"status" text NOT NULL,
	"price_id" text,
	"currency" text DEFAULT 'USD',
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paddle_subscriptions_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "paddle_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"paddle_transaction_id" text NOT NULL,
	"paddle_subscription_id" text,
	"status" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"billed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paddle_transactions_paddle_transaction_id_unique" UNIQUE("paddle_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "paddle_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payload_json" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paddle_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "review_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"review_id" text NOT NULL,
	"business_location_id" text NOT NULL,
	"proposed_text" text NOT NULL,
	"published_text" text,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"generated_by_ai" boolean DEFAULT true NOT NULL,
	"ai_model" text DEFAULT 'gemini-3.8-flash',
	"guard_decision" text,
	"guard_result_json" jsonb,
	"regeneration_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"publish_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_location_id" text NOT NULL,
	"google_review_id" text NOT NULL,
	"google_review_name" text NOT NULL,
	"author_name" text NOT NULL,
	"author_is_anonymous" boolean DEFAULT false NOT NULL,
	"author_photo_url" text,
	"star_rating" integer NOT NULL,
	"comment" text,
	"review_created_at" timestamp with time zone NOT NULL,
	"review_updated_at" timestamp with time zone,
	"risk_level" text DEFAULT 'LOW' NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_explanation" text,
	"risk_confidence" text,
	"reply_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"paddle_customer_id" text,
	"paddle_subscription_id" text,
	"plan" text DEFAULT 'STARTER' NOT NULL,
	"status" text DEFAULT 'TRIALING' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"location_limit" integer DEFAULT 1 NOT NULL,
	"monthly_reply_limit" integer DEFAULT 50 NOT NULL,
	"last_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"ticket_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"sender_user_id" text,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by_user_email" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"assigned_agent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"billing_email" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_subject" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_identity_subject_unique" UNIQUE("identity_subject")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice" ADD CONSTRAINT "brand_voice_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice" ADD CONSTRAINT "brand_voice_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_records" ADD CONSTRAINT "job_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paddle_customers" ADD CONSTRAINT "paddle_customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paddle_subscriptions" ADD CONSTRAINT "paddle_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paddle_transactions" ADD CONSTRAINT "paddle_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_tenant_id" ON "audit_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_auto_rules_tenant_id" ON "automation_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_auto_rules_star_rating" ON "automation_rules" USING btree ("star_rating");--> statement-breakpoint
CREATE INDEX "idx_brand_voice_tenant_id" ON "brand_voice" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_locations_tenant_id" ON "business_locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_locations_tenant_google_loc" ON "business_locations" USING btree ("tenant_id","google_location_id");--> statement-breakpoint
CREATE INDEX "idx_businesses_tenant_id" ON "businesses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_google_conn_tenant_id" ON "google_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_google_conn_location" ON "google_connections" USING btree ("business_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_idempotency_tenant_key_op" ON "idempotency_keys" USING btree ("tenant_id","idempotency_key","operation");--> statement-breakpoint
CREATE INDEX "idx_idempotency_expires_at" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_tenant_id" ON "job_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_jobs_job_id" ON "job_records" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "job_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notif_tenant_id" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_notif_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_paddle_customers_tenant_id" ON "paddle_customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_paddle_subs_tenant_id" ON "paddle_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_paddle_subs_sub_id" ON "paddle_subscriptions" USING btree ("paddle_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_paddle_tx_tenant_id" ON "paddle_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_paddle_tx_tx_id" ON "paddle_transactions" USING btree ("paddle_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_paddle_webhook_event_id" ON "paddle_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_paddle_webhook_event_type" ON "paddle_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_replies_tenant_id" ON "review_replies" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_replies_review_id" ON "review_replies" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_replies_status" ON "review_replies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reviews_tenant_id" ON "reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_location_id" ON "reviews" USING btree ("business_location_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_star_rating" ON "reviews" USING btree ("star_rating");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reviews_tenant_google_rev" ON "reviews" USING btree ("tenant_id","google_review_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_subscriptions_tenant_id" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_support_msgs_tenant_id" ON "support_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_support_msgs_ticket_id" ON "support_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_tenant_id" ON "support_tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_status" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_memberships_user_tenant" ON "tenant_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_memberships_tenant_id" ON "tenant_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_memberships_user_id" ON "tenant_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_identity_subject" ON "users" USING btree ("identity_subject");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");