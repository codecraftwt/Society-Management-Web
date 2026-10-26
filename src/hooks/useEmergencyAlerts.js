import { useEffect, useState } from "react";
import API from "../services/api";

const listeners = new Set();
let timer = null;
let request = null;

async function loadAlerts() {
  if (request) return request;
  request = API.get("/emergency/active")
    .then((res) => (Array.isArray(res.data) ? res.data : []))
    .catch(() => [])
    .then((alerts) => {
      listeners.forEach((listener) => listener(alerts));
      return alerts;
    })
    .finally(() => {
      request = null;
    });
  return request;
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    loadAlerts();
    timer = window.setInterval(loadAlerts, 5000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export default function useEmergencyAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => subscribe(setAlerts), []);

  return { alerts, refresh: loadAlerts };
}
