export const escapeHtml = (value = "") =>
  String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);

export function formatText(value = "") {
  const parts = String(value).split(/```(\w*)\r?\n([\s\S]*?)```/g);
  let html = "";

  for (let i = 0; i < parts.length; i += 3) {
    html += escapeHtml(parts[i] ?? "").replace(/\r?\n/g, "<br>");
    if (i + 2 < parts.length) {
      const lang = parts[i + 1] || "";
      const code = (parts[i + 2] || "").replace(/\n$/, "");
      html += `<pre class="code-block"><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${escapeHtml(code)}</code></pre>`;
    }
  }

  return html;
}

export const notice = (message, kind = "error") =>
  `<p class="notice ${kind}">${escapeHtml(message)}</p>`;

export function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}