import { MdCheckCircle, MdPending, MdSchedule } from "react-icons/md";

export function Spinner({ small = false }) {
  const s = small ? 14 : 16;
  return (
    <svg className="animate-spin" style={{ color: "currentColor", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export function StatusPill({ status, t }) {
  const cfg = {
    RESOLVED:    { key: "compStatusResolved",   Icon: MdCheckCircle, cls: "status-pill--resolved"   },
    IN_PROGRESS: { key: "compStatusInProgress", Icon: MdSchedule,    cls: "status-pill--inprogress" },
    PENDING:     { key: "compStatusPending",    Icon: MdPending,     cls: "status-pill--pending"     },
    OPEN:        { key: "compStatusPending",    Icon: MdPending,     cls: "status-pill--pending"     },
  };
  const c = cfg[status] || cfg.PENDING;
  return (
    <span className={`status-pill ${c.cls}`}>
      <c.Icon size={12} /> {t(c.key)}
    </span>
  );
}