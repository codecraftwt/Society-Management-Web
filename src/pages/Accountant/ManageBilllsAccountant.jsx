
import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import Select from "../../components/common/Select";

/* === HELPERS === */
const getCurrentBillingMonth = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function ManageBillsAccountant() {
  const { t } = useLang();

  /* === STATE === */
  const [bills, setBills] = useState([]);
  const [flats, setFlats] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const [formData, setFormData] = useState({
    bill_type: "INDIVIDUAL",
    flat_id: "",
    title: "",
    amount: "",
    billing_month: getCurrentBillingMonth(),
  });

  /* === LOAD DATA === */
  useEffect(() => {
    loadBills();
    loadFlats();
  }, []);

  const loadBills = async () => {
    try {
      const res = await API.get("/bills/society");
      const data = res.data;
      if (Array.isArray(data))             setBills(data);
      else if (Array.isArray(data?.data))  setBills(data.data);
      else if (Array.isArray(data?.bills)) setBills(data.bills);
      else {
        console.warn("Unexpected bills response shape:", data);
        setBills([]);
      }
    } catch (err) {
      console.error("Failed to load bills", err);
      setBills([]);
    }
  };

  const loadFlats = async () => {
    try {
      const res = await API.get("/flats/assigned");
      const data = res.data;
      if (Array.isArray(data))            setFlats(data);
      else if (Array.isArray(data?.data)) setFlats(data.data);
      else setFlats([]);
    } catch (err) {
      console.error("Failed to load flats", err);
      setFlats([]);
    }
  };

  /* === CREATE BILL === */
  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      await API.post("/bills", formData);
      setFormData({
        bill_type: "INDIVIDUAL",
        flat_id: "",
        title: "",
        amount: "",
        billing_month: getCurrentBillingMonth(),
      });
      setShowCreate(false);
      loadBills();
    } catch (err) {
      console.error("Create bill failed", err);
    }
  };

  const [confirmingId, setConfirmingId] = useState(null);

  const handleConfirmPayment = async (id) => {
    setConfirmingId(id);
    try {
      await API.put(`/bills/confirm/${id}`);
      loadBills();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm payment");
    } finally {
      setConfirmingId(null);
    }
  };

  /* === DELETE BILL === */
  const handleDeleteBill = async (id) => {
    if (!window.confirm(t("acctBillsConfirmDelete"))) return;
    try {
      await API.delete(`/bills/${id}`);
      loadBills();
    } catch (err) {
      alert(err.response?.data?.message || t("billDeleteFailed"));
    }
  };

  return (
    <div className="space-y-6">

      {/* === HEADER === */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("billsTitle")}
          </h2>
          <p className="text-xs text-secondary">{t("billsSubtitle")}</p>
        </div>
        <button
          onClick={() => setShowCreate((p) => !p)}
          className="btn-primary"
        >
          {showCreate ? t("acctBillsClose") : t("acctBillsCreateBtn")}
        </button>
      </div>

      {/* === CREATE BILL FORM === */}
      {showCreate && (
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow max-w-5xl">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {t("acctBillsFormTitle")}
          </h3>

          <form
            onSubmit={handleCreateBill}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Bill Type */}
            <div>
              <label className="text-xs text-secondary mb-1 block">
                {t("billTypeLabel")}
              </label>
              <Select
                className="input h-12 w-full"
                value={formData.bill_type}
                onChange={(e) =>
                  setFormData({ ...formData, bill_type: e.target.value, flat_id: "" })
                }
              >
                <option value="INDIVIDUAL">{t("billTypeIndividual")}</option>
                <option value="ALL">{t("billTypeAll")}</option>
              </Select>
            </div>

            {/* Flat Selector */}
            {formData.bill_type === "INDIVIDUAL" && (
              <div className="sm:col-span-2">
                <label className="text-xs text-secondary mb-1 block">
                  {t("billSelectFlat")}
                </label>
                <Select
                  className="input h-12 w-full"
                  value={formData.flat_id}
                  onChange={(e) =>
                    setFormData({ ...formData, flat_id: e.target.value })
                  }
                  required
                >
                  <option value="">{t("billChooseFlat")}</option>
                  {flats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.flat_number} ({f.Block?.name}) –{" "}
                      {f.User?.name || t("billNoResident")}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-xs text-secondary mb-1 block">
                {t("billTitleLabel")}
              </label>
              <input
                className="input h-12 w-full"
                placeholder={t("billTitlePlaceholder")}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs text-secondary mb-1 block">
                {t("billAmountLabel")}
              </label>
              <input
                type="number"
                className="input h-12 w-full"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            {/* Billing Month */}
            <div>
              <label className="text-xs text-secondary mb-1 block">
                {t("billMonthLabel")}
              </label>
              <input
                type="month"
                className="input h-12 w-full"
                value={formData.billing_month}
                onChange={(e) =>
                  setFormData({ ...formData, billing_month: e.target.value })
                }
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary flex justify-center h-12 sm:col-span-2 lg:col-span-4"
            >
              {t("billGenerate")}
            </button>
          </form>
        </div>
      )}

      {/* === SOCIETY BILLS === */}
      <div className="bg-card p-4 sm:p-5 rounded-xl shadow">
        <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("billSocietyBills")}
        </h3>

        {!Array.isArray(bills) || bills.length === 0 ? (
          <p className="text-sm text-secondary">{t("billEmpty")}</p>
        ) : (
          <>
            {/* MOBILE UI */}
            <div className="md:hidden space-y-4">
              {bills.map((b) => (
                <div
                  key={b.id}
                  className="bg-card border border-white/5 rounded-xl p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{b.title}</p>
                      <p className="text-xs text-secondary">{b.billing_month}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full text-white ${
                        b.status === "PAID" ? "bg-green-600" : "bg-yellow-500"
                      }`}
                    >
                      {b.status === "PAID" ? t("billPaid") : t("billPending")}
                    </span>
                  </div>

                  <div className="bg-muted/40 rounded-lg p-3 flex justify-between">
                    <span className="text-xs text-secondary">
                      {t("acctBillsAmountLabel")}
                    </span>
                    <span className="font-semibold text-lg">₹{b.amount}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-secondary">{t("billFlatCol")}</p>
                      <p className="font-medium">
                        {b.Flat?.flat_number} ({b.Flat?.Block?.name})
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary">{t("billResidentCol")}</p>
                      <p className="font-medium">
                        {b.Flat?.User?.name || t("acctBillsNA")}
                      </p>
                    </div>
                  </div>

                  {b.status !== "PAID" && (
                    <button
                      onClick={() => handleDeleteBill(b.id)}
                      className="text-red-500 text-xs"
                    >
                      {t("acctBillsDeleteBtn")}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-secondary">
                  <tr>
                    <th className="p-2 text-left">{t("billTitleCol")}</th>
                    <th className="p-2 text-left">{t("billFlatCol")}</th>
                    <th className="p-2 text-left">{t("billResidentCol")}</th>
                    <th className="p-2 text-left">{t("billMonthCol")}</th>
                    <th className="p-2 text-left">{t("billAmountCol")}</th>
                    <th className="p-2 text-left">{t("billStatusCol")}</th>
                    <th className="p-2 text-left">{t("billActionCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id} className="border-t border-white/5">
                      <td className="p-2">{b.title}</td>
                      <td className="p-2">
                        {b.Flat?.flat_number} ({b.Flat?.Block?.name})
                      </td>
                      <td className="p-2">
                        {b.Flat?.User?.name || t("acctBillsNA")}
                      </td>
                      <td className="p-2">{b.billing_month}</td>
                      <td className="p-2">₹{b.amount}</td>
                      <td className="p-2">
                        <span
                          className={`px-2.5 py-1 text-xs rounded-full text-white font-medium ${
                            b.status === "PAID"
                              ? "bg-green-600"
                              : b.status === "PENDING_VERIFICATION"
                              ? "bg-blue-600"
                              : "bg-yellow-500"
                          }`}
                        >
                          {b.status === "PAID"
                            ? t("billPaid")
                            : b.status === "PENDING_VERIFICATION"
                            ? "Awaiting Confirmation"
                            : t("billPending")}
                        </span>
                      </td>
                      <td className="p-2">
                        {b.status !== "PAID" && (
                          <div className="flex items-center gap-2">
                            {b.status === "PENDING_VERIFICATION" && (
                              <button
                                onClick={() => handleConfirmPayment(b.id)}
                                disabled={confirmingId === b.id}
                                className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                              >
                                Confirm Payment
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteBill(b.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              {t("acctBillsDelete")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}