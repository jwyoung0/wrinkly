const app = document.querySelector("#app");
const template = document.querySelector("#question-form-template");
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Request failed.");
  return body;
}
function notice(message, kind = "error") { return `<p class="notice ${kind}">${escapeHtml(message)}</p>`; }
function route() { return location.hash.slice(1) || "home"; }
function go(path) { location.hash = path; }
function questionForm(question = {}) {
  const form = template.content.firstElementChild.cloneNode(true);
  Object.entries(question).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value || ""; });
  return form;
}

async function home() {
  app.innerHTML = "<p>Loading sets…</p>";
  try {
    const sets = await api("/sets");
    app.innerHTML = `<section class="page-heading"><div><h1>Your study sets</h1><p class="muted">Build questions, test yourself, and review missed answers.</p></div><a class="btn primary" href="#new">Create a set</a></section>${sets.length ? `<div class="set-grid">${sets.map((set) => `<article class="card"><h2>${escapeHtml(set.title)}</h2><p class="muted">${set.questionCount} question${set.questionCount === 1 ? "" : "s"}</p><div class="actions"><a class="btn secondary" href="#set/${set.id}">Manage</a><a class="btn primary ${set.questionCount ? "" : "disabled"}" href="${set.questionCount ? `#quiz/${set.id}` : "#home"}">Take quiz</a></div></article>`).join("")}</div>` : `<section class="empty"><h2>No study sets yet</h2><p>Create a set, then add questions to start practicing.</p><a class="btn primary" href="#new">Create your first set</a></section>`}`;
  } catch (error) { app.innerHTML = notice(error.message); }
}

function newSet() {
  app.innerHTML = `<section class="narrow"><a href="#home">← Back to sets</a><h1>Create a study set</h1><form id="set-form" class="stack"><label>Set title<input name="title" maxlength="120" required autofocus placeholder="e.g. CompTIA A+ Networking"></label><button class="btn primary">Create set</button></form></section>`;
  document.querySelector("#set-form").onsubmit = async (event) => {
    event.preventDefault();
    try { const set = await api("/sets", { method: "POST", body: JSON.stringify({ title: event.target.title.value }) }); go(`set/${set.id}`); }
    catch (error) { event.target.insertAdjacentHTML("beforebegin", notice(error.message)); }
  };
}

async function setView(id) {
  app.innerHTML = "<p>Loading set…</p>";
  try {
    const [sets, questions] = await Promise.all([api("/sets"), api(`/sets/${id}/questions`)]);
    const set = sets.find((item) => item.id === Number(id));
    if (!set) throw new Error("Set not found.");
    app.innerHTML = `<a href="#home">← All sets</a><section class="page-heading"><div><h1>${escapeHtml(set.title)}</h1><p class="muted">${questions.length} question${questions.length === 1 ? "" : "s"}</p></div><div class="actions"><a class="btn primary ${questions.length ? "" : "disabled"}" href="${questions.length ? `#quiz/${id}` : "#set/" + id}">Take quiz</a><button class="btn danger" data-delete-set="${id}">Delete set</button></div></section><form id="rename-form" class="inline-form"><label>Rename set<input name="title" value="${escapeHtml(set.title)}" maxlength="120" required></label><button class="btn secondary">Save</button></form><section><h2>Add a question</h2><div id="editor"></div></section><section><h2>Questions</h2><div class="question-list">${questions.length ? questions.map((q, index) => `<article class="card question"><div><strong>${index + 1}. ${escapeHtml(q.questionText)}</strong><ol type="A"><li>${escapeHtml(q.optionA)}</li><li>${escapeHtml(q.optionB)}</li><li>${escapeHtml(q.optionC)}</li><li>${escapeHtml(q.optionD)}</li></ol><p class="correct">Correct: ${q.correctOption}${q.explanation ? ` — ${escapeHtml(q.explanation)}` : ""}</p></div><div class="actions"><button class="btn secondary" data-edit-question="${q.id}">Edit</button><button class="btn danger" data-delete-question="${q.id}">Delete</button></div></article>`).join("") : "<p class=\"muted\">Add your first question above.</p>"}</div></section>`;
    const editor = document.querySelector("#editor");
    const form = questionForm(); editor.append(form);
    form.onsubmit = async (event) => { event.preventDefault(); await saveQuestion(event.target, `/sets/${id}/questions`, "POST"); go(`set/${id}`); };
    document.querySelector("#rename-form").onsubmit = async (event) => { event.preventDefault(); await api(`/sets/${id}`, { method: "PUT", body: JSON.stringify({ title: event.target.title.value }) }); go(`set/${id}`); };
    app.onclick = async (event) => {
      const button = event.target.closest("button"); if (!button) return;
      if (button.dataset.deleteSet && confirm("Delete this set and every question in it?")) { await api(`/sets/${id}`, { method: "DELETE" }); go("home"); }
      if (button.dataset.deleteQuestion && confirm("Delete this question?")) { await api(`/questions/${button.dataset.deleteQuestion}`, { method: "DELETE" }); go(`set/${id}`); }
      if (button.dataset.editQuestion) editQuestion(button.dataset.editQuestion, questions.find((q) => q.id === Number(button.dataset.editQuestion)), id);
    };
  } catch (error) { app.innerHTML = notice(error.message); }
}

async function saveQuestion(form, path, method) {
  const data = Object.fromEntries(new FormData(form));
  try { await api(path, { method, body: JSON.stringify(data) }); }
  catch (error) { form.insertAdjacentHTML("beforebegin", notice(error.message)); throw error; }
}
function editQuestion(questionId, question, setId) {
  const editor = document.querySelector("#editor"); editor.innerHTML = "<h3>Edit question</h3>";
  const form = questionForm(question); editor.append(form); form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.querySelector(".cancel-question").onclick = () => go(`set/${setId}`);
  form.onsubmit = async (event) => { event.preventDefault(); await saveQuestion(event.target, `/questions/${questionId}`, "PUT"); go(`set/${setId}`); };
}

async function quiz(id) {
  app.innerHTML = "<p>Preparing quiz…</p>";
  try {
    const sets = await api("/sets"); const set = sets.find((item) => item.id === Number(id));
    const count = Math.min(Number(localStorage.quizQuestionCount || 10), set?.questionCount || 0);
    const questions = await api(`/sets/${id}/quiz?limit=${count}`);
    if (!questions.length) return go(`set/${id}`);
    app.innerHTML = `<a href="#set/${id}">← Back to set</a><h1>${escapeHtml(set.title)} quiz</h1><p class="muted">${questions.length} randomly selected question${questions.length === 1 ? "" : "s"}. Answer every question, then submit.</p><form id="quiz-form">${questions.map((q, index) => `<fieldset class="card"><legend>${index + 1}. ${escapeHtml(q.questionText)}</legend>${["A", "B", "C", "D"].map((letter) => `<label class="answer"><input required type="radio" name="q-${q.id}" value="${letter}"> <strong>${letter}.</strong> ${escapeHtml(q[`option${letter}`])}</label>`).join("")}</fieldset>`).join("")}<button class="btn primary">Submit quiz</button></form>`;
    document.querySelector("#quiz-form").onsubmit = async (event) => {
      event.preventDefault(); const form = new FormData(event.target);
      const answers = questions.map((q) => ({ questionId: q.id, selectedOption: form.get(`q-${q.id}`) }));
      try { results(await api(`/sets/${id}/quiz-results`, { method: "POST", body: JSON.stringify({ answers }) }), id, set.title); } catch (error) { app.insertAdjacentHTML("afterbegin", notice(error.message)); }
    };
  } catch (error) { app.innerHTML = notice(error.message); }
}
function results(data, id, title) {
  app.innerHTML = `<a href="#set/${id}">← Back to set</a><section class="score-card"><p class="eyebrow">${escapeHtml(title)}</p><h1>${data.score} / ${data.results.length}</h1><p>${Math.round((data.score / data.results.length) * 100)}% correct</p><a class="btn primary" href="#quiz/${id}">Try again</a></section><section><h2>Review</h2>${data.results.map((r, index) => `<article class="card result ${r.isCorrect ? "correct-result" : "incorrect-result"}"><strong>${index + 1}. ${escapeHtml(r.questionText)}</strong><p>${r.isCorrect ? "Correct" : `Your answer: ${r.selectedOption || "No answer"}`}</p>${!r.isCorrect ? `<p>Correct answer: ${r.correctOption}. ${escapeHtml(r[`option${r.correctOption}`])}</p>` : ""}${r.explanation ? `<p class="muted">${escapeHtml(r.explanation)}</p>` : ""}</article>`).join("")}</section>`;
}
function settings() {
  const count = Number(localStorage.quizQuestionCount || 10);
  app.innerHTML = `<section class="narrow"><h1>Quiz settings</h1><form id="settings-form" class="stack"><label>Questions per quiz<input name="count" type="number" min="1" max="100" value="${count}" required></label><button class="btn primary">Save settings</button></form></section>`;
  document.querySelector("#settings-form").onsubmit = (event) => { event.preventDefault(); localStorage.quizQuestionCount = event.target.count.value; go("home"); };
}
function render() { const [name, id] = route().split("/"); if (name === "new") newSet(); else if (name === "set" && id) setView(id); else if (name === "quiz" && id) quiz(id); else if (name === "settings") settings(); else home(); }
window.addEventListener("hashchange", render); render();
