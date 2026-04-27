const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    charset: 'utf8mb4',
    connectionLimit: 10,
    waitForConnections: true,
    multipleStatements: true,
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  user_id     INT NOT NULL AUTO_INCREMENT,
  social_id   VARCHAR(255) NOT NULL,
  social_type TINYINT NOT NULL,
  nickname    VARCHAR(100),
  social_email VARCHAR(255),
  age_group   VARCHAR(20),
  gender      VARCHAR(10),
  image_url   TEXT,
  agree       TINYINT NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_social (social_type, social_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS board (
  board_id      INT NOT NULL AUTO_INCREMENT,
  user_id       INT NOT NULL,
  board_type_id INT NOT NULL,
  title         VARCHAR(200),
  content       TEXT,
  nickname      VARCHAR(100),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (board_id),
  KEY idx_board_type (board_type_id),
  KEY idx_board_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shots (
  shot_id      INT NOT NULL AUTO_INCREMENT,
  user_id      INT NOT NULL,
  shot_date    DATETIME,
  shot_array   TEXT,
  feedback     TEXT,
  shot_count   INT DEFAULT 0,
  target_count INT DEFAULT 0,
  PRIMARY KEY (shot_id),
  KEY idx_shots_user (user_id),
  KEY idx_shots_date (shot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_info (
  group_id          INT NOT NULL AUTO_INCREMENT,
  group_name        VARCHAR(100) NOT NULL,
  group_maker_id    INT NOT NULL,
  group_password    VARCHAR(255),
  is_password       TINYINT NOT NULL DEFAULT 0,
  group_description TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_user (
  user_id  INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (user_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS popup (
  popup_id    INT NOT NULL AUTO_INCREMENT,
  type        ENUM('notice', 'force_update') NOT NULL DEFAULT 'notice',
  title       VARCHAR(200) NOT NULL,
  content     TEXT,
  min_version VARCHAR(20),
  is_active   TINYINT NOT NULL DEFAULT 1,
  start_date  DATETIME,
  end_date    DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (popup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS board_like (
  like_id    INT NOT NULL AUTO_INCREMENT,
  board_id   INT NOT NULL,
  user_id    INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (like_id),
  UNIQUE KEY uq_board_user (board_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// 서버 시작 시 테이블이 없으면 자동 생성
pool.query(schema, (err) => {
    if (err) {
        console.error('DB 스키마 초기화 실패:', err.message);
    } else {
        console.log('DB 스키마 준비 완료');
    }
});

module.exports = pool;
