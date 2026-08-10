

import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { MdAdd } from "react-icons/md";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";

/* For table display (same as GuestEntry list view) */
function resolveFlatLabel(flat) {
  if (!flat) return "NA";
  const block       = flat.Floor?.Block?.name || flat.Block?.name || null;
  const floorNumber = flat.Floor?.floor_number ?? null;
  const flatNumber  = flat.flat_number || "";
  return [
    block,
    floorNumber != null ? `Floor ${floorNumber}` : null,
    flatNumber,
  ].filter(Boolean).join(" / ") || "NA";
}

function resolveCabFlatLabel(v) {
  return resolveFlatLabel(v?.Flat);
}

export default function CabEntry() {
  const { t } = useLang();

  const [showModal, setShowModal] = useState(false);
  const [flats, setFlats] = useState([]);
  const [cabs, setCabs] = useState([]);

  const [form, setForm] = useState({
    driver_name: "",
    vehicle_number: "",
    aggregator: "",
    flat_id: "",
    mobile: "",
  });

  const loadData = async () => {
    try {
      const [flatRes, visitorRes] = await Promise.all([
        API.get("/flats/assigned"),
        API.get("/visitors?page=1&limit=200"),
      ]);

      // Assigned flats
      const flatData = flatRes.data;
      setFlats(Array.isArray(flatData) ? flatData : flatData?.data || []);

      // Visitors (filter CAB)
      const vData = visitorRes.data;
      const all = Array.isArray(vData) ? vData : vData?.data || [];
      setCabs(all.filter(v => v.purpose === "CAB"));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/visitors", {
        visitor_name: `${form.aggregator} - ${form.driver_name}`,
        purpose: "CAB",
        flat_id: Number(form.flat_id),
        mobile: form.mobile,
        vehicle_number: form.vehicle_number,
      });

      setForm({
        driver_name: "",
        vehicle_number: "",
        aggregator: "",
        flat_id: "",
        mobile: "",
      });

      setShowModal(false);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || "Entry failed";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg font-semibold">{t("cabTitle")}</h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <MdAdd size={18} /> {t("cabAddBtn")}
        </button>
      </div>

      {/* ── LIST ── */}
      <div className="bg-card p-5 rounded-xl">
        <h3 className="text-md font-semibold mb-4">
          {t("cabRecentActivity")}
        </h3>

        {cabs.length === 0 ? (
          <p className="text-sm text-secondary">{t("cabEmpty")}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary border-b border-white/10">
                    <th className="py-3">{t("cabColAggregator")}</th>
                    <th className="py-3">{t("cabColDriver")}</th>
                    <th className="py-3">{t("cabColMobile")}</th>
                    <th className="py-3">{t("cabColVehicle")}</th>
                    <th className="py-3">{t("geColFlat")}</th>
                    <th className="py-3">{t("geColEntry")}</th>
                    <th className="py-3">{t("geColExit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cabs.map(v => {
                    const [aggregator, driver] =
                      v.visitor_name?.split(" - ") || [];

                    return (
                      <tr
                        key={v.id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="py-3">{aggregator}</td>
                        <td className="py-3">{driver}</td>
                        <td className="py-3">{v.mobile}</td>
                        <td className="py-3">
                          {v.vehicle_number || "-"}
                        </td>
                        <td className="py-3">
                          {resolveCabFlatLabel(v)}
                        </td>
                        <td className="py-3">
                          {new Date(v.entry_time).toLocaleTimeString()}
                        </td>
                        <td className="py-3">
                          {v.exit_time
                            ? new Date(v.exit_time).toLocaleTimeString()
                            : <span className="text-white/40">--</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {cabs.map(v => {
                const [aggregator, driver] =
                  v.visitor_name?.split(" - ") || [];

                return (
                  <div
                    key={v.id}
                    className="bg-card border border-white/5 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{driver}</h3>
                      <span className="text-sm text-white/60">
                        {aggregator}
                      </span>
                    </div>

                    <p className="text-sm text-white/70">
                      {t("cabColMobile")}:{" "}
                      <span className="text-white">{v.mobile}</span>
                    </p>

                    <p className="text-sm text-white/70">
                      {t("cabColVehicle")}:{" "}
                      <span className="text-white">
                        {v.vehicle_number || "-"}
                      </span>
                    </p>

                    <p className="text-sm text-white/70">
                      {t("geColFlat")}:{" "}
                      <span className="text-white">
                        {resolveCabFlatLabel(v)}
                      </span>
                    </p>

                    <p className="text-sm text-white/70">
                      {t("geColEntry")}:{" "}
                      <span className="text-white">
                        {new Date(v.entry_time).toLocaleTimeString()}
                      </span>
                    </p>

                    <p className="text-sm text-white/70">
                      {t("geColExit")}:{" "}
                      <span className={v.exit_time ? "text-white" : "text-white/40"}>
                        {v.exit_time
                          ? new Date(v.exit_time).toLocaleTimeString()
                          : "--"}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("cabModalTitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-3">

          <Select
            className="input"
            required
            value={form.aggregator}
            onChange={e => setForm({ ...form, aggregator: e.target.value })}
          >
            <option value="">{t("cabSelectAggregator")}</option>
            <option>Uber</option>
            <option>Ola</option>
            <option>BluSmart</option>
            <option>{t("cabOther")}</option>
          </Select>

          <input
            placeholder={t("cabFieldDriver")}
            className="input"
            required
            value={form.driver_name}
            onChange={e => setForm({ ...form, driver_name: e.target.value })}
          />

          <input
            placeholder={t("cabFieldMobile")}
            className="input"
            required
            value={form.mobile}
            onChange={e => setForm({ ...form, mobile: e.target.value })}
          />

          <input
            placeholder={t("cabFieldVehicle")}
            className="input"
            required
            value={form.vehicle_number}
            onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
          />

          {/* ✅ SAME DROPDOWN FORMAT AS GuestEntry / ManageBills */}
          <Select
            className="input"
            required
            value={form.flat_id}
            onChange={e => setForm({ ...form, flat_id: e.target.value })}
          >
            <option value="">{t("billChooseFlat")}</option>
            {flats.map(flat => (
              <option key={flat.id} value={flat.id}>
                {flat.flat_number} (
                  {flat.Block?.name ||
                   flat.Floor?.Block?.name ||
                   "—"}
                ) – {flat.User?.name || t("billNoResident")}
              </option>
            ))}
          </Select>

          <button type="submit" className="btn-primary w-full">
            {t("geSaveEntry")}
          </button>

        </form>
      </Modal>
    </div>
  );
}