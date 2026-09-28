const express = require("express");
const { questionInput, setQuestionParams } = require("../validation");

module.exports = function createQuestionsRouter(sql) {
  const router = express.Router();

  router.get("/sets/:id/questions", async (req, res, next) => {
    try {
      const result = await req.app.locals.pool.request()
        .input("setId", sql.Int, req.params.id)
        .query(`
          SELECT id, question_text AS questionText,
                 option_a AS optionA, option_b AS optionB,
                 option_c AS optionC, option_d AS optionD,
                 correct_option AS correctOption, explanation
          FROM dbo.questions
          WHERE set_id = @setId
          ORDER BY id
        `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  });

  router.post("/sets/:id/questions", async (req, res, next) => {
    const { question, valid } = questionInput(req.body);
    if (!valid) {
      return res.status(400).json({
        message: "Complete the question, all four options, and the correct answer."
      });
    }

    try {
      const pool = req.app.locals.pool;
      const exists = await pool.request()
        .input("setId", sql.Int, req.params.id)
        .query("SELECT id FROM dbo.flashcard_sets WHERE id = @setId");

      if (!exists.recordset[0]) {
        return res.status(404).json({ message: "Set not found." });
      }

      const result = await setQuestionParams(
        pool.request().input("setId", sql.Int, req.params.id),
        question,
        sql
      ).query(`
        INSERT INTO dbo.questions
          (set_id, question_text, option_a, option_b, option_c, option_d,
           correct_option, explanation)
        OUTPUT INSERTED.id
        VALUES
          (@setId, @questionText, @optionA, @optionB, @optionC, @optionD,
           @correctOption, @explanation)
      `);

      res.status(201).json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  });

  router.put("/questions/:id", async (req, res, next) => {
    const { question, valid } = questionInput(req.body);
    if (!valid) {
      return res.status(400).json({
        message: "Complete the question, all four options, and the correct answer."
      });
    }

    try {
      const result = await setQuestionParams(
        req.app.locals.pool.request().input("id", sql.Int, req.params.id),
        question,
        sql
      ).query(`
        UPDATE dbo.questions
        SET question_text = @questionText, option_a = @optionA,
            option_b = @optionB, option_c = @optionC, option_d = @optionD,
            correct_option = @correctOption, explanation = @explanation
        OUTPUT INSERTED.id
        WHERE id = @id
      `);

      if (!result.recordset[0]) {
        return res.status(404).json({ message: "Question not found." });
      }
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/questions/:id", async (req, res, next) => {
    try {
      const result = await req.app.locals.pool.request()
        .input("id", sql.Int, req.params.id)
        .query("DELETE FROM dbo.questions OUTPUT DELETED.id WHERE id = @id");
      if (!result.recordset[0]) {
        return res.status(404).json({ message: "Question not found." });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
};