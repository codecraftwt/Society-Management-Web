
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../services/api";
import { rejoinSocket, getSocket } from "../services/socket";

export const AuthContext = createContext({
  user:               null,
  login:              () => {},
  logout:             () => {},
  updateUser:         () => {},
  switchRole:         async () => {},
  refreshPermissions: async () => {},
  syncProfilePicture: async () => {},
});

export const useAuth = () => useContext(AuthContext);
export const useAuthContext = useAuth;

/** Normalise a user object — synthesises RBAC fields for old tokens */
function normaliseUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    roles:               raw.roles               ?? [raw.role],
    activeRole:          raw.activeRole          ?? raw.role,
    dynamic_permissions: raw.dynamic_permissions ?? raw.permissions ?? null,
    permissions:         raw.permissions         ?? raw.dynamic_permissions ?? null,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() =>
    normaliseUser(JSON.parse(localStorage.getItem("user")))
  );

  const refreshPermissions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const res = await API.get("/permissions/my");
      if (res.data?.success && res.data.permissions) {
        const perms = res.data.permissions;
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            dynamic_permissions: perms,
            permissions: perms,
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        return perms;
      }
    } catch (err) {
      // Non-blocking fallback
      console.warn("[AuthContext] Could not fetch dynamic permissions:", err?.message);
    }
    return null;
  }, []);

  // Fetch latest dynamic permissions on mount
  useEffect(() => {
    if (localStorage.getItem("token")) {
      refreshPermissions();
    }
  }, [refreshPermissions]);

  /**
   * Re-read the authoritative profile from /users/me and merge it into the
   * cached session.
   *
   * Pulls the fresh profile on boot and when forced so a photo uploaded
   * on another device (or via mobile app) updates everywhere across the web app.
   */
  const syncProfilePicture = useCallback(async () => {
    if (!localStorage.getItem("token")) return null;

    const current = normaliseUser(JSON.parse(localStorage.getItem("user")));
    if (!current) return null;

    try {
      const res = await API.get("/users/me");
      const fresh = res?.data?.user || res?.data;
      if (!fresh || typeof fresh !== "object") return current.profile_picture ?? null;

      const patch = {};
      ["profile_picture", "name", "email", "phone"].forEach((k) => {
        if (fresh[k] === undefined) return;
        if (fresh[k] !== current[k]) patch[k] = fresh[k];
      });
      if (Object.keys(patch).length === 0) return current.profile_picture ?? null;

      const merged = normaliseUser({ ...current, ...patch });
      localStorage.setItem("user", JSON.stringify(merged));
      setUser(merged);
      return patch.profile_picture ?? null;
    } catch (err) {
      console.warn("[AuthContext] Profile sync skipped:", err?.message);
      return current.profile_picture ?? null;
    }
  }, []);

  // Pull the authoritative profile once on boot so a photo uploaded elsewhere
  // shows up in every panel and in the sidebar.
  useEffect(() => {
    if (localStorage.getItem("token")) {
      syncProfilePicture();
    }
  }, [syncProfilePicture]);

  // Real-time socket listener for dynamic permission updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePermissionsUpdated = (payload) => {
      console.log("[AuthContext] Real-time permissions update received:", payload);
      refreshPermissions();
    };

    socket.on("permissions_updated", handlePermissionsUpdated);
    socket.on("role_permissions_changed", handlePermissionsUpdated);

    return () => {
      socket.off("permissions_updated", handlePermissionsUpdated);
      socket.off("role_permissions_changed", handlePermissionsUpdated);
    };
  }, [refreshPermissions, user?.id, user?.activeRole, user?.society_id]);

  const login = (userData, token) => {
    const normalised = normaliseUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalised));
    setUser(normalised);
    // ✅ localStorage is now updated — joinRooms() will read the new user
    rejoinSocket();
    refreshPermissions();
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
    await refreshPermissions();

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        switchRole,
        refreshPermissions,
        syncProfilePicture,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};