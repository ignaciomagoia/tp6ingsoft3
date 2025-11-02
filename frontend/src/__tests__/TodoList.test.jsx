import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import {
  registerUser,
  loginUser,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "../services/api";

jest.mock("../services/api");

describe("App integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateTodo.mockResolvedValue({ todo: { id: "1", title: "Mock", completed: true } });
    deleteTodo.mockResolvedValue({ message: "deleted" });
  });

  it("renderiza el título To-Do List", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /to-do list/i })).toBeInTheDocument();
  });

  it("actualiza la lista al crear una tarea", async () => {
    registerUser.mockResolvedValue({ message: "Registrado" });
    loginUser.mockResolvedValue({ message: "Login" });
    getTodos.mockResolvedValueOnce({ todos: [] });
    createTodo.mockResolvedValue({
      todo: { id: "todo-1", title: "Preparar informe", completed: false },
    });

    render(<App />);

    await act(async () => {
      await userEvent.type(screen.getByLabelText(/email/i), "demo@example.com");
      await userEvent.type(screen.getByLabelText(/contraseña/i), "pass123");
      await userEvent.click(screen.getByRole("button", { name: /registrar/i }));
    });

    await waitFor(() => expect(registerUser).toHaveBeenCalled());
    await waitFor(() => expect(getTodos).toHaveBeenCalledWith("demo@example.com"));

    await act(async () => {
      await userEvent.type(
        screen.getByLabelText(/título de la tarea/i),
        "Preparar informe"
      );
      await userEvent.click(screen.getByRole("button", { name: /agregar tarea/i }));
    });

    await waitFor(() => expect(createTodo).toHaveBeenCalledWith({
      email: "demo@example.com",
      title: "Preparar informe",
    }));

    expect(await screen.findByText(/preparar informe/i)).toBeInTheDocument();
  });
});
