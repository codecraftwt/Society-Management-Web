
import { io } from "socket.io-client";

const socket = io((import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace("/api", ""), {
  autoConnect:          true,
  reconnection:         true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:    1000,
  transports: ["websocket","polling"],
});

/** Read the stored user and emit "join" so the server assigns rooms. */
function joinRooms() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;

    socket.emit("join", {
      userId:    user.id,
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

// Join immediately on first connect
socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);
  joinRooms();
});

// Re-join after every reconnect (network drop / server restart)
socket.on("reconnect", () => {
  console.log("[socket] reconnected — re-joining rooms");
  joinRooms();
});

socket.on("disconnect", (reason) => {
  console.warn("[socket] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("[socket] connection error:", err.message);
});

// Single shared socket instance — reused across the whole app
export const getSocket = () => socket;
export function rejoinSocket() {
  joinRooms();
}

export default socket;