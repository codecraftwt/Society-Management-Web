

import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const DASHBOARD_ROUTES = {
  SUPER_ADMIN: "/superadmin",
  SOCIETY_ADMIN: "/admin",
  COMMITTEE_MEMBER: "/committee",
  GUARD: "/guard",
  ACCOUNTANT: "/accountant",
  FAMILY_MEMBER: "/family",
  RESIDENT: "/resident",
};

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