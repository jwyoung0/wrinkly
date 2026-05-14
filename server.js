require("dotenv").config({ path: "backend/.env" });

const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000; // Port 3000 or render default Port

//debug database connection check.
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

app.use(cors());
// Allows Express to read JSON request bodies
app.use(express.json());


//Starting point
app.use(express.static("frontend"));

// // Test route
// app.get("/", function (req, res) {
//     res.send("Backend is running");
// });

// Example API route
app.get("/api/health", function (req, res) {
    res.json({ status: "ok" });
});

app.get("/api/db-test", async function (req, res) {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({
            status: "Database connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "Database connection failed"
        });
    }
});

app.post("/api/register", async function (req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
            [username, passwordHash]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

app.post("/api/login", async function (req, res) {
    try {
        const {username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const result = await pool.query(
            "SELECT id, username, password_hash FROM users WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid username password"
            });
        }

        const user = result.rows[0];

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Login failed"
        });
    }
});

app.listen(PORT, function () {
    console.log(`Server running on http://localhost:${PORT}`);
});

