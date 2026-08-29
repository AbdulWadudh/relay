ALTER TABLE `users` RENAME TO `auth_users`;--> statement-breakpoint
DROP INDEX `users_email_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_unique` ON `auth_users` (`email`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`system_prompt` text NOT NULL,
	`expected_output_schema` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_agents`("id", "user_id", "type", "name", "system_prompt", "expected_output_schema", "is_active", "created_at") SELECT "id", "user_id", "type", "name", "system_prompt", "expected_output_schema", "is_active", "created_at" FROM `agents`;--> statement-breakpoint
DROP TABLE `agents`;--> statement-breakpoint
ALTER TABLE `__new_agents` RENAME TO `agents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_agents_user_id` ON `agents` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_auth_accounts`("id", "user_id", "account_id", "provider_id", "access_token", "refresh_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "id_token", "password", "created_at", "updated_at") SELECT "id", "user_id", "account_id", "provider_id", "access_token", "refresh_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "id_token", "password", "created_at", "updated_at" FROM `auth_accounts`;--> statement-breakpoint
DROP TABLE `auth_accounts`;--> statement-breakpoint
ALTER TABLE `__new_auth_accounts` RENAME TO `auth_accounts`;--> statement-breakpoint
CREATE INDEX `idx_auth_accounts_user_id` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_accounts_provider_account` ON `auth_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `__new_auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_auth_sessions`("id", "user_id", "token", "expires_at", "ip_address", "user_agent", "created_at", "updated_at") SELECT "id", "user_id", "token", "expires_at", "ip_address", "user_agent", "created_at", "updated_at" FROM `auth_sessions`;--> statement-breakpoint
DROP TABLE `auth_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auth_sessions` RENAME TO `auth_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_unique` ON `auth_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user_id` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`meta_data` text,
	`iv` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_credentials`("id", "user_id", "type", "provider", "access_token", "refresh_token", "expires_at", "meta_data", "iv", "created_at", "updated_at") SELECT "id", "user_id", "type", "provider", "access_token", "refresh_token", "expires_at", "meta_data", "iv", "created_at", "updated_at" FROM `credentials`;--> statement-breakpoint
DROP TABLE `credentials`;--> statement-breakpoint
ALTER TABLE `__new_credentials` RENAME TO `credentials`;--> statement-breakpoint
CREATE INDEX `idx_credentials_user_provider` ON `credentials` (`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `idx_credentials_expires_at` ON `credentials` (`expires_at`);