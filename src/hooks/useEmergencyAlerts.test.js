import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Polyfill localStorage for node environment
const storageMap = new Map();
globalThis.localStorage = {
  getItem: vi.fn((key) => storageMap.get(key) ?? null),
  setItem: vi.fn((key, val) => storageMap.set(key, String(val))),
  removeItem: vi.fn((key) => storageMap.delete(key)),
  clear: vi.fn(() => storageMap.clear()),
};

// Mock socket and API before importing useEmergencyAlerts
const socketListeners = new Map();
const mockSocket = {
  on: vi.fn((event, cb) => {
    if (!socketListeners.has(event)) socketListeners.set(event, new Set());
    socketListeners.get(event).add(cb);
  }),
  off: vi.fn((event, cb) => {
    if (socketListeners.has(event)) {
      socketListeners.get(event).delete(cb);
    }
  }),
  emit: vi.fn(),
  connected: true,
};

function triggerSocketEvent(event, data) {
  if (socketListeners.has(event)) {
    socketListeners.get(event).forEach((cb) => cb(data));
  }
}

vi.mock("../services/socket", () => ({
  getSocket: () => mockSocket,
  rejoinSocket: vi.fn(),
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

let apiGetMock;
vi.mock("../services/api", () => ({
  default: {
    get: vi.fn((...args) => apiGetMock(...args)),
  },
}));

import {
  subscribe,
  loadAlerts,
  resetEmergencyAlertStore,
  normalizeEmergency,
} from "./useEmergencyAlerts";

describe("useEmergencyAlerts - Socket.IO synchronization & anti-polling", () => {
  let unsubscribes = [];

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem("token", "test-token");
    localStorage.setItem("user", JSON.stringify({ id: 1, society_id: 10, role: "ADMIN" }));

    socketListeners.clear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    unsubscribes = [];

    apiGetMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 101,
          type: "FIRE",
          message: "Fire in Tower A",
          status: "ACTIVE",
          created_at: "2026-10-28T10:00:00.000Z",
        },
      ],
    });

    resetEmergencyAlertStore();
  });

  afterEach(() => {
    unsubscribes.forEach((unsub) => unsub());
    resetEmergencyAlertStore();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("1. Initial subscription triggers exactly one effective active-emergency fetch", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(apiGetMock).toHaveBeenCalledWith("/emergency/active");

    await vi.runAllTimersAsync();

    expect(currentAlerts).toHaveLength(1);
    expect(currentAlerts[0].id).toBe(101);
  });

  it("2. Keeping page open for at least 30 seconds produces no automatic 5-second polling", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    // Advance time by 35 seconds
    vi.advanceTimersByTime(35000);
    await vi.runAllTimersAsync();

    // Still exactly 1 call — absolutely NO periodic polling interval!
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(currentAlerts).toHaveLength(1);
  });

  it("3. Multiple layouts consuming the shared state do not create duplicate requests", async () => {
    let alerts1 = [];
    let alerts2 = [];
    let alerts3 = [];

    const unsub1 = subscribe((a) => { alerts1 = a; });
    const unsub2 = subscribe((a) => { alerts2 = a; });
    const unsub3 = subscribe((a) => { alerts3 = a; });
    unsubscribes.push(unsub1, unsub2, unsub3);

    await vi.runAllTimersAsync();

    // All three subscribers received the same data from a single request
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(alerts1).toHaveLength(1);
    expect(alerts2).toHaveLength(1);
    expect(alerts3).toHaveLength(1);
  });

  it("4. Rapid subscribe/unsubscribe cycles (StrictMode / route flip) do not cause duplicate requests", async () => {
    // Component mounts
    const unsub1 = subscribe(() => {});
    // Component unmounts in StrictMode
    unsub1();
    // Component immediately remounts within microtask/100ms
    let finalAlerts = [];
    const unsub2 = subscribe((a) => { finalAlerts = a; });
    unsubscribes.push(unsub2);

    await vi.runAllTimersAsync();

    // Exactly 1 fetch
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(finalAlerts).toHaveLength(1);
  });

  it("5. A new emergency appears immediately via Socket.IO without polling", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();
    expect(currentAlerts).toHaveLength(1);

    // Trigger emergency_alert socket event from server
    triggerSocketEvent("emergency_alert", {
      alertId: "102",
      type: "MEDICAL",
      message: "Medical emergency on 4th floor",
      status: "ACTIVE",
      senderName: "Ramesh",
      flatNumber: "402",
      blockName: "A",
    });

    // Immediately present without any new API fetch
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(currentAlerts).toHaveLength(2);
    expect(currentAlerts[0].id).toBe(102);
    expect(currentAlerts[0].type).toBe("MEDICAL");
    expect(currentAlerts[0].Flat.flat_number).toBe("402");
  });

  it("6. A resolved emergency disappears immediately via Socket.IO without polling", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();
    expect(currentAlerts).toHaveLength(1);
    expect(currentAlerts[0].id).toBe(101);

    // Trigger emergency_resolved socket event
    triggerSocketEvent("emergency_resolved", {
      id: 101,
      alertId: "101",
      status: "RESOLVED",
    });

    // Immediately removed without any new API fetch
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(currentAlerts).toHaveLength(0);
  });

  it("7. Duplicate socket events do not duplicate alerts", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();

    // Emit duplicate alerts
    triggerSocketEvent("emergency_alert", {
      id: 200,
      type: "SECURITY",
      message: "Gate breach",
      status: "ACTIVE",
    });
    triggerSocketEvent("emergency_alert", {
      id: 200,
      type: "SECURITY",
      message: "Gate breach confirmed",
      status: "ACTIVE",
    });

    // Exactly 1 new alert added (2 total), with updated message
    expect(currentAlerts).toHaveLength(2);
    const alert200 = currentAlerts.find((a) => String(a.id) === "200");
    expect(alert200.message).toBe("Gate breach confirmed");
  });

  it("8. Navigation and component remounts do not trigger unnecessary fetches", async () => {
    // Screen A mounts
    const unsubA = subscribe(() => {});
    await vi.runAllTimersAsync();
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    // Navigate: Screen A unmounts, Screen B mounts
    unsubA();
    let alertsB = [];
    const unsubB = subscribe((a) => { alertsB = a; });
    unsubscribes.push(unsubB);

    await vi.runAllTimersAsync();

    // No extra fetch was made
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(alertsB).toHaveLength(1);
  });

  it("9. Reconnection causes exactly one coordinated recovery fetch", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    apiGetMock.mockResolvedValueOnce({
      data: [
        {
          id: 103,
          type: "GAS_LEAK",
          message: "Gas leak detected",
          status: "ACTIVE",
        },
      ],
    });

    // Simulate socket reconnect events (rapid bounce)
    triggerSocketEvent("connect");
    triggerSocketEvent("connect");

    await vi.runAllTimersAsync();

    // Coordinated into exactly 1 recovery fetch (total 2 fetches: initial + recovery)
    expect(apiGetMock).toHaveBeenCalledTimes(2);
    expect(currentAlerts[0].id).toBe(103);
  });

  it("10. Manual refresh works and concurrent refresh calls are deduplicated", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    let resolveFetch;
    apiGetMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    // Trigger two concurrent manual refreshes
    const p1 = loadAlerts({ force: true });
    const p2 = loadAlerts({ force: true });

    expect(apiGetMock).toHaveBeenCalledTimes(2);

    resolveFetch({
      data: [
        { id: 105, type: "FLOOD", message: "Basement flood", status: "ACTIVE" },
      ],
    });

    await Promise.all([p1, p2]);
    await vi.runAllTimersAsync();

    expect(currentAlerts).toHaveLength(1);
    expect(currentAlerts[0].id).toBe(105);
  });

  it("11. Society switching and logout/login do not expose stale or unauthorized alerts", async () => {
    let currentAlerts = [];
    const unsub = subscribe((alerts) => {
      currentAlerts = alerts;
    });
    unsubscribes.push(unsub);

    await vi.runAllTimersAsync();
    expect(currentAlerts).toHaveLength(1);
    expect(currentAlerts[0].id).toBe(101);

    // Simulate society switch: change stored user to society 20 and reset store
    localStorage.setItem("user", JSON.stringify({ id: 1, society_id: 20, role: "ADMIN" }));

    apiGetMock.mockResolvedValueOnce({
      data: [
        { id: 999, type: "SECURITY", message: "Society 20 alert", status: "ACTIVE" },
      ],
    });

    resetEmergencyAlertStore();
    expect(currentAlerts).toHaveLength(0);

    // Next fetch for new society
    await loadAlerts({ force: true });
    await vi.runAllTimersAsync();

    expect(currentAlerts).toHaveLength(1);
    expect(currentAlerts[0].id).toBe(999);
    expect(currentAlerts.find((a) => a.id === 101)).toBeUndefined();
  });
});
