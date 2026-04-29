"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [rol,     setRol]     = useState(null);
  const [modulos, setModulos] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("usuario");
    const r = localStorage.getItem("rol");
    const m = localStorage.getItem("modulos");
    if (t && u) {
      setToken(t);
      setUser(u);
      setRol(r || "usuario");
      setModulos(m && m !== "null" ? JSON.parse(m) : null);
    }
    setLoading(false);
  }, []);

  const login = (tok, usuario, rol, modulos) => {
    localStorage.setItem("token",   tok);
    localStorage.setItem("usuario", usuario);
    localStorage.setItem("rol",     rol || "usuario");
    localStorage.setItem("modulos", JSON.stringify(modulos ?? null));
    setToken(tok);
    setUser(usuario);
    setRol(rol || "usuario");
    setModulos(modulos ?? null);
    router.push("/dashboard");
  };

  const logout = () => {
    ["token", "usuario", "rol", "modulos"].forEach(k => localStorage.removeItem(k));
    setToken(null);
    setUser(null);
    setRol(null);
    setModulos(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, rol, modulos, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
