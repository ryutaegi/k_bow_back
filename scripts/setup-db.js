require('dotenv').config();
const mysql = require('mysql');

const conn = mysql.createConnection({
  host: process.env.HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.PASSWORD,
  multipleStatements: true,
});

const schema = `
CREATE DATABASE IF NOT EXISTS kbow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kbow;

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
`;

conn.connect((err) => {
  if (err) {
    console.error('DB 연결 실패:', err.message);
    process.exit(1);
  }
  console.log('DB 연결 성공');
  conn.query(schema, (err) => {
    if (err) {
      console.error('스키마 생성 실패:', err.message);
      conn.end();
      process.exit(1);
    }
    console.log('스키마 생성 완료!');
    conn.end();
  });
});
