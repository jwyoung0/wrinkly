import { api } from "../api.js";
import { questionForm, saveQuestion } from "../question-form.js";
import { escapeHtml, formatText, notice } from "../utils.js";

export async function setView(app, id, keepEditorInView = false) {
  if (!keepEditorInView) app.innerHTML = "<p>Loading set…</p>";

  try {
    const [sets, questions] = await Promise.all([
      api("/sets"),
      api(`/sets/${id}/questions`)
    ]);
    const set = sets.find((item) => Number(item.id) === Number(id));
    if (!set) throw new Error("Set not found.");

    app.innerHTML = `<a href="#home">← All sets</a><section class="page-heading"><div><h1>${escapeHtml(set.title)}</h1><p class="muted">${questions.length} question${questions.length === 1 ? "" : "s"}</p></div><div class="actions"><a class="btn primary ${questions.length ? "" : "disabled"}" href="${questions.length ? `#quiz/${id}` : `#set/${id}`}">Take quiz</a><button class="btn danger" data-delete-set="${id}">Delete set</button></div></section><form id="rename-form" class="inline-form"><label>Rename set<input name="title" value="${escapeHtml(set.title)}" maxlength="120" required></label><button class="btn secondary">Save</button></form><section><h2>Add a question</h2><div id="editor"></div></section><section><h2>Questions</h2><div class="question-list">${questions.length ? questions.map((q, index) => `<article class="card question"><div><strong>${index + 1}. ${formatText(q.questionText)}</strong><ol type="A"><li>${formatText(q.optionA)}</li><li>${formatText(q.optionB)}</li><li>${formatText(q.optionC)}</li><li>${formatText(q.optionD)}</li></ol><p class="correct">Correct: ${escapeHtml(q.correctOption)}${q.explanation ? ` — ${formatText(q.explanation)}` : ""}</p></div><div class="actions"><button class="btn secondary" data-edit-question="${q.id}">Edit</button><button class="btn danger" data-delete-question="${q.id}">Delete</button></div></article>`).join("") : "<p class=\"muted\">No questions yet. Add one above to get started.</p>"}</div></section>`;

    const editor = document.querySelector("#editor");
    const form = questionForm();
    editor.append(form);

    form.onsubmit = async (event) => {
      event.preventDefault();
      try {
        await saveQuestion(event.target, `/sets/${id}/questions`, "POST");
        await setView(app, id, true);
      } catch {
        // saveQuestion displays the error.
      }
    };

    if (keepEditorInView) editor.scrollIntoView({ block: "start" });

    document.querySelector("#rename-form").onsubmit = async (event) => {
      event.preventDefault();
      try {
        await api(`/sets/${id}`, {
          method: "PUT",
          body: JSON.stringify({ title: event.target.title.value })
        });
        await setView(app, id);
      } catch (error) {
        event.target.insertAdjacentHTML("beforebegin", notice(error.message));
      }
    };

    app.onclick = async (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      try {
        if (button.dataset.deleteSet && confirm("Delete this set and every question in it?")) {
          await api(`/sets/${id}`, { method: "DELETE" });
          location.hash = "home";
        } else if (button.dataset.deleteQuestion && confirm("Delete this question?")) {
          await api(`/questions/${button.dataset.deleteQuestion}`, { method: "DELETE" });
          await setView(app, id);
        } else if (button.dataset.editQuestion) {
          const question = questions.find(
            (item) => Number(item.id) === Number(button.dataset.editQuestion)
          );
          if (question) editQuestion(app, question.id, question, id);
        }
      } catch (error) {
        app.insertAdjacentHTML("afterbegin", notice(error.message));
      }
    };
  } catch (error) {
    app.innerHTML = notice(error.message);
  }
}

function editQuestion(app, questionId, question, setId) {
  const editor = document.querySelector("#editor");
  editor.innerHTML = "<h3>Edit question</h3>";

  const form = questionForm(question);
  editor.append(form);
  form.scrollIntoView({ behavior: "smooth", block: "start" });

  form.querySelector(".cancel-question").onclick = () => {
    location.hash = `set/${setId}`;
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    try {
      await saveQuestion(event.target, `/questions/${questionId}`, "PUT");
      await setView(app, setId, true);
    } catch {
      // saveQuestion displays the error.
    }
  };
}