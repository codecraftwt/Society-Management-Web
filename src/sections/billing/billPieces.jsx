import {
  MdCheckCircle,
  MdDelete,
  MdSchedule,
  MdVisibility,
  MdCheck,
  MdClose,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import GlobalBadge from "../../components/common/GlobalBadge";
import { hasPermission } from "../../utils/permissions";

export function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size, flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        style={{ opacity: 0.25 }}
      />
      <path
        fill="currentColor"
        style={{ opacity: 0.75 }}
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

export const Label = ({ children }) => (
  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
    {children}
  </label>
);

export function BillStatus({ status, t, variant }) {
  if (variant === "accountant") {
    if (status === "PAID")
      return (
        <GlobalBadge variant="success" icon={MdCheckCircle}>
          {t("billPaid") || "Paid"}
        </GlobalBadge>
      );
    if (status === "PENDING_VERIFICATION")
      return (
        <GlobalBadge variant="info" icon={MdSchedule}>
          Awaiting Confirmation
        </GlobalBadge>
      );
    return (
      <GlobalBadge variant="warning" icon={MdSchedule}>
        {t("billPending") || "Pending"}
      </GlobalBadge>
    );
  }
  if (status === "PAID")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/12 text-emerald-500 border border-emerald-500/25">
        <MdCheckCircle size={12} /> {t("billPaid") || "Paid"}
      </span>
    );
  if (status === "PENDING_VERIFICATION")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-blue-500/15 text-blue-500 border border-blue-500/30">
        <MdSchedule size={12} /> Awaiting Confirmation
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30">
      <MdSchedule size={12} /> {t("billPending") || "Pending"}
    </span>
  );
}

/* ── Modern Hierarchical Flat & Wing Cell ── */
export function FlatUnitCell({ flat, block, societyName }) {
  const rawBlock = block?.name || flat?.Block?.name || "";
  const rawFlat = flat?.flat_number ? String(flat.flat_number) : "";

  const displayBlock = rawBlock
    ? (rawBlock.toLowerCase().startsWith("wing") || rawBlock.toLowerCase().startsWith("block")
        ? rawBlock
        : `Wing ${rawBlock}`)
    : "Wing —";

  const displayFlat = rawFlat
    ? (rawFlat.toLowerCase().startsWith("flat") || rawFlat.toLowerCase().startsWith("unit")
        ? rawFlat
        : `Flat ${rawFlat}`)
    : "—";

  return (
    <div className="flex flex-col items-start gap-1 py-0.5 select-none">
      {/* 1. Wing / Block name on TOP */}
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 shadow-2xs">
        <FaBuilding size={9} className="shrink-0 opacity-80" />
        <span>{displayBlock}</span>
      </span>

      {/* 2. Flat name BELOW of that */}
      <span className="text-xs sm:text-sm font-extrabold text-primary pl-0.5 tracking-tight">
        {displayFlat}
      </span>

      {societyName && (
        <span className="text-[10px] font-medium text-secondary truncate max-w-[130px] pl-0.5">
          {societyName}
        </span>
      )}
    </div>
  );
}

/* ── Logo-Only Admin Action Buttons (No column distortion) ── */
export function AdminRowActions({
  bill,
  confirmDeleteId,
  setConfirmDeleteId,
  handleDeleteBill,
  deletingId,
  handleConfirmPayment,
  confirmingId,
  t,
  canEdit = true,
  canDelete = true,
  authUser,
  showUnauthorized,
  onDetailsClick,
}) {
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

  const isConfirming = confirmingId === bill.id;
  const isDeleting = deletingId === bill.id;
  const isPendingVerification = bill.status === "PENDING_VERIFICATION";
  const isConfirmingDelete = confirmDeleteId === bill.id;

  return (
    <div className="inline-flex items-center gap-1.5 justify-end shrink-0">
      {/* Details icon button */}
      {onDetailsClick && (
        <button
          type="button"
          onClick={() => onDetailsClick(bill)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-accent bg-accent/10 border border-accent/25 hover:bg-accent/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
          title="View Bill Details"
        >
          <MdVisibility size={15} />
        </button>
      )}

      {/* Confirm Payment: LOGO ONLY */}
      {canEdit && isPendingVerification && (
        <button
          type="button"
          onClick={() => onTriggerConfirmPayment(bill.id)}
          disabled={isConfirming}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          title={isConfirming ? "Confirming payment…" : "Confirm Resident Payment"}
        >
          {isConfirming ? <Spinner size={14} /> : <MdCheckCircle size={16} />}
        </button>
      )}

      {/* Delete / Delete Confirm: LOGO ONLY */}
      {canDelete && (
        isConfirmingDelete ? (
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-card-inner border border-glass animate-scaleIn">
            <button
              type="button"
              onClick={() => handleDeleteBill(bill.id)}
              disabled={isDeleting}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-red-600 hover:bg-red-700 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
              title="Yes, Delete"
            >
              {isDeleting ? <Spinner size={12} /> : <MdCheck size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-card transition-colors cursor-pointer"
              title="Cancel"
            >
              <MdClose size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onTriggerDelete(bill.id)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            title={t("billDelete") || "Delete Bill"}
          >
            <MdDelete size={15} />
          </button>
        )
      )}
    </div>
  );
}

/* ── Logo-Only Accountant Action Buttons ── */
export function AccountantRowActions({
  bill,
  onDetailsClick,
  onDeleteClick,
  handleConfirmPayment,
  confirmingId,
  t,
}) {
  const isConfirming = confirmingId === bill.id;
  const isPendingVerification = bill.status === "PENDING_VERIFICATION";

  return (
    <div className="inline-flex items-center gap-1.5 justify-end shrink-0">
      {/* Details button (LOGO ONLY) */}
      <button
        type="button"
        onClick={() => onDetailsClick(bill)}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-accent bg-accent/10 border border-accent/25 hover:bg-accent/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
        title="View Bill Details"
      >
        <MdVisibility size={15} />
      </button>

      {/* Confirm Payment (LOGO ONLY) */}
      {isPendingVerification && (
        <button
          type="button"
          onClick={() => handleConfirmPayment(bill.id)}
          disabled={isConfirming}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          title={isConfirming ? "Confirming..." : "Confirm Resident Payment"}
        >
          {isConfirming ? <Spinner size={14} /> : <MdCheckCircle size={16} />}
        </button>
      )}

      {/* Delete button (LOGO ONLY) */}
      {bill.status !== "PAID" && (
        <button
          type="button"
          onClick={() => onDeleteClick(bill.id)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
          title={t("billDelete") || "Delete Bill"}
        >
          <MdDelete size={15} />
        </button>
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