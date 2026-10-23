import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  /\/api\/?$/,
  ""
);

/**
 * Shared socket instance for the whole web app.
 *
 * The server authenticates the handshake, so the JWT is attached to every
 * connection attempt (the `auth` callback runs again on each reconnect and
 * therefore picks up a token that was set after the module was loaded).
 *
 * Rooms are assigned by the server from the verified identity. The client may
 * *request* a role/society (role switch, society switch) but the server
 * validates those against the user's actual grants.
 */
const socket = io(SOCKET_URL, {
  autoConnect:          false,
  reconnection:         true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:    1000,
  transports:           ["websocket", "polling"],
  auth: (cb) => {
    cb({
      token: localStorage.getItem("token") || "",
    });
  },
});

let lastSocietyId = null;

/** Read the stored user and ask the server to assign the matching rooms. */
function joinRooms() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;

    if (lastSocietyId && user.society_id && String(lastSocietyId) !== String(user.society_id)) {
      socket.emit("leave_society", lastSocietyId);
      console.log(`[socket] left old society room → society_${lastSocietyId}`);
    }
    lastSocietyId = user.society_id;

    socket.emit("join", {
      role:      user.activeRole ?? user.role,
      societyId: user.society_id,
    });

    console.log("[socket] joined rooms →", {
      user:    `user_${user.id}`,
      role:    `role_${user.activeRole ?? user.role}`,
      society: `society_${user.society_id}`,
    });
  } catch (err) {
    console.warn("[socket] join failed:", err.message);
  }
}

// Join immediately on first connect.
// `connect` is emitted again after every automatic reconnect by socket.io-client,
// so rooms are re-joined without needing a separate "reconnect" listener
// (socket.io-client v4 has no socket-level "reconnect" event).
socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);
  joinRooms();
});

socket.on("disconnect", (reason) => {
  console.warn("[socket] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("[socket] connection error:", err.message);
});

socket.on("join_error", (payload) => {
  console.error("[socket] join rejected:", payload?.message || payload);
});

// Single shared socket instance — reused across the whole app
export const getSocket = () => socket;

/**
 * Re-sync the socket with the current session.
 *
 * Connects when offline and re-joins the rooms so a role or society switch
 * takes effect immediately. The handshake token is read fresh by the `auth`
 * callback, so a token refresh needs a reconnect, not just a re-join.
 */
export function rejoinSocket() {
  if (!socket.connected) {
    socket.connect();
    return;
  }
  joinRooms();
}

/**
 * Connect the socket if a session is present.
 *
 * `autoConnect` is disabled so the app never opens an unauthenticated
 * connection (the server rejects those); the handshake only carries a token
 * once the user has logged in.
 */
export function connectSocket() {
  if (socket.connected) return;
  if (!localStorage.getItem("token")) return;
  socket.connect();
}

/** Tear the socket down, e.g. on logout. */
export function disconnectSocket() {
  socket.disconnect();
}

export default socket;
