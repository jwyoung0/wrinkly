const express = require("express");
const { clean } = require("../validation");

module.exports = function createQuizRouter(sql) {
  const router = express.Router();

  router.get("/:id/quiz", async (req, res, next) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    try {
      const result = await req.app.locals.pool.request()
        .input("setId", sql.Int, req.params.id)
        .input("limit", sql.Int, limit)
        .query(`
          SELECT TOP (@limit) id, question_text AS questionText,
                 option_a AS optionA, option_b AS optionB,
                 option_c AS optionC, option_d AS optionD
          FROM dbo.questions
          WHERE set_id = @setId
          ORDER BY NEWID()
        `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/quiz-results", async (req, res, next) => {
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const ids = [...new Set(
      answers.map((answer) => Number(answer.questionId)).filter(Number.isInteger)
    )];

    if (!ids.length) {
      return res.status(400).json({ message: "No quiz answers supplied." });
    }

    try {
      const request = req.app.locals.pool.request().input("setId", sql.Int, req.params.id);
      ids.forEach((id, index) => request.input(`id${index}`, sql.Int, id));

      const result = await request.query(`
        SELECT id, question_text AS questionText,
               option_a AS optionA, option_b AS optionB,
               option_c AS optionC, option_d AS optionD,
               correct_option AS correctOption, explanation
        FROM dbo.questions
        WHERE set_id = @setId
          AND id IN (${ids.map((_, index) => `@id${index}`).join(",")})
      `);

      const selections = new Map(
        answers.map((answer) => [
          Number(answer.questionId),
          clean(answer.selectedOption, 1).toUpperCase()
        ])
      );

      const results = result.recordset.map((question) => ({
        ...question,
        selectedOption: selections.get(question.id) || null,
        isCorrect: selections.get(question.id) === question.correctOption
      }));

      res.json({
        score: results.filter((item) => item.isCorrect).length,
        results
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};