-- Run once against hotel_management_system before starting the updated API.
ALTER TABLE `user`
    MODIFY COLUMN `names` VARCHAR(255) NULL,
    MODIFY COLUMN `email` VARCHAR(255) NULL,
    ADD COLUMN `role` ENUM('admin', 'user', 'manager') NOT NULL DEFAULT 'user',
    ADD COLUMN `department` VARCHAR(100) NOT NULL DEFAULT 'General',
    ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    ADD UNIQUE KEY `uq_user_username` (`username`);