import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:8080";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [authEmail, setAuthEmail] = useState("");

  const normalizeEmail = useCallback(
    (value) => value.trim().toLowerCase(),
    []
  );

  const showStatus = useCallback((text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const clearStatus = useCallback(() => {
    setMessage("");
    setMessageType("info");
  }, []);

  const handleLogin = async () => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const res = await axios.post(`${API_URL}/login`, {
        email: normalizedEmail,
        password,
      });
      if (res.status === 200) {
        setEmail(normalizedEmail);
        setAuthEmail(normalizedEmail);
        setIsLoggedIn(true);
        showStatus(
          res.data?.message ?? "✅ Sesión iniciada correctamente",
          "success"
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ?? "❌ Error al iniciar sesión";
      showStatus(errorMessage, "error");
    }
  };

  const handleRegister = async () => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const res = await axios.post(`${API_URL}/register`, {
        email: normalizedEmail,
        password,
      });
      if (res.status === 200 || res.status === 201) {
        setEmail(normalizedEmail);
        showStatus(
          res.data?.message ?? "✅ Usuario registrado. Ahora iniciá sesión.",
          "success"
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ?? "❌ Error al registrar usuario";
      showStatus(errorMessage, "error");
    }
  };

  const fetchTodos = useCallback(async () => {
    if (!authEmail) {
      setTodos([]);
      clearStatus();
      return true;
    }
    try {
      const res = await axios.get(`${API_URL}/todos`, {
        params: { email: authEmail },
      });
      setTodos(res.data?.todos ?? []);
      return true;
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ?? "❌ Error al obtener tareas";
      showStatus(errorMessage, "error");
      return false;
    }
  }, [authEmail, clearStatus, showStatus]);

  const addTodo = async () => {
    if (!isLoggedIn) {
      showStatus("⚠️ Iniciá sesión antes de agregar tareas", "warning");
      return;
    }
    if (!newTodo.trim()) return;
    if (!authEmail) {
      showStatus("❌ No se encontró el usuario autenticado", "error");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/todos`, {
        email: authEmail,
        title: newTodo,
      });
      const createdTodo = res.data?.todo;
      if (createdTodo) {
        setTodos([...todos, createdTodo]);
      }
      const refreshed = await fetchTodos();
      setNewTodo("");
      if (refreshed) {
        showStatus("✅ Tarea agregada", "success");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ?? "❌ Error al agregar tarea";
      showStatus(errorMessage, "error");
    }
  };

  const toggleTodo = async (id, completed) => {
    try {
      const res = await axios.put(`${API_URL}/todos/${id}`, {
        completed: !completed,
      });
      const updatedTodo = res.data?.todo;
      setTodos(
        todos.map((t) =>
          t.id === id
            ? updatedTodo ?? { ...t, completed: !t.completed }
            : t
        )
      );
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ?? "❌ Error al actualizar tarea";
      showStatus(errorMessage, "error");
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API_URL}/todos/${id}`);
      setTodos(todos.filter((t) => t.id !== id));
      const refreshed = await fetchTodos();
      if (refreshed) {
        showStatus("🗑️ Tarea eliminada", "info");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ?? "❌ Error al eliminar tarea";
      showStatus(errorMessage, "error");
    }
  };

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setIsLoggedIn(false);
    setAuthEmail("");
    setTodos([]);
    showStatus("👋 Sesión cerrada", "info");
  };

  useEffect(() => {
    if (isLoggedIn && authEmail) {
      fetchTodos();
    }
  }, [isLoggedIn, authEmail, fetchTodos]);

  return (
    <div className="app">
      <div className="app__card">
        <header className="app__header">
          <h1>To-Do Planner</h1>
          <p>
            Organizá tus pendientes diarios de forma simple y mantené todo bajo
            control.
          </p>
        </header>

        <section className="section">
          <h2 className="section__title">Accedé a tu cuenta</h2>
          <div className="auth-form">
            <div className="auth-form__inputs">
              <input
                type="email"
                className="input"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggedIn}
              />
              <input
                type="password"
                className="input"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggedIn}
              />
            </div>
            <div className="auth-form__actions">
              <button
                className="btn btn--outline"
                onClick={handleRegister}
                disabled={isLoggedIn}
              >
                Registrarse
              </button>
              <button
                className="btn btn--primary"
                onClick={handleLogin}
                disabled={isLoggedIn}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className={`status status--${messageType}`}>{message}</div>
        )}

        {isLoggedIn && (
          <section className="section todo-section">
            <div className="todo-section__header">
              <div>
                <h2 className="section__title">Mis tareas</h2>
                <p className="auth-info">
                  Sesión iniciada como <strong>{authEmail}</strong>
                  {todos.length
                    ? ` · ${todos.length} ${
                        todos.length === 1 ? "tarea" : "tareas"
                      }`
                    : ""}
                </p>
              </div>
              <button className="btn btn--secondary" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>

            <div className="todo-input">
              <input
                type="text"
                className="input"
                placeholder="Nueva tarea"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
              <button className="btn btn--primary" onClick={addTodo}>
                Agregar
              </button>
            </div>

            {todos.length === 0 ? (
              <p className="todo-empty">
                Todavía no agregaste tareas. Empezá con la primera ✨
              </p>
            ) : (
              <ul className="todo-list">
                {todos.map((t) => (
                  <li key={t.id} className="todo-item">
                    <label className="todo-item__body">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggleTodo(t.id, t.completed)}
                      />
                      <span
                        className={`todo-title${
                          t.completed ? " todo-title--completed" : ""
                        }`}
                      >
                        {t.title}
                      </span>
                    </label>
                    <button
                      className="btn btn--danger"
                      onClick={() => deleteTodo(t.id)}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
