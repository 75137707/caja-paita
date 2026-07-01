import { createContext, useContext, useState, useCallback } from "react";
import { login as loginRequest } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [cliente, setCliente] = useState(() => {
    const stored = localStorage.getItem("cv_cliente");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signIn = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginRequest(username, password);
      const clienteInfo = { codcliente: data.codcliente, nombre: data.nombre };
      localStorage.setItem("cv_token", data.access_token);
      localStorage.setItem("cv_cliente", JSON.stringify(clienteInfo));
      setCliente(clienteInfo);
      return { ok: true };
    } catch (err) {
      const detail =
        err.response?.data?.detail || "No se pudo iniciar sesión. Intenta nuevamente.";
      setError(detail);
      return { ok: false, error: detail, status: err.response?.status };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_cliente");
    setCliente(null);
  }, []);

  const isAuthenticated = Boolean(cliente && localStorage.getItem("cv_token"));

  return (
    <AuthContext.Provider
      value={{ cliente, isAuthenticated, loading, error, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
