CREATE TABLE `model_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`models` text DEFAULT '[]' NOT NULL,
	`credential_updated_at` integer DEFAULT 0 NOT NULL,
	`fetched_at` integer NOT NULL,
	`additional_data` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_model_catalog_user_provider` ON `model_catalog` (`user_id`,`provider`);