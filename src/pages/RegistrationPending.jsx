

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import socket from "../services/socket";   // default export — the shared singleton

/* ─── Scoped styles ─── */
const STYLES = `
  .rp-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--bg-main, #0f1117);
  }

  .rp-card {
    width: 100%;
    max-width: 420px;
    background: var(--card-bg, rgba(255,255,255,0.04));
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    padding: 1.5rem 1.25rem 1.5rem;
    box-shadow: 0 8px 40px rgba(0,0,0,0.4);
    backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.1rem;
    text-align: center;
  }
  @media (min-width: 480px) {
    .rp-card { padding: 2.5rem 2rem 2rem; }
  }
  html.light .rp-card {
    background: #ffffff;
    border-color: #E2E1E4;
    box-shadow: 0 4px 32px rgba(0,0,0,0.10);
  }

  .rp-icon {
    font-size: 3.2rem;
    line-height: 1;
    margin-bottom: 0.2rem;
  }

  .rp-title {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text-primary, #EDECF0);
    letter-spacing: -0.02em;
    margin: 0;
  }
  html.light .rp-title { color: #38363C; }

  .rp-badge {
    display: inline-block;
    padding: 3px 14px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .rp-message {
    font-size: 0.88rem;
    line-height: 1.7;
    color: var(--text-secondary, #A39EB2);
    margin: 0;
    max-width: 340px;
  }
  html.light .rp-message { color: #8C8795; }

  .rp-reason-box {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    text-align: left;
    font-size: 0.84rem;
    line-height: 1.6;
    color: #fca5a5;
  }
  html.light .rp-reason-box {
    background: #fef2f2;
    border-color: #fecaca;
    color: #b91c1c;
  }
  .rp-reason-label {
    font-weight: 700;
    display: block;
    margin-bottom: 4px;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rp-btn-primary {
    width: 100%;
    height: 46px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 0.92rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #6B46C1 0%, #5B8DEF 100%);
    color: #fff;
    box-shadow: 0 4px 18px rgba(107,70,193,0.38);
    transition: opacity 0.2s, transform 0.15s;
    text-decoration: none;
  }
  .rp-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

  .rp-btn-ghost {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.83rem;
    color: var(--text-secondary, #A39EB2);
    text-decoration: underline;
    padding: 0;
    transition: color 0.2s;
  }
  .rp-btn-ghost:hover { color: var(--text-primary, #EDECF0); }
  html.light .rp-btn-ghost:hover { color: #38363C; }

  .rp-poll-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #6B46C1;
    animation: rpPulse 1.4s ease-in-out infinite;
  }
  .rp-poll-dot:nth-child(2) { animation-delay: 0.2s; }
  .rp-poll-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes rpPulse {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40%           { transform: scale(1.1); opacity: 1;   }
  }
  .rp-poll-row {
    display: flex; align-items: center; gap: 5px;
    justify-content: center;
  }
  .rp-poll-text {
    font-size: 0.78rem;
    color: var(--text-secondary, #A39EB2);
    margin-left: 4px;
  }
`;

/* ─── Status config ─── */
const STATUS_CFG = {
  PENDING: {
    emoji:    "⏳",
    badgeClr: "#f59e0b",
    badgeBg:  "rgba(245,158,11,0.12)",
    label:    "Pending Review",
  },
  APPROVED: {
    emoji:    "🎉",
    badgeClr: "#22c55e",
    badgeBg:  "rgba(34,197,94,0.12)",
    label:    "Approved",
  },
  REJECTED: {
    emoji:    "❌",
    badgeClr: "#ef4444",
    badgeBg:  "rgba(239,68,68,0.12)",
    label:    "Not Approved",
  },
};

