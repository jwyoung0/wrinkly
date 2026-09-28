export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (response.status === 204) return null;

  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Request failed.");
  return body;
}