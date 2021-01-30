
SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `npm_auth`
-- ----------------------------
DROP TABLE IF EXISTS `npm_auth`;
CREATE TABLE `npm_auth` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) DEFAULT NULL,
  `desc` varchar(255) DEFAULT NULL,
  `password` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55;

SET FOREIGN_KEY_CHECKS = 1;
