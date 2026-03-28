CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`metadata` text,
	`ip` text,
	`user_agent` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `bank_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`community_id` text,
	`upload_date` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`transaction_date` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`direction` text NOT NULL,
	`category` text,
	`review_status` text DEFAULT 'pending',
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`year` integer NOT NULL,
	`items` text,
	`total_amount` real DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `call_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`type` text,
	`status` text DEFAULT 'draft',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `call_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`scheduled_for` text NOT NULL,
	`status` text DEFAULT 'pending',
	`attempts` integer DEFAULT 0,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text,
	`owner_id` text,
	`phone` text NOT NULL,
	`status` text DEFAULT 'pending',
	`result` text,
	`transcript` text,
	`audio_url` text,
	`started_at` text,
	`ended_at` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `call_campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `charges` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`unit_id` text,
	`owner_id` text,
	`concept` text NOT NULL,
	`amount` real NOT NULL,
	`issue_date` text DEFAULT CURRENT_TIMESTAMP,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`channel` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`recipient_count` integer DEFAULT 0,
	`status` text DEFAULT 'sent',
	`sent_at` text DEFAULT CURRENT_TIMESTAMP,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`display_id` text,
	`name` text NOT NULL,
	`nif` text,
	`address` text,
	`bank_account_ref` text,
	`status` text DEFAULT 'active',
	`admin_fee_rate` real DEFAULT 0,
	`admin_fee_fixed` real DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communities_code_unique` ON `communities` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `communities_display_id_unique` ON `communities` (`display_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`title` text NOT NULL,
	`description` text,
	`file_name` text NOT NULL,
	`file_type` text,
	`category` text DEFAULT 'others',
	`metadata` text,
	`upload_date` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending',
	`priority` text DEFAULT 'medium',
	`provider_id` text,
	`owner_id` text,
	`unit_id` text,
	`cost` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `minutes` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`title` text NOT NULL,
	`meeting_date` text NOT NULL,
	`attendees` text,
	`agenda_items` text,
	`content` text NOT NULL,
	`generated_by` text DEFAULT 'ai',
	`status` text DEFAULT 'draft',
	`signature_token` text,
	`signed_at` text,
	`signers` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info',
	`read` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`tax_id` text,
	`mailing_address` text,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`charge_id` text,
	`transaction_id` text,
	`amount` real NOT NULL,
	`payment_date` text DEFAULT CURRENT_TIMESTAMP,
	`source` text,
	`reference` text,
	FOREIGN KEY (`charge_id`) REFERENCES `charges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `bank_transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`phone` text,
	`email` text,
	`rating` real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'pending',
	`attempts` integer DEFAULT 0,
	`scheduled_at` text,
	`executed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`tax_id` text
);
--> statement-breakpoint
CREATE TABLE `unit_owners` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text,
	`owner_id` text,
	`ownership_percentage` real DEFAULT 100,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`unit_code` text NOT NULL,
	`floor` text,
	`door` text,
	`type` text DEFAULT 'vivienda',
	`coefficient` real DEFAULT 0,
	`monthly_fee` real DEFAULT 0,
	`active` integer DEFAULT 1,
	`tenant_id` text,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`password` text,
	`role` text DEFAULT 'operator',
	`email_verified` text,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);