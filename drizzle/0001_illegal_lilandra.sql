CREATE TABLE `trip_team_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`delete_token` text NOT NULL,
	`created_at` text NOT NULL
);
