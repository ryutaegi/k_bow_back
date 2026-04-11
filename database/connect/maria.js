const mysql = require('mysql');
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
});

module.exports = pool;
