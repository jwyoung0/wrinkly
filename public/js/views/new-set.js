import { api } from "../api.js";
import { notice } from "../utils.js";

export function newSet(app, go) {
  app.innerHTML = `<section class="narrow"><a href="#home">← Back to sets</a><h1>Create a study set</h1><form id="set-form" class="stack"><label>Set title<input name="title" maxlength="120" required autofocus placeholder="e.g. CompTIA A+ Networking"></label><button class="btn primary">Create set</button></form></section>`;

  document.querySelector("#set-form").onsubmit = async (event) => {
    event.preventDefault();
    try {
      const set = await api("/sets", {
        method: "POST",
        body: JSON.stringify({ title: event.target.title.value })
      });
      go(`set/${set.id}`);
    } catch (error) {
      event.target.insertAdjacentHTML("beforebegin", notice(error.message));
    }
  };
}