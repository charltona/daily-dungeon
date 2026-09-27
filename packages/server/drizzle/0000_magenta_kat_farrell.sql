CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(32) NOT NULL,
	"class_type" varchar(16) NOT NULL,
	"level" integer DEFAULT 1,
	"xp" integer DEFAULT 0,
	"total_runs" integer DEFAULT 0,
	"victories" integer DEFAULT 0,
	"inventory_json" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_seeds" (
	"date_key" date PRIMARY KEY NOT NULL,
	"seed_number" bigint NOT NULL,
	"modifiers_json" jsonb DEFAULT '[]'::jsonb,
	"boss_name" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dungeon_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_key" date NOT NULL,
	"room_id" varchar(32) NOT NULL,
	"status" varchar(16) NOT NULL,
	"stage_reached" integer NOT NULL,
	"rounds_taken" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"party_size" integer NOT NULL,
	"party_json" jsonb NOT NULL,
	"combat_log_json" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(32) NOT NULL,
	"email" varchar(255),
	"oauth_provider" varchar(32),
	"oauth_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"last_login_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_oauth_id_unique" UNIQUE("oauth_id")
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dungeon_runs" ADD CONSTRAINT "dungeon_runs_date_key_daily_seeds_date_key_fk" FOREIGN KEY ("date_key") REFERENCES "public"."daily_seeds"("date_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_leaderboard" ON "dungeon_runs" USING btree ("date_key","status","rounds_taken","duration_ms");--> statement-breakpoint
CREATE INDEX "idx_sessions_token_hash" ON "sessions" USING btree ("token_hash");