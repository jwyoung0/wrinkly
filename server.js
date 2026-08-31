require("dotenv").config();

const express = require("express");
const sql = require("mssql");

const app = express();
const port = Number(process.env.PORT || 3000);
const sqlConfig = {
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE, server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433), connectionTimeout: 60000,
  options: { encrypt: true, trustServerCertificate: false }
};
let pool;

async function connectToDatabase() {
  pool = await sql.connect(sqlConfig);
  console.log("Connected to Azure SQL");
}

async function ensureSchema() {
  await pool.request().batch(`
    IF OBJECT_ID('dbo.flashcard_sets', 'U') IS NULL
    CREATE TABLE dbo.flashcard_sets (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(120) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF OBJECT_ID('dbo.questions', 'U') IS NULL
    CREATE TABLE dbo.questions (
      id INT IDENTITY(1,1) PRIMARY KEY, set_id INT NOT NULL,
      question_text NVARCHAR(1000) NOT NULL,
      option_a NVARCHAR(500) NOT NULL, option_b NVARCHAR(500) NOT NULL,
      option_c NVARCHAR(500) NOT NULL, option_d NVARCHAR(500) NOT NULL,
      correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
      explanation NVARCHAR(1500) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_questions_set FOREIGN KEY (set_id)
        REFERENCES dbo.flashcard_sets(id) ON DELETE CASCADE
    );
  `);
}

