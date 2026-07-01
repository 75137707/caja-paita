import axios from "axios";

// URL base del backend FastAPI (Homebanking Caja Virtual). Ajustar si corre en otro host/puerto.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8002";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Adjunta el token JWT (si existe) a cada request saliente.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cv_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401 (token vencido/inválido), forzamos logout y redirigimos.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cv_token");
      localStorage.removeItem("cv_cliente");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
