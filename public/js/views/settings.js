export function settings(app, go) {
  const storedCount = Number(localStorage.quizQuestionCount || 10);
  const count = Number.isFinite(storedCount)
    ? Math.min(Math.max(Math.floor(storedCount), 1), 100)
    : 10;

  app.innerHTML = `<section class="narrow"><h1>Quiz settings</h1><form id="settings-form" class="stack"><label>Questions per quiz<input name="count" type="number" min="1" max="100" value="${count}" required></label><button class="btn primary">Save settings</button></form></section>`;

  document.querySelector("#settings-form").onsubmit = (event) => {
    event.preventDefault();
    localStorage.quizQuestionCount = event.target.count.value;
    go("home");
  };
}