function clean(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function questionInput(body) {
  const question = {
    questionText: clean(body.questionText, 1000), optionA: clean(body.optionA, 500),
    optionB: clean(body.optionB, 500), optionC: clean(body.optionC, 500),
    optionD: clean(body.optionD, 500), correctOption: clean(body.correctOption, 1).toUpperCase(),
    explanation: clean(body.explanation, 1500) || null
  };
  const valid = question.questionText && question.optionA && question.optionB && question.optionC && question.optionD && ["A", "B", "C", "D"].includes(question.correctOption);
  return { question, valid };
}
function setQuestionParams(request, question) {
  return request.input("questionText", sql.NVarChar(1000), question.questionText)
    .input("optionA", sql.NVarChar(500), question.optionA).input("optionB", sql.NVarChar(500), question.optionB)
    .input("optionC", sql.NVarChar(500), question.optionC).input("optionD", sql.NVarChar(500), question.optionD)
    .input("correctOption", sql.Char(1), question.correctOption).input("explanation", sql.NVarChar(1500), question.explanation);
}

app.use(express.json());

app.get("/api/health", async (req, res, next) => {
  try { const result = await pool.request().query("SELECT 1 AS connected"); res.json({ ok: true, connected: result.recordset[0].connected }); }
  catch (error) { next(error); }
});

app.get("/api/sets", async (req, res, next) => {
  try {
    const result = await pool.request().query(`SELECT s.id, s.title, s.created_at AS createdAt, COUNT(q.id) AS questionCount
      FROM dbo.flashcard_sets s LEFT JOIN dbo.questions q ON q.set_id=s.id
      GROUP BY s.id,s.title,s.created_at ORDER BY s.created_at DESC`);
    res.json(result.recordset);
  } catch (error) { next(error); }
});
app.post("/api/sets", async (req, res, next) => {
  const title = clean(req.body.title, 120);
  if (!title) return res.status(400).json({ message: "A set title is required." });
  try {
    const result = await pool.request().input("title", sql.NVarChar(120), title)
      .query("INSERT INTO dbo.flashcard_sets (title) OUTPUT INSERTED.id,INSERTED.title VALUES (@title)");
    res.status(201).json(result.recordset[0]);
  } catch (error) { next(error); }
});
app.put("/api/sets/:id", async (req, res, next) => {
  const title = clean(req.body.title, 120);
  if (!title) return res.status(400).json({ message: "A set title is required." });
  try {
    const result = await pool.request().input("id", sql.Int, req.params.id).input("title", sql.NVarChar(120), title)
      .query("UPDATE dbo.flashcard_sets SET title=@title OUTPUT INSERTED.id,INSERTED.title WHERE id=@id");
    if (!result.recordset[0]) return res.status(404).json({ message: "Set not found." });
    res.json(result.recordset[0]);
  } catch (error) { next(error); }
});
app.delete("/api/sets/:id", async (req, res, next) => {
  try {
    const result = await pool.request().input("id", sql.Int, req.params.id).query("DELETE FROM dbo.flashcard_sets OUTPUT DELETED.id WHERE id=@id");
    if (!result.recordset[0]) return res.status(404).json({ message: "Set not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/sets/:id/questions", async (req, res, next) => {
  try {
    const result = await pool.request().input("setId", sql.Int, req.params.id).query(`SELECT id,question_text AS questionText,option_a AS optionA,option_b AS optionB,option_c AS optionC,option_d AS optionD,correct_option AS correctOption,explanation FROM dbo.questions WHERE set_id=@setId ORDER BY id`);
    res.json(result.recordset);
  } catch (error) { next(error); }
});
app.post("/api/sets/:id/questions", async (req, res, next) => {
  const { question, valid } = questionInput(req.body);
  if (!valid) return res.status(400).json({ message: "Complete the question, all four options, and the correct answer." });
  try {
    const exists = await pool.request().input("setId", sql.Int, req.params.id).query("SELECT id FROM dbo.flashcard_sets WHERE id=@setId");
    if (!exists.recordset[0]) return res.status(404).json({ message: "Set not found." });
    const result = await setQuestionParams(pool.request().input("setId", sql.Int, req.params.id), question).query(`INSERT INTO dbo.questions (set_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation) OUTPUT INSERTED.id VALUES (@setId,@questionText,@optionA,@optionB,@optionC,@optionD,@correctOption,@explanation)`);
    res.status(201).json(result.recordset[0]);
  } catch (error) { next(error); }
});
app.put("/api/questions/:id", async (req, res, next) => {
  const { question, valid } = questionInput(req.body);
  if (!valid) return res.status(400).json({ message: "Complete the question, all four options, and the correct answer." });
  try {
    const result = await setQuestionParams(pool.request().input("id", sql.Int, req.params.id), question).query(`UPDATE dbo.questions SET question_text=@questionText,option_a=@optionA,option_b=@optionB,option_c=@optionC,option_d=@optionD,correct_option=@correctOption,explanation=@explanation OUTPUT INSERTED.id WHERE id=@id`);
    if (!result.recordset[0]) return res.status(404).json({ message: "Question not found." });
    res.json(result.recordset[0]);
  } catch (error) { next(error); }
});
app.delete("/api/questions/:id", async (req, res, next) => {
  try {
    const result = await pool.request().input("id", sql.Int, req.params.id).query("DELETE FROM dbo.questions OUTPUT DELETED.id WHERE id=@id");
    if (!result.recordset[0]) return res.status(404).json({ message: "Question not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/sets/:id/quiz", async (req, res, next) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  try {
    const result = await pool.request().input("setId", sql.Int, req.params.id).input("limit", sql.Int, limit).query(`SELECT TOP (@limit) id,question_text AS questionText,option_a AS optionA,option_b AS optionB,option_c AS optionC,option_d AS optionD FROM dbo.questions WHERE set_id=@setId ORDER BY NEWID()`);
    res.json(result.recordset);
  } catch (error) { next(error); }
});
app.post("/api/sets/:id/quiz-results", async (req, res, next) => {
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const ids = [...new Set(answers.map((answer) => Number(answer.questionId)).filter(Number.isInteger))];
  if (!ids.length) return res.status(400).json({ message: "No quiz answers supplied." });
  try {
    const request = pool.request().input("setId", sql.Int, req.params.id);
    ids.forEach((id, index) => request.input("id" + index, sql.Int, id));
    const result = await request.query(`SELECT id,question_text AS questionText,option_a AS optionA,option_b AS optionB,option_c AS optionC,option_d AS optionD,correct_option AS correctOption,explanation FROM dbo.questions WHERE set_id=@setId AND id IN (${ids.map((_, index) => "@id" + index).join(",")})`);
    const selections = new Map(answers.map((answer) => [Number(answer.questionId), clean(answer.selectedOption, 1).toUpperCase()]));
    const results = result.recordset.map((question) => ({ ...question, selectedOption: selections.get(question.id) || null, isCorrect: selections.get(question.id) === question.correctOption }));
    res.json({ score: results.filter((item) => item.isCorrect).length, results });
  } catch (error) { next(error); }
});

app.use(express.static("public"));
app.use((error, req, res, next) => { console.error(error); res.status(500).json({ message: "Something went wrong. Check the server terminal for details." }); });

async function start() { await connectToDatabase(); await ensureSchema(); app.listen(port, () => console.log(`App running at http://localhost:${port}`)); }
start().catch((error) => { console.error("App could not start:", error); process.exit(1); });
