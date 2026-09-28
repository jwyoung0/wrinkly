import { api } from "./api.js";
import { notice } from "./utils.js";

export function questionForm(question = {}) {
  const template = document.querySelector("#question-form-template");
  const form = template.content.firstElementChild.cloneNode(true);

  Object.entries(question).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });

  form.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  return form;
}

export async function saveQuestion(form, path, method) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api(path, { method, body: JSON.stringify(data) });
  } catch (error) {
    form.insertAdjacentHTML("beforebegin", notice(error.message));
    throw error;
  }
}