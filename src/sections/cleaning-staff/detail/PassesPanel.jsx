import { useState } from "react";
import { toast } from "react-toastify";
import {
  MdConfirmationNumber,
  MdAdd,
  MdContentCopy,
  MdBlock,
  MdCheckCircle,
  MdSchedule,
  MdInfoOutline,
  MdQrCode,
} from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { getErrorMessage, getRequiredDateError } from "../../../utils/validators";
import GlobalButton from "../../../components/common/GlobalButton";
import GlobalBadge from "../../../components/common/GlobalBadge";
import GlobalTable from "../../../components/common/GlobalTable";
import GlobalModal from "../../../components/common/GlobalModal";
import PassQrModal from "./PassQrModal";
import { createPass, revokePass } from "../cleaningStaffService";
import { PASS_STATUS, MAX_SCANS_PER_DAY } from "../constants";
import {
  formatPassCode,
  formatPassValidity,
  formatDateOnly,
  formatDateTimeIST,
  todayIST,
  isRealDateOnly,
} from "../format";

/* Copy-to-clipboard with a graceful fallback for non-secure contexts where
   navigator.clipboard is unavailable. */
async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/* The code is displayed exactly as returned. This only gates a manual copy. */
function PassCode({ code }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const shown = formatPassCode(code);

  const onCopy = async () => {
    const ok = await copyText(shown);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error(t("csCopyFail", "Could not copy the pass code."));
    }
  };

  return (
    <span className="cs-passcode">
      <span>{shown}</span>
      <button
        type="button"
        className="cs-passcode__copy"
        onClick={onCopy}
        aria-label={t("csCopyPassCode", "Copy pass code")}
        title={t("csCopyPassCode", "Copy pass code")}
      >
        {copied ? <MdCheckCircle size={13} /> : <MdContentCopy size={13} />}
      </button>
    </span>
  );
}

/**
 * PassesPanel — Staff Detail → Passes
 *
 * Issues via POST /:id/passes and revokes via PATCH /passes/:passId/revoke.
 * Revocation is never rendered as a delete, and max_scans_per_day is shown as
 * fixed read-only information because the backend pins it.
 */