function RegistrationPending() {
  const navigate = useNavigate();
  const location = useLocation();

  /* userId is passed via navigate state from Register.jsx */
  const userId = location.state?.userId;

  const [status,          setStatus]          = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState(null);
  const [loading,         setLoading]         = useState(true);

  /* Keep interval ref so socket handler can clear it */
  const intervalRef = useRef(null);

  /* ── Helper: apply whatever the server returns ── */
  const applyStatusUpdate = ({ approval_status, rejection_reason }) => {
    setStatus(approval_status);
    setRejectionReason(rejection_reason || null);
    setLoading(false);

    /* Stop polling once a final decision is reached */
    if (approval_status === "APPROVED" || approval_status === "REJECTED") {
      clearInterval(intervalRef.current);
    }
  };

  /* ═══════════════════════════════════════════
     POLL — fallback for when socket is not
     available (background tab, network issues)
  ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        /* ✅ FIXED: was /auth/check-status (404). Correct route is /auth/approval-status */
        const res = await API.get(`/auth/approval-status/${userId}`);
        applyStatusUpdate(res.data);
      } catch (err) {
        console.error("[RegistrationPending] Status poll failed:", err);
        setLoading(false);
      }
    };

    /* Run immediately, then every 4 s */
    checkStatus();
    intervalRef.current = setInterval(checkStatus, 4000);

    return () => clearInterval(intervalRef.current);
  }, [userId]);

  /* ═══════════════════════════════════════════
     SOCKET — instant update pushed by server
     when admin approves or rejects.
     Uses the shared singleton — no new connection.
  ═══════════════════════════════════════════ */
  useEffect(() => {
    if (!userId) return;

    /* Make sure this browser tab is in the correct socket room.
       The socket.js singleton already calls joinRooms() on connect,
       but userId might not be in localStorage yet (user is not logged in),
       so we explicitly join the user room with the userId from route state. */
    socket.emit("join_user_room", userId);

    const handler = (payload) => {
      /* payload: { approval_status, rejection_reason, message } */
      applyStatusUpdate(payload);
    };

    socket.on("approval_status_update", handler);

    return () => {
      socket.off("approval_status_update", handler);
    };
  }, [userId]);

  /* ═══════════════════════════════════════════
     AUTO-REDIRECT 3 s after approval
  ═══════════════════════════════════════════ */
  useEffect(() => {
    if (status !== "APPROVED") return;
    const t = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(t);
  }, [status, navigate]);

  /* ─── Derived UI values ─── */
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  const isDecided = status === "APPROVED" || status === "REJECTED";

  /* ─── No userId guard ─── */
  if (!userId) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="rp-root">
          <div className="rp-card">
            <div className="rp-icon">⚠️</div>
            <h2 className="rp-title">Session expired</h2>
            <p className="rp-message">
              We couldn't find your registration session. Please register again.
            </p>
            <button className="rp-btn-primary" onClick={() => navigate("/register")}>
              Back to Register
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>

      <div className="rp-root">
        <div className="rp-card">

          {/* ── Icon ── */}
          <div className="rp-icon">
            {loading ? "⏳" : cfg.emoji}
          </div>

          {/* ── Title ── */}
          <h2 className="rp-title">Registration Status</h2>

          {/* ── Status badge ── */}
          <span
            className="rp-badge"
            style={{
              color:      cfg.badgeClr,
              background: cfg.badgeBg,
              border:     `1.5px solid ${cfg.badgeClr}44`,
            }}
          >
            {loading ? "Checking…" : cfg.label}
          </span>

          {/* ── Body message ── */}
          {loading && (
            <>
              <div className="rp-poll-row">
                <div className="rp-poll-dot" />
                <div className="rp-poll-dot" />
                <div className="rp-poll-dot" />
                <span className="rp-poll-text">Waiting for response…</span>
              </div>
              <p className="rp-message">
                We're checking your approval status. This page updates automatically.
              </p>
            </>
          )}

          {!loading && status === "PENDING" && (
            <>
              <div className="rp-poll-row">
                <div className="rp-poll-dot" />
                <div className="rp-poll-dot" />
                <div className="rp-poll-dot" />
                <span className="rp-poll-text">Checking every few seconds…</span>
              </div>
              <p className="rp-message">
                Your registration is <strong>pending review</strong> by the society
                admin. You'll be notified as soon as a decision is made — this page
                updates automatically, no need to refresh.
              </p>
            </>
          )}

          {!loading && status === "APPROVED" && (
            <p className="rp-message">
              🎉 <strong style={{ color: "#22c55e" }}>Your account has been approved!</strong>
              <br />
              You can now login and access your dashboard.
              <br />
              <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                Redirecting to login in a moment…
              </span>
            </p>
          )}

          {!loading && status === "REJECTED" && (
            <>
              <p className="rp-message">
                Your registration request was <strong style={{ color: "#ef4444" }}>
                not approved</strong> by the society admin.
              </p>

              {/* ✅ NEW: Show rejection reason if admin provided one */}
              {rejectionReason ? (
                <div className="rp-reason-box">
                  <span className="rp-reason-label">Reason from admin</span>
                  {rejectionReason}
                </div>
              ) : (
                <div className="rp-reason-box">
                  <span className="rp-reason-label">No reason provided</span>
                  Please contact the society admin directly for more information.
                </div>
              )}
            </>
          )}

          {/* ── Action buttons ── */}
          {!loading && isDecided && (
            <>
              <button
                className="rp-btn-primary"
                onClick={() => navigate("/login")}
                style={
                  status === "REJECTED"
                    ? { background: "linear-gradient(135deg,#726988,#605872)", boxShadow: "none" }
                    : {}
                }
              >
                {status === "APPROVED" ? "Go to Login →" : "Back to Login"}
              </button>

              {status === "REJECTED" && (
                <button
                  className="rp-btn-ghost"
                  onClick={() => navigate("/register")}
                >
                  Register with a different flat
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}

export default RegistrationPending;