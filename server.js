require("dotenv").config({ path: "backend/.env" });

const path = require("path");
const authRoutes = require("./backend/routes/auth");
const requireLogin = require("./backend/middleware/requireLogin");
const pool = require("./backend/db");
const express = require("express");

const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000; // Port 3000 or render default Port

//debug database connection check.
if (!process.env.DB_URL) {
    console.error("Missing DB_URL environment variable");
    process.exit(1);
}

app.use(cors());
// Allows Express to read JSON request bodies
app.use(express.json());

//Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false
    }
}));

app.use("/api/auth", authRoutes);

//Starting point
app.use(express.static("frontend"));

// // Test route
// app.get("/", function (req, res) {
//     res.send("Backend is running");
// });

app.get("/dashboard", requireLogin, function (req, res) {
    res.sendFile(path.join(__dirname, "frontend/pages/dashboard.html"));
});

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

// app.post("/api/register", async function (req, res) {
   
// });

// app.post("/api/login", async function (req, res) {
    
// });

// app.get("/api/me", function (req, res) {
    
// });

// app.post("/api/logout", function (req, res) {

// });

app.listen(PORT, function () {
    console.log(`Server running on http://localhost:${PORT}`);
});

