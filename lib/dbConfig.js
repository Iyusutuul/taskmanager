const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    // Host: process.env.PG_HOST,
    Port: process.env.PG_PORT
});

module.exports = (pool);
