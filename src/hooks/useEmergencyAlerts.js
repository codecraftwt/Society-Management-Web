/**
 * Shared Emergency Alerts Store & Hook for Web
 * src/hooks/useEmergencyAlerts.js
 *
 * Replaces 5-second automatic polling of /emergency/active with event-driven
 * Socket.IO updates while maintaining controlled initial hydration, single
 * in-flight request deduplication, and coordinated reconnection recovery.
 */

import { useEffect, useState } from "react";
import API from "../services/api";
import { getSocket } from "../services/socket";

// ── Shared Store State (Singleton across layouts & components) ───────────────
let activeAlerts = [];
const listeners = new Set();
let inFlightPromise = null;
let hasHydrated = false;
let currentScopeKey = null;
const resolvedAlertIds = new Set();
let socketSubscribed = false;
let teardownTimer = null;
let isRecovering = false;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getScopeKey() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const user = getStoredUser();
  return user?.id ? `${user.id}_${user.society_id || "global"}` : token;
}

/**
 * Normalizes an alert from either the REST API (/emergency/active)
 * or a Socket.IO event (emergency_alert).
 */
export function normalizeEmergency(item) {
  if (!item) return null;
  const rawId = item.id != null ? item.id : item.alertId;
  if (rawId == null) return null;
  const id = Number(rawId) || rawId;
  const alertId = String(rawId);

  // Normalize alert type (e.g. FIRE, MEDICAL) without getting stuck on "EMERGENCY"
  const type =
    item.alert_type && item.alert_type !== "EMERGENCY"
      ? item.alert_type
      : item.type && item.type !== "EMERGENCY"
      ? item.type
      : item.emergency_type || "OTHER";

  const flatNumber =
    item.Flat?.flat_number || item.flatNumber || item.flat_number || "";
  const blockName =
    item.Flat?.Block?.name || item.blockName || item.block_name || "";

  return {
    ...item,
    id,
    alertId,
    type,
    alert_type: type,
    status: item.status || "ACTIVE",
    message: item.message || item.title || "",
    other_reason: item.other_reason || "",
    source: item.source || (item.guard_id ? "GUARD" : "RESIDENT"),
    society_id: item.society_id || item.societyId || null,
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    Flat:
      item.Flat ||
      (flatNumber
        ? {
            flat_number: flatNumber,
            Block: blockName ? { name: blockName } : null,
          }
        : null),
    Resident:
      item.Resident ||
      (item.senderName
        ? { name: item.senderName, phone: item.senderPhone }
        : null),
    Guard: item.Guard || null,
  };
}

function notifyListeners() {
  const snapshot = [...activeAlerts];
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error("[useEmergencyAlerts] listener error:", err);
    }
  });
}

/**
 * Reset store state completely (e.g. on logout or society switch)
 */
export function resetEmergencyAlertStore() {
  activeAlerts = [];
  hasHydrated = false;
  inFlightPromise = null;
  currentScopeKey = null;
  resolvedAlertIds.clear();
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }
  detachSocketListeners();
  notifyListeners();
}

/**
 * Fetch active alerts from API with strict request deduplication.
 * Reuses in-flight promise if one is already running.
 */
export async function loadAlerts(options = {}) {
  const { force = false } = options;

  const token = localStorage.getItem("token");
  if (!token) {
    if (activeAlerts.length > 0) {
      activeAlerts = [];
      notifyListeners();
    }
    return [];
  }

  // Detect session/society change
  const scopeKey = getScopeKey();
  if (scopeKey !== currentScopeKey) {
    currentScopeKey = scopeKey;
    hasHydrated = false;
    activeAlerts = [];
    resolvedAlertIds.clear();
    notifyListeners();
  }

  // If already hydrated and this is not a force-refresh (e.g. initial mount of another component), return current
  if (hasHydrated && !force) {
    return activeAlerts;
  }

  // Concurrent request deduplication: return the single in-flight promise
  if (inFlightPromise) {
    return inFlightPromise;
  }

  const requestStartTime = Date.now();

  inFlightPromise = API.get("/emergency/active")
    .then((res) => {
      const raw = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data && Array.isArray(res.data.data)
        ? res.data.data
        : [];

      const normalizedList = raw
        .map(normalizeEmergency)
        .filter(Boolean)
        .filter((a) => a.status === "ACTIVE" && !resolvedAlertIds.has(String(a.id)));

      // Reconcile: merge any socket alerts that arrived during this fetch
      const mergedMap = new Map();
      normalizedList.forEach((a) => mergedMap.set(String(a.id), a));

      activeAlerts.forEach((existing) => {
        const idKey = String(existing.id);
        if (!resolvedAlertIds.has(idKey)) {
          if (!mergedMap.has(idKey)) {
            // Keep if received via socket after or during this fetch
            if (existing._receivedAt && existing._receivedAt >= requestStartTime) {
              mergedMap.set(idKey, existing);
            }
          }
        }
      });

      activeAlerts = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
      );
      hasHydrated = true;
      notifyListeners();
      return activeAlerts;
    })
    .catch((err) => {
      console.warn("[useEmergencyAlerts] Failed to fetch active emergencies:", err?.message || err);
      return activeAlerts;
    })
    .finally(() => {
      inFlightPromise = null;
    });

  return inFlightPromise;
}

