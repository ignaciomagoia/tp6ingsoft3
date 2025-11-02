import React from "react";

export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className="todo-item">
      <label className="todo-item__content">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id, todo.completed)}
          aria-label={`Cambiar estado de ${todo.title}`}
        />
        <span className={todo.completed ? "todo-title todo-title--done" : "todo-title"}>
          {todo.title}
        </span>
      </label>
      <button type="button" className="btn btn--ghost" onClick={() => onDelete(todo.id)}>
        Eliminar
      </button>
    </li>
  );
}
