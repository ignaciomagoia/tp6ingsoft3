import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "../components/RegisterForm";

describe("RegisterForm", () => {
  it("muestra errores cuando los campos están vacíos", async () => {
    render(<RegisterForm onRegister={jest.fn()} onLogin={jest.fn()} />);

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /registrar/i }));
    });

    expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument();
  });

  it("llama a onRegister con los valores normalizados", async () => {
    const handleRegister = jest.fn();
    render(<RegisterForm onRegister={handleRegister} onLogin={jest.fn()} />);

    await act(async () => {
      await userEvent.type(screen.getByLabelText(/email/i), "  USER@Test.com ");
      await userEvent.type(screen.getByLabelText(/contraseña/i), "secret");
      await userEvent.click(screen.getByRole("button", { name: /registrar/i }));
    });

    expect(handleRegister).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "secret",
    });
  });
});
