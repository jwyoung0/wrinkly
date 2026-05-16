const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

router.post("/register", async function (req, res) {
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

router.post("/login", async function (req, res) {
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

        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.json({
            message: "Login successful",
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Login failed"
        });
    }
});

router.get("/me", function (req, res) {
    if (!req.session.user) {
            return res.status(401).json({
                message: "Not logged in"
            });
        }
    
    res.json({
        user: req.session.user
    });
});

router.post("/logout", function (req, res) {
    req.session.destroy(function (error) {
        if (error) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid");
        res.json({
            message: "Logged out"
        });
    });
});

module.exports = router;