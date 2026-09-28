require("dotenv").config();

const path = require("node:path");
const express = require("express");
const sql = require("mssql");
const { connectToDatabase } = require("./server/db");
const { ensureSchema } = require("./server/schema");
const createSetsRouter = require("./server/routes/sets");
const createQuestionsRouter = require("./server/routes/questions");
const createQuizRouter = require("./server/routes/quiz");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.get("/api/health", async (req, res, next) => {
  try {
    const result = await req.app.locals.pool.request().query("SELECT 1 AS connected");
    res.json({ ok: true, connected: result.recordset[0].connected });
  } catch (error) {
    next(error);
  }
});

app.use("/api/sets", createSetsRouter(sql));
app.use("/api", createQuestionsRouter(sql));
app.use("/api/sets", createQuizRouter(sql));
app.use(express.static(path.join(__dirname, "public")));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "Something went wrong. Check the server terminal for details."
  });
});

async function start() {
  const pool = await connectToDatabase(sql);
  app.locals.pool = pool;
  await ensureSchema(pool);
  app.listen(port, () => console.log(`App running at http://localhost:${port}`));
}

start().catch((error) => {
  console.error("App could not start:", error);
  process.exit(1);
});
