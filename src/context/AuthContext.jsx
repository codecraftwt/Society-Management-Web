
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../services/api";
import { rejoinSocket, getSocket, connectSocket, disconnectSocket } from "../services/socket";

export const AuthContext = createContext({
  user:               null,
  availableSocieties: [],
  login:              () => {},
  logout:             () => {},
  updateUser:         () => {},
  switchRole:         async () => {},
  switchSociety:      async () => {},
  fetchSocieties:     async () => {},
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
    // Authoritative panel list from the API. Falls back to the roles array only
    // for legacy cached sessions that predate the field.
    availablePanels:     Array.isArray(raw.availablePanels) && raw.availablePanels.length
                           ? raw.availablePanels
                           : (raw.roles ?? [raw.role]).filter(Boolean),
    availableSocieties:  Array.isArray(raw.availableSocieties) ? raw.availableSocieties : [],
    activeRole:          raw.activeRole          ?? raw.role,
    dynamic_permissions: raw.dynamic_permissions ?? raw.permissions ?? null,
    permissions:         raw.permissions         ?? raw.dynamic_permissions ?? null,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() =>
    normaliseUser(JSON.parse(localStorage.getItem("user")))
  );

  const [availableSocieties, setAvailableSocieties] = useState(() => {
    const cachedUser = JSON.parse(localStorage.getItem("user"));
    return Array.isArray(cachedUser?.availableSocieties) ? cachedUser.availableSocieties : [];
  });

  const fetchSocieties = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
      const res = await API.get("/auth/societies");
      if (res.data?.societies && Array.isArray(res.data.societies)) {
        const list = res.data.societies;
        setAvailableSocieties(list);
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, availableSocieties: list };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        return list;
      }
    } catch (err) {
      console.warn("[AuthContext] Could not fetch societies:", err?.message);
    }
    return [];
  }, []);

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

  // Fetch latest dynamic permissions and societies on mount
  useEffect(() => {
    if (localStorage.getItem("token")) {
      refreshPermissions();
      fetchSocieties();
      // Open the authenticated socket connection. The handshake carries the
      // stored JWT, so the server can assign the correct rooms.
      connectSocket();
    }
  }, [refreshPermissions, fetchSocieties]);

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
    if (String(normalised.activeRole || normalised.role || "").toUpperCase() !== "SUPER_ADMIN") {
      localStorage.removeItem("superadmin_society_filter");
    }
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalised));
    setUser(normalised);
    if (normalised.availableSocieties) {
      setAvailableSocieties(normalised.availableSocieties);
    }
    // ✅ localStorage is now updated — joinRooms() will read the new user
    rejoinSocket();
    refreshPermissions();
    fetchSocieties();
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAvailableSocieties([]);
    // Drop the authenticated connection — the socket handshake carries the JWT.
    disconnectSocket();
  };

  const updateUser = useCallback((updatedFields) => {
    const merged = normaliseUser({ ...user, ...updatedFields });
    localStorage.setItem("user", JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  const switchRole = async (role) => {
    const res = await API.post("/auth/switch-role", { role });
    const { token, user: updatedUser } = res.data;

    localStorage.setItem("token", token);
    const normalised = normaliseUser(updatedUser);
    if (String(normalised.activeRole || normalised.role || "").toUpperCase() !== "SUPER_ADMIN") {
      localStorage.removeItem("superadmin_society_filter");
    }
    localStorage.setItem("user", JSON.stringify(normalised));
    setUser(normalised);
    // ✅ Re-join with new activeRole so server rooms update immediately
    rejoinSocket();
    await refreshPermissions();

    return { success: true, user: normalised };
  };

  const switchSociety = async (societyId) => {
    const res = await API.post("/auth/switch-society", { society_id: societyId });
    const { token, user: updatedUser, availableSocieties: freshSocieties } = res.data;

    localStorage.setItem("token", token);
    const normalised = normaliseUser(updatedUser);
    if (freshSocieties && Array.isArray(freshSocieties)) {
      normalised.availableSocieties = freshSocieties;
      setAvailableSocieties(freshSocieties);
    }
    localStorage.setItem("user", JSON.stringify(normalised));
    setUser(normalised);
    // ✅ Re-join socket rooms for new society & role
    rejoinSocket();
    await refreshPermissions();

    return { success: true, user: normalised };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        availableSocieties,
        login,
        logout,
        updateUser,
        switchRole,
        switchSociety,
        fetchSocieties,
        refreshPermissions,
        syncProfilePicture,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
