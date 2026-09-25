import { MdCheckCircle, MdDelete, MdSchedule, MdVisibility } from "react-icons/md";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalButton from "../../components/common/GlobalButton";
import { hasPermission } from "../../utils/permissions";

export function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export const Label = ({ children }) => (
  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">{children}</label>
);

export function BillStatus({ status, t, variant }) {
  if (variant === "accountant") {
    if (status === "PAID")
      return <GlobalBadge variant="success" icon={MdCheckCircle}>{t("billPaid") || "Paid"}</GlobalBadge>;
    if (status === "PENDING_VERIFICATION")
      return <GlobalBadge variant="info" icon={MdSchedule}>Awaiting Confirmation</GlobalBadge>;
    return <GlobalBadge variant="warning" icon={MdSchedule}>{t("billPending") || "Pending"}</GlobalBadge>;
  }
  if (status === "PAID")
    return <span className="bill-pill-paid"><MdCheckCircle size={12} /> {t("billPaid") || "Paid"}</span>;
  if (status === "PENDING_VERIFICATION")
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
        <MdSchedule size={12} /> Awaiting Confirmation
      </span>
    );
  return <span className="bill-pill-pending"><MdSchedule size={12} /> {t("billPending") || "Pending"}</span>;
}

export function AdminRowActions({ bill, confirmDeleteId, setConfirmDeleteId, handleDeleteBill, deletingId, handleConfirmPayment, confirmingId, t, canEdit = true, canDelete = true, authUser, showUnauthorized }) {
  const onTriggerConfirmPayment = (id) => {
    if (!hasPermission(authUser, "manage_bills", "edit")) {
      showUnauthorized("You do not have permission to confirm bill payments.");
      return;
    }
    handleConfirmPayment(id);
  };

  const onTriggerDelete = (id) => {
    if (!hasPermission(authUser, "manage_bills", "delete")) {
      showUnauthorized("You do not have permission to delete bills.");
      return;
    }
    setConfirmDeleteId(id);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && bill.status === "PENDING_VERIFICATION" && (
        <button
          onClick={() => onTriggerConfirmPayment(bill.id)}
          disabled={confirmingId === bill.id}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1 shadow-sm shrink-0"
          title="Confirm resident payment and send Web/Mobile notification"
        >
          <MdCheckCircle size={13} /> {confirmingId === bill.id ? "Confirming..." : "Confirm Payment"}
        </button>
      )}

      {canDelete && (
        confirmDeleteId === bill.id ? (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="text-xs text-secondary">{t("billSure")}</span>
            <button className="btn-delete-confirm" onClick={() => handleDeleteBill(bill.id)} disabled={deletingId === bill.id}>
              {deletingId === bill.id ? <Spinner /> : t("billYesDelete")}
            </button>
            <button className="btn-cancel-sm" onClick={() => setConfirmDeleteId(null)}>{t("cancel")}</button>
          </div>
        ) : (
          <button className="btn-delete" onClick={() => onTriggerDelete(bill.id)}>
            <MdDelete size={13} /> {t("billDelete")}
          </button>
        )
      )}
    </div>
  );
}

export function AccountantRowActions({ bill, onDetailsClick, onDeleteClick, handleConfirmPayment, confirmingId, t }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <GlobalButton
        variant="view"
        size="sm"
        icon={MdVisibility}
        onClick={() => onDetailsClick(bill)}
        title="View Bill & Payment Details"
      >
        Details
      </GlobalButton>

      {bill.status === "PENDING_VERIFICATION" && (
        <GlobalButton
          variant="primary"
          size="sm"
          icon={MdCheckCircle}
          loading={confirmingId === bill.id}
          onClick={() => handleConfirmPayment(bill.id)}
          title="Confirm resident payment and send Web/Mobile notification"
        >
          {confirmingId === bill.id ? "Confirming..." : "Confirm"}
        </GlobalButton>
      )}

      {bill.status !== "PAID" && (
        <GlobalButton
          variant="delete"
          size="sm"
          icon={MdDelete}
          onClick={() => onDeleteClick(bill.id)}
        >
          {t("billDelete") || "Delete"}
        </GlobalButton>
      )}
    </div>
  );
}

export function StatCards({ isMobile, stats }) {
  return (
    <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
      {stats.map((s, i) => {
        const Icon = s.Icon;
        return (
          <div key={i} className={`${isMobile ? "stat-card--mobile" : "stat-card"} stat-card--${s.color} ${s.extra}`}>
            {isMobile ? (
              <>
                <div className="stat-card__icon mb-1"><Icon size={20} /></div>
                <div className="stat-card__val">{s.val}</div>
                <div className="stat-card__label">{s.label}</div>
              </>
            ) : (
              <>
                <div>
                  <div className="stat-card__val">{s.val}</div>
                  <div className="stat-card__label">{s.label}</div>
                </div>
                <div className="stat-card__icon"><Icon size={20} /></div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}