export default function PassesPanel({ staff, passes, loading, onReload }) {
  const { t } = useLang();

  const [issueOpen, setIssueOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({ valid_date: todayIST(), valid_until: "" });
  const [formError, setFormError] = useState(null);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const isActive = staff?.status === "ACTIVE";

  const openIssue = () => {
    setForm({ valid_date: todayIST(), valid_until: "" });
    setFormError(null);
    setIssueOpen(true);
  };

  const submitIssue = async () => {
    if (!isRealDateOnly(form.valid_date)) {
      setFormError(getRequiredDateError(form.valid_date, t("csValidFrom", "Valid from")));
      return;
    }
    if (form.valid_until && !isRealDateOnly(form.valid_until)) {
      setFormError(getRequiredDateError(form.valid_until, t("csValidTo", "Valid to")));
      return;
    }
    if (form.valid_until && form.valid_until < form.valid_date) {
      setFormError(
        t("csValidRangeErr", "Valid to must be on or after valid from.")
      );
      return;
    }

    setFormError(null);
    setIssuing(true);
    try {
      await createPass(staff.id, {
        valid_date: form.valid_date,
        valid_until: form.valid_until || undefined,
      });
      toast.success(t("csPassIssued", "Pass issued."));
      setIssueOpen(false);
      onReload?.();
    } catch (err) {
      /* 409 = the backend already holds an overlapping active pass. Surface it
         verbatim rather than replacing it with a generic message. */
      toast.error(
        err?.response?.data?.message ||
          getErrorMessage(err, t("csPassIssueFail", "Could not issue a pass."))
      );
    } finally {
      setIssuing(false);
    }
  };

  const openRevoke = (pass) => {
    setRevokeTarget(pass);
    setRevokeReason("");
    setRevokeOpen(true);
  };

  const submitRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokePass(revokeTarget.id, revokeReason);
      toast.success(t("csPassRevoked", "Pass revoked."));
      setRevokeOpen(false);
      setRevokeTarget(null);
      onReload?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("csPassRevokeFail", "Could not revoke the pass.")));
    } finally {
      setRevoking(false);
    }
  };

  const [qrPass, setQrPass] = useState(null);

  const columns = [
    {
      key: "pass_code",
      header: t("csPassCode", "Pass code"),
      render: (row) => <PassCode code={row.pass_code} />,
    },
    {
      key: "validity",
      header: t("csValidity", "Validity"),
      render: (row) => (
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          {formatPassValidity(row)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("csStatus", "Status"),
      render: (row) => <GlobalBadge status={row.status} size="sm" dot />,
    },
    {
      key: "scans",
      header: t("csScansDay", "Scans / day"),
      render: () => (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)" }}>
          {MAX_SCANS_PER_DAY}
        </span>
      ),
    },
    {
      key: "created_at",
      header: t("csIssuedOn", "Issued"),
      render: (row) => (
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          {formatDateOnly(row.created_at?.slice?.(0, 10))}
        </span>
      ),
    },
    {
      key: "revoked",
      header: t("csRevokedInfo", "Revoked"),
      render: (row) =>
        row.status === PASS_STATUS.REVOKED ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {formatDateTimeIST(row.revoked_at)}
            </span>
            {row.revoke_reason && (
              <span style={{ fontSize: 11, color: "var(--text-tertiary, var(--text-secondary))" }}>
                {row.revoke_reason}
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: "var(--text-tertiary, var(--text-secondary))" }}>—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <GlobalButton
            variant="info"
            icon={MdQrCode}
            onClick={(e) => {
              e.stopPropagation?.();
              setQrPass(row);
            }}
          >
            {t("csViewQr", "View QR")}
          </GlobalButton>
          {row.status === PASS_STATUS.ACTIVE && (
            <GlobalButton
              variant="cancel"
              icon={MdBlock}
              onClick={(e) => {
                e.stopPropagation?.();
                openRevoke(row);
              }}
            >
              {t("csRevoke", "Revoke")}
            </GlobalButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="cs-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h4 className="cs-section-title" style={{ margin: 0 }}>
            <MdConfirmationNumber size={14} />
            {t("csPasses", "Passes")}
          </h4>
          <p className="cs-hint" style={{ marginTop: 4 }}>
            {t(
              "csPassesHint",
              "Codes are generated by the server. Scans per day are fixed at {n}.",
              { n: MAX_SCANS_PER_DAY }
            )}
          </p>
        </div>
        <GlobalButton
          variant="add"
          icon={MdAdd}
          onClick={openIssue}
          disabled={!isActive}
          title={
            isActive
              ? undefined
              : t("csIssueLocked", "Passes cannot be issued for inactive staff.")
          }
        >
          {t("csIssuePass", "Issue Pass")}
        </GlobalButton>
      </div>

      {!isActive && (
        <div className="cs-notice" style={{ marginBottom: 12 }}>
          <MdInfoOutline size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {t(
              "csInactiveNoPass",
              "This staff member is INACTIVE, so new passes are blocked. Existing passes below are kept for reference."
            )}
          </span>
        </div>
      )}

      <GlobalTable
        columns={columns}
        data={passes}
        loading={loading}
        rowKey="id"
        compact
        emptyIcon={MdConfirmationNumber}
        emptyMessage={t("csNoPasses", "No passes issued yet")}
        emptySubtext={t(
          "csNoPassesSub",
          "Issue a pass so this staff member can be scanned at the gate."
        )}
      />

      {/* ── Issue pass ─────────────────────────────────────────────────── */}
      <GlobalModal
        isOpen={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={t("csIssuePassTitle", "Issue Pass")}
        subtitle={staff?.name}
        icon={MdConfirmationNumber}
        size="sm"
        showFooter
        submitLabel={t("csIssue", "Issue")}
        cancelLabel={t("cancel", "Cancel")}
        onSubmit={submitIssue}
        submitLoading={issuing}
        submitDisabled={issuing}
        submitIcon={MdConfirmationNumber}
        submitVariant="primary"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cs-field">
            <label className="sa-label">{t("csValidFrom", "Valid from")} *</label>
            <input
              className="input"
              type="date"
              value={form.valid_date}
              onChange={(e) => setForm((p) => ({ ...p, valid_date: e.target.value }))}
            />
          </div>
          <div className="cs-field">
            <label className="sa-label">{t("csValidTo", "Valid to")}</label>
            <input
              className="input"
              type="date"
              value={form.valid_until}
              onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
            />
          </div>
          <div className="cs-notice">
            <MdInfoOutline size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {t(
                "csSingleDayPass",
                "Leave Valid to empty for a single-day pass. Scans per day are fixed at {n} and cannot be edited.",
                { n: MAX_SCANS_PER_DAY }
              )}
            </span>
          </div>
          {formError && <p className="cs-error">{formError}</p>}
        </div>
      </GlobalModal>

      {/* ── Revoke ─────────────────────────────────────────────────────── */}
      {/* A dedicated modal (rather than GlobalConfirmDialog) so the optional
          reason field lives inside the dialog instead of floating behind it. */}
      <GlobalModal
        isOpen={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title={t("csRevokeTitle", "Revoke pass")}
        subtitle={formatPassCode(revokeTarget?.pass_code)}
        icon={MdBlock}
        size="sm"
        showFooter
        submitLabel={t("csConfirmRevoke", "Revoke pass")}
        cancelLabel={t("cancel", "Cancel")}
        onSubmit={submitRevoke}
        submitLoading={revoking}
        submitDisabled={revoking}
        submitIcon={MdBlock}
        submitVariant="delete"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cs-notice">
            <MdInfoOutline size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {t(
                "csRevokeMsg",
                "This pass will stop working at the gate. It is kept in the record's history and is not deleted."
              )}
            </span>
          </div>
          <div className="cs-field">
            <label className="sa-label" style={{ fontSize: 10.5 }}>
              {t("csRevokeReason", "Reason (optional)")}
            </label>
            <input
              className="input"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder={t("csRevokeReasonPlaceholder", "e.g. Staff on leave")}
            />
          </div>
        </div>
      </GlobalModal>

      {/* Expiry is computed by the backend; we only restate its status. */}
      <p className="cs-hint" style={{ marginTop: 10 }}>
        <MdSchedule size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
        {t(
          "csExpiryNote",
          "A pass becomes EXPIRED automatically once its validity window has passed."
        )}
      </p>

      {/* QR Code Modal */}
      <PassQrModal
        isOpen={Boolean(qrPass)}
        onClose={() => setQrPass(null)}
        pass={qrPass}
        staff={staff}
      />
    </div>
  );
}