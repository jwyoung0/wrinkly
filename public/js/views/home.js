import { api } from "../api.js";
import { escapeHtml, notice } from "../utils.js";

export async function home(app) {
  app.innerHTML = "<p>Loading sets…</p>";

  try {
    const sets = await api("/sets");
    app.innerHTML = `<section class="page-heading"><div><h1>Your study sets</h1><p class="muted">Build questions, test yourself, and review missed answers.</p></div><a class="btn primary" href="#new">Create a set</a></section>${
      sets.length
        ? `<div class="set-grid">${sets.map((set) => `<article class="card"><h2>${escapeHtml(set.title)}</h2><p class="muted">${set.questionCount} question${set.questionCount === 1 ? "" : "s"}</p><div class="actions"><a class="btn secondary" href="#set/${set.id}">Manage</a><a class="btn primary ${set.questionCount ? "" : "disabled"}" href="${set.questionCount ? `#quiz/${set.id}` : "#home"}">Take quiz</a></div></article>`).join("")}</div>`
        : `<section class="empty"><h2>No study sets yet</h2><p>Create a set, then add questions to start practicing.</p><a class="btn primary" href="#new">Create your first set</a></section>`
    }`;
  } catch (error) {
    app.innerHTML = notice(error.message);
  }
}