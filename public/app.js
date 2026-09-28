import { home } from "./js/views/home.js";
import { newSet } from "./js/views/new-set.js";
import { setView } from "./js/views/set.js";
import { quiz } from "./js/views/quiz.js";
import { settings } from "./js/views/settings.js";

const app = document.querySelector("#app");

function route() {
  return location.hash.slice(1) || "home";
}

function go(path) {
  if (route() === path) render();
  else location.hash = path;
}

function render() {
  const [name, id] = route().split("/");

  if (name === "new") newSet(app, go);
  else if (name === "set" && id) setView(app, id);
  else if (name === "quiz" && id) quiz(app, id);
  else if (name === "settings") settings(app, go);
  else home(app);
}

window.addEventListener("hashchange", render);
render();
