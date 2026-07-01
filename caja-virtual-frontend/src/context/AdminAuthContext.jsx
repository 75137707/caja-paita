import { createContext, useContext, useState, useCallback } from "react";
import { adminLogin } from "../api/endpointsAdmin";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem("cv_admin");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signIn = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminLogin(username, password);
      const adminInfo = { username: data.username, nombre: data.nombre, rol: data.rol };
      localStorage.setItem("cv_admin_token", data.access_token);
      localStorage.setItem("cv_admin", JSON.stringify(adminInfo));
      setAdmin(adminInfo);
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
    localStorage.removeItem("cv_admin_token");
    localStorage.removeItem("cv_admin");
    setAdmin(null);
  }, []);

  const isAuthenticated = Boolean(admin && localStorage.getItem("cv_admin_token"));

  return (
    <AdminAuthContext.Provider
      value={{ admin, isAuthenticated, loading, error, signIn, signOut }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth debe usarse dentro de AdminAuthProvider");
  return ctx;
}
