CREATE TABLE `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT 'Untitled Scene',
	`ownerOpenId` varchar(64),
	`sceneData` json NOT NULL,
	`physicsSettings` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`thumbnailUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`),
	CONSTRAINT `scenes_sceneId_unique` UNIQUE(`sceneId`)
);
