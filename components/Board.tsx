"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  type Status,
  type Todo,
} from "@/lib/api";

const COLUMNS: { status: Status; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

type Columns = Record<Status, Todo[]>;

function groupByStatus(todos: Todo[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], done: [] };
  for (const t of todos) {
    // Guard against unexpected statuses from the API.
    (cols[t.status] ?? cols.todo).push(t);
  }
  for (const status of Object.keys(cols) as Status[]) {
    cols[status].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  }
  return cols;
}

export default function Board() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTodos(await getTodos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => groupByStatus(todos), [todos]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const fromStatus = source.droppableId as Status;
      const toStatus = destination.droppableId as Status;

      // Work on a fresh grouping so we can splice positions.
      const grouped = groupByStatus(todos);
      const moved = grouped[fromStatus][source.index];
      if (!moved) return;

      grouped[fromStatus].splice(source.index, 1);
      grouped[toStatus].splice(destination.index, 0, { ...moved, status: toStatus });

      // Re-flatten, assigning a contiguous order per column.
      const next: Todo[] = [];
      for (const status of Object.keys(grouped) as Status[]) {
        grouped[status].forEach((t, idx) => {
          next.push({ ...t, status, order: idx });
        });
      }

      const snapshot = todos;
      setTodos(next); // optimistic

      try {
        const updated = await updateTodo(moved.id, {
          status: toStatus,
          order: destination.index,
        });
        // Reconcile the moved card with the server's response.
        setTodos((cur) =>
          cur.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
      } catch (err) {
        setTodos(snapshot); // revert
        setError(
          err instanceof Error ? err.message : "Failed to move card. Reverted."
        );
      }
    },
    [todos]
  );

  const onAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = title.trim();
      if (!value || adding) return;
      setAdding(true);
      setError(null);
      try {
        const created = await createTodo(value);
        setTodos((cur) => [...cur, created]);
        setTitle("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add todo.");
      } finally {
        setAdding(false);
      }
    },
    [title, adding]
  );

  const onDelete = useCallback(
    async (id: string) => {
      const snapshot = todos;
      setTodos((cur) => cur.filter((t) => t.id !== id)); // optimistic
      try {
        await deleteTodo(id);
      } catch (err) {
        setTodos(snapshot); // revert
        setError(err instanceof Error ? err.message : "Failed to delete todo.");
      }
    },
    [todos]
  );

  return (
    <main className="page">
      <div className="header">
        <h1>Kanban Todo Board</h1>
        <p>Drag a card between columns to change its status.</p>
      </div>

      <form className="add-form" onSubmit={onAdd}>
        <input
          type="text"
          placeholder="Add a new todo…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="New todo title"
        />
        <button type="submit" disabled={adding || !title.trim()}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <div className="banner error">
          <span>{error}</span>
          <button onClick={load}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading board…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="board">
            {COLUMNS.map(({ status, title: colTitle }) => (
              <section className="column" data-status={status} key={status}>
                <div className="column-header">
                  <span className="column-dot" />
                  <span className="column-title">{colTitle}</span>
                  <span className="column-count">{columns[status].length}</span>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      className={`dropzone${snapshot.isDraggingOver ? " is-over" : ""}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {columns[status].length === 0 &&
                        !snapshot.isDraggingOver && (
                          <div className="empty">No cards</div>
                        )}
                      {columns[status].map((todo, index) => (
                        <Draggable
                          draggableId={todo.id}
                          index={index}
                          key={todo.id}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              className={`card${dragSnapshot.isDragging ? " dragging" : ""}`}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <span className="card-title">{todo.title}</span>
                              <button
                                className="card-delete"
                                aria-label={`Delete ${todo.title}`}
                                title="Delete"
                                onClick={() => onDelete(todo.id)}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            ))}
          </div>
        </DragDropContext>
      )}
    </main>
  );
}
