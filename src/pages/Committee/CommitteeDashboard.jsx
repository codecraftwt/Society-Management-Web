import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  MdPeople, MdCampaign, MdReportProblem, MdAccountBalance,
  MdVisibility, MdTrendingUp, MdCheckCircle, MdWarning,
} from "react-icons/md";

export default function CommitteeDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeNotices: 0,
    pendingComplaints: 0,
    overduePayments: 0,
    totalVisitors: 0,
    resolvedComplaints: 0,
    totalRevenue: 0,
    pendingBills: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await API.get("/committee/dashboard-stats");
      setStats(res.data || {});
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { icon: MdPeople, label: "Total Residents", value: stats.totalResidents, color: "blue" },
    { icon: MdCampaign, label: "Active Notices", value: stats.activeNotices, color: "purple" },
    { icon: MdReportProblem, label: "Pending Complaints", value: stats.pendingComplaints, color: "amber" },
    { icon: MdAccountBalance, label: "Overdue Payments", value: stats.overduePayments, color: "red" },
    { icon: MdVisibility, label: "Today's Visitors", value: stats.totalVisitors, color: "teal" },
    { icon: MdCheckCircle, label: "Resolved Complaints", value: stats.resolvedComplaints, color: "green" },
    { icon: MdTrendingUp, label: "Revenue Collected", value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, color: "indigo" },
    { icon: MdWarning, label: "Pending Bills", value: stats.pendingBills, color: "orange" },
  ];

  const quickActions = [
    { label: "Post a Notice", path: "/committee/notices", icon: "📢" },
    { label: "Assign Complaint", path: "/committee/complaints", icon: "🔧" },
    { label: "Generate Bill", path: "/committee/manage-bills", icon: "📄" },
    { label: "View Visitor Log", path: "/committee/visitor-logs", icon: "👤" },
  ];

  return (
    <div className="comm-root">
      <div className="comm-page-header">
        <div>
          <h1 className="comm-page-title">Committee Dashboard</h1>
          <p className="comm-page-subtitle">Society operations overview</p>
        </div>
      </div>

      {loading ? (
        <div className="comm-loading">
          <div className="comm-spinner" />
          Loading dashboard…
        </div>
      ) : (
        <div className="comm-stats-grid">
          {cards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`comm-stat-card comm-stat-card--${color}`}>
              <div className={`comm-stat-icon comm-stat-icon--${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="comm-stat-val">{value ?? 0}</p>
                <p className="comm-stat-label">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="comm-quick-links">
        <h2 className="comm-section-title">Quick Actions</h2>
        <div className="comm-quick-grid">
          {quickActions.map(({ label, path, icon }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="comm-quick-card"
            >
              <span className="comm-quick-icon">{icon}</span>
              <span className="comm-quick-label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}