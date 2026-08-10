
import { createContext, useState } from "react";
import API from "../services/api";
import { rejoinSocket } from "../services/socket";

export const AuthContext = createContext({
  user:       null,
  login:      () => {},
  logout:     () => {},
  updateUser: () => {},
  switchRole: async () => {},
});

/** Normalise a user object — synthesises RBAC fields for old tokens */
function normaliseUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    roles:      raw.roles      ?? [raw.role],
    activeRole: raw.activeRole ?? raw.role,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() =>
    normaliseUser(JSON.parse(localStorage.getItem("user")))
  );

  const login = (userData, token) => {
    const normalised = normaliseUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalised));
    setUser(normalised);
    // ✅ localStorage is now updated — joinRooms() will read the new user
    rejoinSocket();
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    const merged = normaliseUser({ ...user, ...updatedFields });
    localStorage.setItem("user", JSON.stringify(merged));
    setUser(merged);
  };

  const switchRole = async (role) => {
    const res = await API.post("/auth/switch-role", { role });
    const { token, user: updatedUser } = res.data;

    localStorage.setItem("token", token);
    const normalised = normaliseUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(normalised));
    setUser(normalised);
    // ✅ Re-join with new activeRole so server rooms update immediately
    rejoinSocket();

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};