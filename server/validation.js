function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function questionInput(body = {}) {
  const question = {
    questionText: clean(body.questionText, 1000),
    optionA: clean(body.optionA, 500),
    optionB: clean(body.optionB, 500),
    optionC: clean(body.optionC, 500),
    optionD: clean(body.optionD, 500),
    correctOption: clean(body.correctOption, 1).toUpperCase(),
    explanation: clean(body.explanation, 1500) || null
  };

  const valid = Boolean(
    question.questionText &&
    question.optionA &&
    question.optionB &&
    question.optionC &&
    question.optionD &&
    ["A", "B", "C", "D"].includes(question.correctOption)
  );

  return { question, valid };
}

function setQuestionParams(request, question, sql) {
  return request
    .input("questionText", sql.NVarChar(1000), question.questionText)
    .input("optionA", sql.NVarChar(500), question.optionA)
    .input("optionB", sql.NVarChar(500), question.optionB)
    .input("optionC", sql.NVarChar(500), question.optionC)
    .input("optionD", sql.NVarChar(500), question.optionD)
    .input("correctOption", sql.Char(1), question.correctOption)
    .input("explanation", sql.NVarChar(1500), question.explanation);
}

module.exports = { clean, questionInput, setQuestionParams };