// ── Socket Event Handlers ───────────────────────────────────────────────────
function handleEmergencyAlert(payload) {
  const normalized = normalizeEmergency(payload);
  if (!normalized) return;

  const idKey = String(normalized.id);

  // If already resolved, ignore or remove
  if (resolvedAlertIds.has(idKey) || normalized.status === "RESOLVED") {
    const beforeCount = activeAlerts.length;
    activeAlerts = activeAlerts.filter((a) => String(a.id) !== idKey);
    if (activeAlerts.length !== beforeCount) {
      notifyListeners();
    }
    return;
  }

  normalized._receivedAt = Date.now();

  const existingIndex = activeAlerts.findIndex((a) => String(a.id) === idKey);
  if (existingIndex >= 0) {
    // Update existing alert with newer payload
    activeAlerts = [
      ...activeAlerts.slice(0, existingIndex),
      { ...activeAlerts[existingIndex], ...normalized },
      ...activeAlerts.slice(existingIndex + 1),
    ];
  } else {
    // Prepend new alert
    activeAlerts = [normalized, ...activeAlerts];
  }

  notifyListeners();
}

function handleEmergencyResolved(payload) {
  const rawId = payload?.id != null ? payload.id : payload?.alertId;
  if (!rawId) return;
  const idKey = String(rawId);

  resolvedAlertIds.add(idKey);
  const beforeCount = activeAlerts.length;
  activeAlerts = activeAlerts.filter((a) => String(a.id) !== idKey);
  if (activeAlerts.length !== beforeCount) {
    notifyListeners();
  }
}

function handleSocketConnect() {
  // Reconnection recovery: if already hydrated, perform at most ONE coordinated sync fetch
  if (hasHydrated && !isRecovering) {
    isRecovering = true;
    loadAlerts({ force: true }).finally(() => {
      setTimeout(() => {
        isRecovering = false;
      }, 500);
    });
  }
}

function attachSocketListeners() {
  if (socketSubscribed) return;
  const socket = getSocket();
  if (!socket) return;

  socket.on("emergency_alert", handleEmergencyAlert);
  socket.on("emergency_resolved", handleEmergencyResolved);
  socket.on("connect", handleSocketConnect);
  socketSubscribed = true;
}

function detachSocketListeners() {
  if (!socketSubscribed) return;
  const socket = getSocket();
  if (socket) {
    socket.off("emergency_alert", handleEmergencyAlert);
    socket.off("emergency_resolved", handleEmergencyResolved);
    socket.off("connect", handleSocketConnect);
  }
  socketSubscribed = false;
}

export function subscribe(listener) {
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }

  listeners.add(listener);
  listener([...activeAlerts]);

  // First subscriber activates socket subscription and triggers initial fetch
  if (listeners.size === 1) {
    attachSocketListeners();
    loadAlerts({ force: false });
  } else if (!hasHydrated) {
    loadAlerts({ force: false });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      // Delay cleanup by 100ms to gracefully handle React StrictMode mount/cleanup/remount
      // and fast route transitions without tearing down socket listeners or aborting in-flight requests
      teardownTimer = setTimeout(() => {
        if (listeners.size === 0) {
          detachSocketListeners();
        }
        teardownTimer = null;
      }, 100);
    }
  };
}

/**
 * Public hook used by AdminLayout, GuardLayout, ResidentLayout,
 * AccountantLayout, GuardDashboard, etc.
 */
export default function useEmergencyAlerts() {
  const [alerts, setAlerts] = useState(() => [...activeAlerts]);

  useEffect(() => {
    return subscribe(setAlerts);
  }, []);

  return {
    alerts,
    refresh: () => loadAlerts({ force: true }),
  };
}
