const express = require("express");
const { clean } = require("../validation");

module.exports = function createSetsRouter(sql) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const result = await req.app.locals.pool.request().query(`
        SELECT s.id, s.title, s.created_at AS createdAt,
               COUNT(q.id) AS questionCount
        FROM dbo.flashcard_sets s
        LEFT JOIN dbo.questions q ON q.set_id = s.id
        GROUP BY s.id, s.title, s.created_at
        ORDER BY s.created_at DESC
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const title = clean(req.body.title, 120);
    if (!title) return res.status(400).json({ message: "A set title is required." });

    try {
      const result = await req.app.locals.pool.request()
        .input("title", sql.NVarChar(120), title)
        .query(`
          INSERT INTO dbo.flashcard_sets (title)
          OUTPUT INSERTED.id, INSERTED.title
          VALUES (@title)
        `);
      res.status(201).json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    const title = clean(req.body.title, 120);
    if (!title) return res.status(400).json({ message: "A set title is required." });

    try {
      const result = await req.app.locals.pool.request()
        .input("id", sql.Int, req.params.id)
        .input("title", sql.NVarChar(120), title)
        .query(`
          UPDATE dbo.flashcard_sets SET title = @title
          OUTPUT INSERTED.id, INSERTED.title
          WHERE id = @id
        `);
      if (!result.recordset[0]) {
        return res.status(404).json({ message: "Set not found." });
      }
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await req.app.locals.pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM dbo.flashcard_sets OUTPUT DELETED.id WHERE id = @id");
      if (!result.recordset[0]) {
        return res.status(404).json({ message: "Set not found." });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
};