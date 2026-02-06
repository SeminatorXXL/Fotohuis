const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || '192.168.2.22',
    user: process.env.DB_USER || 'root',      // Pas aan naar jouw MySQL-gebruikersnaam
    password: process.env.DB_PASSWORD || '',      // Pas aan naar jouw wachtwoord
    database: 'fotohuis'
});

module.exports = db;
