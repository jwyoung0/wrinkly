const { Pool } = require("pg");

if (!process.env.DB_URL) {
    console.error("Missing DB_URL environment variable");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;