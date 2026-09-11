

import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { DASHBOARD_ROUTES } from "../constants/app";

export default function PublicRoute({ children }) {
  const { user, logout } = useContext(AuthContext);
  const token    = localStorage.getItem("token");

  if (user && token) {
    const role = user.activeRole ?? user.role;

    if (DASHBOARD_ROUTES[role]) {
      return <Navigate to={DASHBOARD_ROUTES[role]} replace />;
    }

    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
}