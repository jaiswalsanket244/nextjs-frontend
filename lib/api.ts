// Typed client for the Express Todo backend.
//
// Base URL is configurable via NEXT_PUBLIC_API_URL and defaults to
// http://localhost:4000. Because this is a NEXT_PUBLIC_ variable it is
// inlined at build time and available in the browser at runtime.

export type Status = "todo" | "in_progress" | "done";

export interface Todo {
  id: string;
  title: string;
  status: Status;
  order: number;
  createdAt: string;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      // Always hit the network; the board owns its own cache.
      cache: "no-store",
      ...init,
    });
  } catch (err) {
    throw new Error(
      `Cannot reach the backend at ${API_URL}. Is it running? (${
        err instanceof Error ? err.message : String(err)
      })`
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(
      `Request to ${path} failed with ${res.status}${detail ? `: ${detail}` : ""}`
    );
  }

  // 204 No Content (DELETE) has no body to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getTodos(): Promise<Todo[]> {
  return request<Todo[]>("/api/todos");
}

export function createTodo(title: string): Promise<Todo> {
  return request<Todo>("/api/todos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, "status" | "title" | "order">>
): Promise<Todo> {
  return request<Todo>(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteTodo(id: string): Promise<void> {
  return request<void>(`/api/todos/${id}`, { method: "DELETE" });
}
