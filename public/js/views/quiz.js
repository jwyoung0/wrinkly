import { api } from "../api.js";
import { escapeHtml, formatText, notice, shuffle } from "../utils.js";

export async function quiz(app, id) {
  app.innerHTML = "<p>Preparing quiz…</p>";

  try {
    const sets = await api("/sets");
    const set = sets.find((item) => Number(item.id) === Number(id));
    if (!set) throw new Error("Set not found.");

    const questionCount = Number(set.questionCount);
    if (!Number.isFinite(questionCount) || questionCount < 1) {
      location.hash = `set/${id}`;
      return;
    }

    const requestedCount = Number(localStorage.quizQuestionCount || 10);
    const count = Math.min(
      Math.max(Number.isFinite(requestedCount) ? Math.floor(requestedCount) : 10, 1),
      100,
      questionCount
    );

    const questions = await api(`/sets/${id}/quiz?limit=${count}`);
    if (!questions.length) {
      location.hash = `set/${id}`;
      return;
    }

    const optionOrders = new Map(
      questions.map((question) => [question.id, shuffle(["A", "B", "C", "D"])])
    );

    app.innerHTML = `<a href="#set/${id}">← Back to set</a><h1>${escapeHtml(set.title)} quiz</h1><p class="muted">${questions.length} randomly selected question${questions.length === 1 ? "" : "s"}. Answer every question, then submit.</p><form id="quiz-form">${questions.map((question, index) => `<fieldset class="card quiz-question"><legend>${index + 1}. ${formatText(question.questionText)}</legend>${optionOrders.get(question.id).map((key, optionIndex) => `<label class="answer"><input required type="radio" name="q-${question.id}" value="${key}"> <strong>${String.fromCharCode(65 + optionIndex)}.</strong> ${formatText(question[`option${key}`])}</label>`).join("")}</fieldset>`).join("")}<button class="btn primary">Submit quiz</button></form>`;

    document.querySelector("#quiz-form").onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const answers = questions.map((question) => ({
        questionId: question.id,
        selectedOption: form.get(`q-${question.id}`)
      }));

      try {
        const data = await api(`/sets/${id}/quiz-results`, {
          method: "POST",
          body: JSON.stringify({ answers })
        });
        results(app, data, id, set.title, optionOrders);
      } catch (error) {
        app.insertAdjacentHTML("afterbegin", notice(error.message));
      }
    };
  } catch (error) {
    app.innerHTML = notice(error.message);
  }
}

function results(app, data, id, title, optionOrders) {
  const displayLetter = (questionId, optionKey) => {
    const order = optionOrders.get(questionId) || ["A", "B", "C", "D"];
    const index = order.indexOf(optionKey);
    return index < 0 ? null : String.fromCharCode(65 + index);
  };

  app.innerHTML = `<a href="#set/${id}">← Back to set</a><section class="score-card"><p class="eyebrow">${escapeHtml(title)}</p><h1>${data.score} / ${data.results.length}</h1><p>${Math.round((data.score / data.results.length) * 100)}% correct</p><a class="btn primary" href="#quiz/${id}">Try again</a></section><section><h2>Review</h2>${data.results.map((result, index) => {
    const selectedLetter = displayLetter(result.id, result.selectedOption);
    const correctLetter = displayLetter(result.id, result.correctOption);

    return `<article class="card result ${result.isCorrect ? "correct-result" : "incorrect-result"}"><strong>${index + 1}. ${formatText(result.questionText)}</strong><p>${result.isCorrect ? "Correct" : `Your answer: ${selectedLetter || "No answer"}`}</p>${!result.isCorrect ? `<p>Correct answer: ${correctLetter}. ${formatText(result[`option${result.correctOption}`])}</p>` : ""}${result.explanation ? `<p class="muted">${formatText(result.explanation)}</p>` : ""}</article>`;
  }).join("")}</section>`;
}