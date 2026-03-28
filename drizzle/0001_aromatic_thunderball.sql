CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`facility_id` text,
	`community_id` text,
	`tenant_id` text,
	`owner_id` text,
	`booking_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'confirmed',
	`notes` text,
	`qr_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`name` text NOT NULL,
	`type` text DEFAULT 'sala',
	`icon` text DEFAULT '🏢',
	`description` text,
	`capacity` integer DEFAULT 10,
	`price_per_slot` real DEFAULT 0,
	`slot_duration` integer DEFAULT 60,
	`open_time` text DEFAULT '09:00',
	`close_time` text DEFAULT '22:00',
	`max_days_ahead` integer DEFAULT 14,
	`requires_approval` integer DEFAULT 0,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
