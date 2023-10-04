const maria = require('mysql');
require('dotenv').config();

const conn = maria.createConnection({
    host : process.env.HOST,
    port : parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE_URL,
    charset  : 'utf8mb4'
});

module.exports = conn;