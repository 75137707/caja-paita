import axios from "axios";
import { API_BASE_URL } from "./client";

// Cliente axios independiente para el panel de administración: usa su propio
// token (cv_admin_token) para no interferir con la sesión de cliente (cv_token).
const apiAdmin = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiAdmin.interceptors.request.use((config) => {
  const token = localStorage.getItem("cv_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiAdmin.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cv_admin_token");
      localStorage.removeItem("cv_admin");
      if (window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiAdmin;
