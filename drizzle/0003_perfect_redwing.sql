CREATE TABLE `relay_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_url` text NOT NULL,
	`source` text NOT NULL,
	`agent_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`error` text,
	`timings` text DEFAULT '{}' NOT NULL,
	`result` text,
	`additional_data` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_relay_runs_user_status` ON `relay_runs` (`user_id`,`status`);--> statement-breakpoint
ALTER TABLE `agents` ADD `additional_data` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `credentials` ADD `additional_data` text DEFAULT '{}' NOT NULL;