import { describe, expect, it } from "vitest";
import { isUserAlreadyRegisteredError, translateAuthError } from "./auth-errors";

describe("translateAuthError", () => {
  it("translates user already registered error message", () => {
    const error = new Error("User already registered");
    expect(translateAuthError(error)).toBe("Este e-mail já está cadastrado no sistema.");
  });

  it("translates invalid login credentials", () => {
    const error = { message: "Invalid login credentials" };
    expect(translateAuthError(error)).toBe("E-mail ou senha incorretos.");
  });

  it("translates rate limit", () => {
    const error = "Email rate limit exceeded";
    expect(translateAuthError(error)).toBe(
      "Por motivos de segurança, aguarde alguns instantes antes de tentar novamente.",
    );
  });

  it("translates password minimum length", () => {
    const error = "Password should be at least 6 characters";
    expect(translateAuthError(error)).toBe("A senha deve ter pelo menos 6 caracteres.");
  });

  it("detects already registered error via isUserAlreadyRegisteredError", () => {
    expect(isUserAlreadyRegisteredError(new Error("User already registered"))).toBe(true);
    expect(isUserAlreadyRegisteredError("user already registered")).toBe(true);
    expect(isUserAlreadyRegisteredError("invalid credentials")).toBe(false);
  });
});
