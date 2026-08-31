ALTER TABLE `agents` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `config` text DEFAULT '{}' NOT NULL;