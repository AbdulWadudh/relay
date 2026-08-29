DROP INDEX `idx_auth_accounts_issuer_account`;--> statement-breakpoint
CREATE INDEX `idx_auth_accounts_provider_account` ON `auth_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
ALTER TABLE `auth_accounts` DROP COLUMN `issuer`;