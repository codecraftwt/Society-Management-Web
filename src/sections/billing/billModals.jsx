import { createPortal } from "react-dom";
import { MdCheckCircle, MdDelete, MdHome, MdPayments, MdReceiptLong } from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import Select from "../../components/common/Select";
import { getDateRangeError, getPositiveAmountError, getTitleError } from "../../utils/validators";
import { BILL_CATEGORIES } from "./billingHelpers";
import { BillStatus, Label, Spinner } from "./billPieces";

export function BillCreateModal({ variant, isOpen, onClose, formData, setFormData, handleCategoryChange, handleCreateBill, creating, isMobile, isSuperAdmin, filterSocietyId, formSocietyId, handleFormSocietyChange, flats, societiesList, t }) {
  const accountant = variant === "accountant";

  if (accountant) {
    return (
      <GlobalModal
        isOpen={isOpen}
        onClose={onClose}
        title={t("billNewBill")}
        subtitle={t("billNewBillSub")}
        icon={MdReceiptLong}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateBill} className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          {/* 1. Flat Type */}
          <div>
            <Label>Flat Type</Label>
            <Select className="input h-11 w-full"
              value={formData.flat_type}
              onChange={e => setFormData({ ...formData, flat_type: e.target.value, bill_type: e.target.value, flat_id: "" })}>
              <option value="INDIVIDUAL">Individual Flat</option>
              <option value="ALL">All Flats</option>
            </Select>
          </div>

          {/* 2. Flat Picker */}
          {formData.flat_type === "INDIVIDUAL" && (
            <div>
              <Label>{t("billSelectFlat") || "Select Flat"}</Label>
              <Select className="input h-11 w-full" required
                value={formData.flat_id}
                onChange={e => setFormData({ ...formData, flat_id: e.target.value })}>
                <option value="">{t("billChooseFlat") || "Choose Flat"}</option>
                {flats.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flat_number} ({f.Block?.name}) – {f.User?.name || t("billNoResident") || "No Resident"}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* 3. Billing Type */}
          <div className={formData.flat_type === "ALL" ? "col-span-1" : ""}>
            <Label>Billing Type</Label>
            <Select className="input h-11 w-full"
              value={formData.bill_category}
              onChange={e => handleCategoryChange(e.target.value)}>
              {BILL_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>

          {/* 4. Conditional Other Specification */}
          {formData.bill_category === "OTHER" && (
            <div className="col-span-2">
              <Label>Specify Bill Type / What is this for? *</Label>
              <input
                className="input h-11 w-full"
                placeholder="e.g. Clubhouse Event, Festival Contribution, Garbage Levy"
                value={formData.other_bill_type}
                required
                onChange={e => setFormData({
                  ...formData,
                  other_bill_type: e.target.value,
                  title: formData.title === "Other" || !formData.title ? e.target.value : formData.title,
                })}
              />
            </div>
          )}

          {/* 5. Title */}
          <div>
            <Label>{t("billTitleLabel") || "Bill Title"}</Label>
            <input className="input h-11 w-full" placeholder={t("billTitlePlaceholder") || "Enter bill title"}
              value={formData.title} required
              onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>

          {/* 6. Amount */}
          <div>
            <Label>{t("billAmountLabel") || "Amount (₹)"}</Label>
            <input type="number" className="input h-11 w-full" placeholder="0"
              value={formData.amount} required
              onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>

          {/* Issue Date */}
          <div>
            <Label>Issue Date *</Label>
            <div className="relative flex items-center mt-1">
              <input type="date" className="input h-11 w-full px-3"
                value={formData.issue_date}
                required
                onChange={e => {
                  const dateVal = e.target.value;
                  let computedMonth = formData.billing_month;
                  if (dateVal) {
                    try {
                      const [yr, mo] = dateVal.split("-");
                      const d = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
                      computedMonth = d.toLocaleString("en-US", { month: "long", year: "numeric" });
                    } catch {
                      computedMonth = formData.billing_month;
                    }
                  }
                  setFormData({ ...formData, issue_date: dateVal, billing_month: computedMonth });
                }} />
            </div>
          </div>

          {/* Due Date (Last Pay Date) */}
          <div>
            <Label>Due Date (Last Pay Date)</Label>
            <div className="relative flex items-center mt-1">
              <input type="date" className="input h-11 w-full px-3"
                value={formData.last_pay_date}
                min={formData.issue_date || undefined}
                onChange={e => setFormData({ ...formData, last_pay_date: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 col-span-2 mt-2 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
            <GlobalButton variant="cancel" type="button" onClick={onClose}>
              {t("cancel")}
            </GlobalButton>
            <GlobalButton variant="create" type="submit" loading={creating} icon={MdReceiptLong}>
              {creating ? t("billGenerating") : t("billGenerate")}
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>
    );
  }

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("billNewBill")}
      subtitle={t("billNewBillSub")}
      icon={MdReceiptLong}
      size="md"
      showFooter
      submitLabel={t("billGenerate")}
      cancelLabel={t("cancel")}
      onSubmit={handleCreateBill}
      submitLoading={creating}
      submitDisabled={creating || (isSuperAdmin && !filterSocietyId && !formSocietyId) || Boolean(getTitleError(formData.title, "Bill title")) || Boolean(getPositiveAmountError(formData.amount, "Amount")) || Boolean(getDateRangeError(formData.issue_date, formData.last_pay_date, "Issue date", "Due date"))}
      submitIcon={MdCheckCircle}
    >
      <form onSubmit={handleCreateBill} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isSuperAdmin && !filterSocietyId && (
          <div className="sm:col-span-2">
            <Label>{t("billTargetSociety")}</Label>
            <Select className="input h-10 w-full" required
              value={formSocietyId}
              onChange={e => handleFormSocietyChange(e.target.value)}>
              <option value="">{t("billChooseSociety")}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        )}

        {/* 1. Flat Type */}
        <div>
          <Label>{t("billFlatType")}</Label>
          <Select className="input h-10 w-full"
            value={formData.flat_type}
            onChange={e => setFormData({ ...formData, flat_type: e.target.value, bill_type: e.target.value, flat_id: "" })}>
            <option value="INDIVIDUAL">{t("billTypeIndividual")}</option>
            <option value="ALL">{t("billTypeAll")}</option>
          </Select>
        </div>

        {/* 2. Flat Picker (if individual) */}
        {formData.flat_type === "INDIVIDUAL" ? (
          <div>
            <Label>{t("billSelectFlat") || "Select Flat"}</Label>
            <Select className="input h-10 w-full" required
              value={formData.flat_id}
              onChange={e => setFormData({ ...formData, flat_id: e.target.value })}>
              <option value="">{t("billChooseFlat") || "Choose Flat"}</option>
              {flats.map(f => (
                <option key={f.id} value={f.id}>
                  {f.flat_number} ({f.Block?.name}){" – "}{f.User?.name || t("billNoResident") || "No Resident"}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {/* 3. Billing Type (Category) */}
        <div className={formData.flat_type === "ALL" ? "sm:col-span-1" : ""}>
          <Label>{t("billBillingType")}</Label>
          <Select className="input h-10 w-full"
            value={formData.bill_category}
            onChange={e => handleCategoryChange(e.target.value)}>
            {BILL_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{t(`billCat${c.value}`)}</option>
            ))}
          </Select>
        </div>

        {/* 4. Conditional Other Specification */}
        {formData.bill_category === "OTHER" && (
          <div className="sm:col-span-2">
            <Label>{t("billSpecifyType")}</Label>
            <input
              className="input h-10 w-full"
              placeholder={t("billCustomPlaceholder")}
              value={formData.other_bill_type}
              required
              onChange={e => setFormData({
                ...formData,
                other_bill_type: e.target.value,
                title: formData.title === "Other" || !formData.title ? e.target.value : formData.title,
              })}
            />
          </div>
        )}

        {/* 5. Bill Title */}
        <div>
          <Label>{t("billTitleLabel") || "Bill Title"}</Label>
          <input className="input h-10 w-full" placeholder={t("billTitlePlaceholder") || "Enter bill title"}
            value={formData.title} required
            onChange={e => setFormData({ ...formData, title: e.target.value })} />
        </div>

        {/* 6. Amount */}
        <div>
          <Label>{t("billAmountLabel") || "Amount (₹)"}</Label>
          <input type="number" className="input h-10 w-full" placeholder="0"
            value={formData.amount} required
            onChange={e => setFormData({ ...formData, amount: e.target.value })} />
        </div>

        {/* Issue Date */}
        <div>
          <Label>Issue Date *</Label>
          <div className="relative flex items-center mt-1">
            <input type="date" className="input h-10 w-full px-3"
              value={formData.issue_date}
              required
              onChange={e => {
                const dateVal = e.target.value;
                let computedMonth = formData.billing_month;
                if (dateVal) {
                  try {
                    const [yr, mo] = dateVal.split("-");
                    const d = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
                    computedMonth = d.toLocaleString("en-US", { month: "long", year: "numeric" });
                  } catch {
                    computedMonth = formData.billing_month;
                  }
                }
                setFormData({ ...formData, issue_date: dateVal, billing_month: computedMonth });
              }} />
          </div>
          <span className="text-[10px] text-secondary mt-1 block">Bill issue date (defaults to today)</span>
        </div>

        {/* Due Date (Last Pay Date) */}
        <div>
          <Label>Due Date (Last Pay Date)</Label>
          <div className="relative flex items-center mt-1">
            <input type="date" className="input h-10 w-full px-3"
              value={formData.last_pay_date}
              min={formData.issue_date || undefined}
              onChange={e => setFormData({ ...formData, last_pay_date: e.target.value })} />
          </div>
          <p style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.7, marginTop: 4 }}>
            Leave blank to auto-set 30 days from issue date
          </p>
        </div>
      </form>
    </GlobalModal>
  );
}

export function CreateSuccessPopup({ createdBill, onClose, flats, societiesList, isSuperAdmin, t }) {
  return (
    <GlobalModal
      isOpen={!!createdBill}
      onClose={onClose}
      title={t("billGeneratedOk")}
      subtitle={createdBill?.type === "ALL" ? t("billGeneratedAll") : t("billGeneratedOk")}
      icon={MdCheckCircle}
      size="sm"
      showFooter
      submitLabel="Done"
      onSubmit={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {createdBill && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
              <span>Bill Title</span>
              <strong style={{ color: "var(--text-primary)" }}>{createdBill.title}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
              <span>Billing Category</span>
              <strong style={{ color: "var(--accent)" }}>
                {BILL_CATEGORIES.find(c => c.value === createdBill.category)?.label || createdBill.category || "General"}
                {createdBill.otherType ? ` (${createdBill.otherType})` : ""}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
              <span>Amount</span>
              <strong style={{ color: "var(--accent)" }}>₹{Number(createdBill.amount || 0).toLocaleString("en-IN")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
              <span>Flat Type</span>
              <strong style={{ color: "var(--text-primary)" }}>{createdBill.type === "ALL" ? "All Flats" : "Individual Flat"}</strong>
            </div>
            {createdBill.type === "ALL" ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Bills Generated</span>
                <strong style={{ color: "var(--text-primary)" }}>{createdBill.total ?? "—"} bill(s)</strong>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Flat</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {flats.find(f => f.id === Number(createdBill.flatId))?.flat_number || "—"}
                </strong>
              </div>
            )}
            {isSuperAdmin && createdBill.societyId && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Society</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {societiesList.find(s => String(s.id) === String(createdBill.societyId))?.name || "—"}
                </strong>
              </div>
            )}
          </>
        )}
      </div>
    </GlobalModal>
  );
}

export function BillDetailsModal({ viewBill, onClose, handleConfirmPayment, confirmingId, t }) {
  return (
    <GlobalModal
      isOpen={Boolean(viewBill)}
      onClose={onClose}
      title="Bill & Payment Details"
      subtitle={viewBill?.title}
      icon={MdReceiptLong}
      maxWidth="max-w-2xl"
    >
      {viewBill && (() => {
        const payment = viewBill.Payments?.[0];
        const isPaid = viewBill.status === "PAID";
        const isAwaiting = viewBill.status === "PENDING_VERIFICATION";
        const payerName = payment?.resident?.name || viewBill.Flat?.User?.name || "Resident";
        const payerPhone = payment?.resident?.phone || viewBill.Flat?.User?.phone;
        const payerEmail = payment?.resident?.email || viewBill.Flat?.User?.email;
        const purposeLabel = viewBill.type === "MAINTENANCE"
          ? "Society Maintenance Fee"
          : (viewBill.bill_category === "OTHER" ? (viewBill.other_bill_type || "Other Expense") : (viewBill.bill_category || "Utility Bill"));

        return (
          <div className="space-y-4">
            {/* Top Banner with Amount & Status */}
            <div
              className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
                borderColor: "var(--glass-border)",
              }}
            >
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Total Bill Amount</span>
                <p className="text-2xl sm:text-3xl font-bold text-accent" style={{ letterSpacing: "-0.02em" }}>
                  ₹{Number(viewBill.amount).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-secondary mt-1">Month: <strong style={{ color: "var(--text-primary)" }}>{viewBill.billing_month}</strong></p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Status</span>
                <BillStatus status={viewBill.status} t={t} variant="accountant" />
              </div>
            </div>

            {/* Grid: Bill Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Flat & Resident Details */}
              <div className="p-3.5 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <MdHome size={15} /> Unit & Resident
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Flat Unit:</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {viewBill.Flat?.flat_number || "—"} {viewBill.Flat?.Block?.name ? `(${viewBill.Flat.Block.name})` : ""}
                    </span>
                  </div>
                  {viewBill.Flat?.Floor?.floor_number !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Floor:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Floor {viewBill.Flat.Floor.floor_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-secondary">Resident:</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewBill.Flat?.User?.name || "Unassigned"}</span>
                  </div>
                  {viewBill.Flat?.User?.phone && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Contact:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewBill.Flat.User.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Schedule Details */}
              <div className="p-3.5 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <MdReceiptLong size={15} /> Purpose & Dates
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Bill Type:</span>
                    <span className="font-semibold text-accent">{purposeLabel}</span>
                  </div>
                  {viewBill.other_bill_type && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Specified For:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewBill.other_bill_type}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-secondary">Issue Date:</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {viewBill.issue_date ? new Date(viewBill.issue_date).toLocaleDateString("en-IN") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Due Date:</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {viewBill.due_date || viewBill.last_pay_date ? new Date(viewBill.due_date || viewBill.last_pay_date).toLocaleDateString("en-IN") : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Receipt / Verification Breakdown */}
            <div className="p-4 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MdPayments size={16} /> Payment Breakdown & Who Paid
              </p>

              {isPaid || isAwaiting || payment ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-2">
                    <div>
                      <span className="text-secondary block">Paid By Resident</span>
                      <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{payerName}</span>
                      {(payerPhone || payerEmail) && (
                        <span className="text-[11px] text-secondary block mt-0.5">{[payerPhone, payerEmail].filter(Boolean).join(" · ")}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-secondary block">Purpose Paid For</span>
                      <span className="font-semibold text-accent">{purposeLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-secondary">Payment Method:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{payment?.payment_mode || "Online / UPI Demo"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Amount Paid:</span>
                      <span className="font-bold text-green-400">₹{Number(payment?.amount || viewBill.amount).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Payment Timestamp:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {payment?.payment_date ? new Date(payment.payment_date).toLocaleString("en-IN") : "Confirmed"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-secondary">
                  <p className="font-semibold mb-1">⏳ Payment Pending</p>
                  <p className="opacity-80">Resident has not submitted payment for this bill yet.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: "var(--glass-border)" }}>
              {isAwaiting && (
                <GlobalButton
                  variant="primary"
                  icon={MdCheckCircle}
                  loading={confirmingId === viewBill.id}
                  onClick={async () => {
                    await handleConfirmPayment(viewBill.id);
                    onClose();
                  }}
                >
                  Confirm Payment
                </GlobalButton>
              )}
              <GlobalButton
                variant="cancel"
                onClick={onClose}
              >
                Close
              </GlobalButton>
            </div>
          </div>
        );
      })()}
    </GlobalModal>
  );
}

export function BulkModals({
  showBulkApproveModal,
  setShowBulkApproveModal,
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  bulkApproving,
  bulkDeleting,
  selectedApprovable,
  selectedDeletable,
  selectedApprovableAmount,
  selectedPaid,
  handleBulkApprove,
  handleBulkDelete,
}) {
  return (
    <>
      {showBulkApproveModal &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => !bulkApproving && setShowBulkApproveModal(false)}
          >
            <div
              className="animate-scaleIn"
              style={{
                background: "var(--card-bg, #1e293b)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: 22,
                maxWidth: 480,
                width: "100%",
                padding: "26px 28px",
                boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "rgba(16,185,129,0.16)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdCheckCircle size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Approve Selected Bills
                  </h3>
                  <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--text-secondary)" }}>
                    Confirm payment and mark status as PAID
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid var(--glass-border)",
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Bills to Approve:</span>
                  <strong style={{ color: "var(--text-primary)" }}>{selectedApprovable.length} bill(s)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Amount:</span>
                  <strong style={{ color: "var(--accent, #818cf8)", fontSize: 15 }}>₹{selectedApprovableAmount.toLocaleString("en-IN")}</strong>
                </div>
                {selectedPaid.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", borderTop: "1px solid var(--glass-border)", paddingTop: 8 }}>
                    ℹ️ {selectedPaid.length} already PAID bill(s) in selection will remain unaffected.
                  </div>
                )}
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 22, lineHeight: 1.5 }}>
                Approving will update the status of each bill to <strong>PAID</strong>, mark associated payment records as <strong>SUCCESS</strong>, and send real-time web and push notifications to residents.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={bulkApproving}
                  onClick={() => setShowBulkApproveModal(false)}
                  className="btn-cancel-sm"
                  style={{ padding: "9px 18px", borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkApproving}
                  onClick={handleBulkApprove}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "9px 20px",
                    borderRadius: 12,
                    border: "none",
                    cursor: bulkApproving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                  }}
                >
                  {bulkApproving ? <Spinner size={16} /> : <MdCheckCircle size={17} />}
                  <span>{bulkApproving ? "Approving..." : `Yes, Approve (${selectedApprovable.length})`}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showBulkDeleteModal &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
          >
            <div
              className="animate-scaleIn"
              style={{
                background: "var(--card-bg, #1e293b)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: 22,
                maxWidth: 480,
                width: "100%",
                padding: "26px 28px",
                boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "rgba(239,68,68,0.16)",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdDelete size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Delete Selected Bills
                  </h3>
                  <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--text-secondary)" }}>
                    Permanently remove selected bills
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid var(--glass-border)",
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Bills to Delete:</span>
                  <strong style={{ color: "#ef4444" }}>{selectedDeletable.length} bill(s)</strong>
                </div>
                {selectedPaid.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", borderTop: "1px solid var(--glass-border)", paddingTop: 8 }}>
                    ℹ️ Includes {selectedPaid.length} approved/paid bill(s). Associated payment records will also be removed.
                  </div>
                )}
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 22, lineHeight: 1.5 }}>
                Are you sure you want to delete these bills? This action <strong>cannot be undone</strong>.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="btn-cancel-sm"
                  style={{ padding: "9px 18px", borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={handleBulkDelete}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "9px 20px",
                    borderRadius: 12,
                    border: "none",
                    cursor: bulkDeleting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                  }}
                >
                  {bulkDeleting ? <Spinner size={16} /> : <MdDelete size={17} />}
                  <span>{bulkDeleting ? "Deleting..." : `Yes, Delete (${selectedDeletable.length})`}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}