-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: pk_english
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `badges`
--

DROP TABLE IF EXISTS `badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badges` (
  `badge_id` int NOT NULL AUTO_INCREMENT,
  `badge_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `badge_category` enum('system_single','system_accum','system_rank','social_action','social_accum','social_rank','social_team') COLLATE utf8mb4_unicode_ci NOT NULL,
  `badge_tier` enum('bronze','silver','gold','legend') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bronze',
  `condition_desc` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_value` int DEFAULT NULL,
  `icon_emoji` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`badge_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='獎章定義表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `classes`
--

DROP TABLE IF EXISTS `classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classes` (
  `class_id` int NOT NULL AUTO_INCREMENT,
  `class_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '班級名稱，例：五年甲班',
  `class_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '學生加入用的6位隨機代碼',
  `teacher_id` int NOT NULL COMMENT '任課教師 user_id（建立後回填）',
  `experiment_group` enum('experimental','control') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'control' COMMENT '實驗分組',
  `max_group_size` int NOT NULL DEFAULT '4' COMMENT '每組人數上限（教師可調）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_id`),
  UNIQUE KEY `class_code` (`class_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班級總表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_logs`
--

DROP TABLE IF EXISTS `game_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rescued_by_user_id` int DEFAULT NULL,
  `question_id` int NOT NULL,
  `user_answer` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT '0',
  `response_time` smallint NOT NULL DEFAULT '0',
  `base_score` int NOT NULL DEFAULT '0',
  `speed_bonus` int NOT NULL DEFAULT '0',
  `round_number` tinyint NOT NULL DEFAULT '1',
  `answered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `game_logs_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`) ON DELETE CASCADE,
  CONSTRAINT `game_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `game_logs_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`)
) ENGINE=InnoDB AUTO_INCREMENT=237 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='個人答題分數紀錄';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_sessions`
--

DROP TABLE IF EXISTS `game_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `group_a_id` int NOT NULL,
  `group_b_id` int NOT NULL,
  `level` enum('vocabulary','sentence','reading') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('waiting','in_progress','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `winner_group_id` int DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `class_id` (`class_id`),
  KEY `group_a_id` (`group_a_id`),
  KEY `group_b_id` (`group_b_id`),
  CONSTRAINT `game_sessions_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`),
  CONSTRAINT `game_sessions_ibfk_2` FOREIGN KEY (`group_a_id`) REFERENCES `groups` (`group_id`),
  CONSTRAINT `game_sessions_ibfk_3` FOREIGN KEY (`group_b_id`) REFERENCES `groups` (`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PK場次紀錄';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `group_id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `group_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '小組名稱，例：A組',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小組總表（四人一組）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `help_requests`
--

DROP TABLE IF EXISTS `help_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `help_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `question_id` int NOT NULL,
  `requester_id` int NOT NULL,
  `status` enum('open','claimed','resolved','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `claimed_by` int DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_requester` (`session_id`,`requester_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `theme_id` int NOT NULL,
  `level` enum('vocabulary','sentence','reading') COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('mcq','fill_blank','ordering','matching','listening','image_choice') COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audio_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `options` json DEFAULT NULL,
  `correct_answer` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `explanation` text COLLATE utf8mb4_unicode_ci,
  `difficulty` tinyint NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `theme_id` (`theme_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`theme_id`) REFERENCES `themes` (`theme_id`),
  CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='題目庫';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_questions`
--

DROP TABLE IF EXISTS `session_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `question_id` int NOT NULL,
  `question_order` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_q` (`session_id`,`question_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `session_questions_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`) ON DELETE CASCADE,
  CONSTRAINT `session_questions_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`)
) ENGINE=InnoDB AUTO_INCREMENT=214 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每場 PK 抽到的題目清單';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `social_logs`
--

DROP TABLE IF EXISTS `social_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `social_logs` (
  `social_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `action_type` enum('like','sticker','comment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sticker_tag` enum('brave','clear','helpful','awesome','keep_going','smart','fast','teamwork','creative') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment_text` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment_category` enum('encouragement','performance','team_support') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_preset` tinyint(1) NOT NULL DEFAULT '1',
  `score_awarded` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`social_id`),
  UNIQUE KEY `uq_like_once` (`session_id`,`sender_id`,`receiver_id`,`action_type`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `social_logs_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`) ON DELETE CASCADE,
  CONSTRAINT `social_logs_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `social_logs_ibfk_3` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社群互動紀錄';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `themes`
--

DROP TABLE IF EXISTS `themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `themes` (
  `theme_id` int NOT NULL AUTO_INCREMENT,
  `theme_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`theme_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='學習主題（共8個）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_badges`
--

DROP TABLE IF EXISTS `user_badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_badges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `badge_id` int NOT NULL,
  `session_id` int DEFAULT NULL,
  `acknowledged` tinyint(1) NOT NULL DEFAULT '0',
  `awarded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_badge` (`user_id`,`badge_id`),
  KEY `badge_id` (`badge_id`),
  CONSTRAINT `user_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_badges_ibfk_2` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`badge_id`)
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者已獲得的獎章';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('student','teacher') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `experiment_group` enum('experimental','control') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `absent_date` date DEFAULT NULL,
  `system_score` int NOT NULL DEFAULT '0',
  `social_score` int NOT NULL DEFAULT '0',
  `group_id` int DEFAULT NULL,
  `is_leader` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `student_id` (`student_id`),
  KEY `class_id` (`class_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `words`
--

DROP TABLE IF EXISTS `words`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `words` (
  `word_id` int NOT NULL AUTO_INCREMENT,
  `english` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chinese` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `word_no` smallint NOT NULL,
  `grade` tinyint NOT NULL,
  `theme_id` int NOT NULL,
  `part_of_speech` enum('noun','verb','adjective','pronoun','number','preposition','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'noun',
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`word_id`),
  KEY `theme_id` (`theme_id`),
  CONSTRAINT `words_ibfk_1` FOREIGN KEY (`theme_id`) REFERENCES `themes` (`theme_id`)
) ENGINE=InnoDB AUTO_INCREMENT=168 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字彙庫';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'pk_english'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-01  4:25:30
