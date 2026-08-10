import { useEffect, useState, useContext } from "react";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdPersonAdd, MdPhone, MdDirectionsCar,
  MdCalendarToday, MdQrCode, MdWarning,
  MdCheckCircle, MdContentCopy, MdPerson,
} from "react-icons/md";
import Select from "../../components/common/Select";

/* ── IST date helpers ── */
const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatDateIST = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/* ── Purpose maps ── */
const PURPOSE_ICONS = {
  GUEST:       "👤",
  DELIVERY:    "📦",
  CAB:         "🚕",
  SERVICE:     "🔧",
  MAINTENANCE: "🏗️",
  OTHER:       "🔖",
};

const PURPOSE_COLORS = {
  GUEST:       { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.25)",  text: "#3b82f6" },
  DELIVERY:    { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.28)",  text: "#f59e0b" },
  CAB:         { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.28)",  text: "#8b5cf6" },
  SERVICE:     { bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.28)",   text: "#22c55e" },
  MAINTENANCE: { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.25)",   text: "#ef4444" },
  OTHER:       { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.25)", text: "#64748b" },
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function ResidentPreApproval() {
  const { t } = useLang();
  const { user: authUser } = useContext(AuthContext);
  const isOwner = authUser?.resident_type === "OWNER";



  const [gatePass,     setGatePass]     = useState(null);
  const [flatAssigned, setFlatAssigned] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [myPasses,     setMyPasses]     = useState([]);
  const [copiedId,     setCopiedId]     = useState(null);
  const [myFlats,      setMyFlats]      = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [istTime,      setIstTime]      = useState("");
  const [istDate,      setIstDate]      = useState("");

  const eligibleFlats = myFlats.filter(item => {
    const flatObj = item.Flat || item;
    if (isOwner && flatObj.occupancy_status === "RENTED") return false;
    return true;
  });
  const hasEligibleFlat = eligibleFlats.length > 0;

  const [form, setForm] = useState({
  visitor_name: "",
  mobile: "",
  vehicle_number: "",
  purpose: "",
  valid_date: "",
});

  const purposeLabels = {
    GUEST: t("preapPurposeGuest"),
    DELIVERY: t("preapPurposeDelivery"),
    CAB: t("preapPurposeCab"),
    SERVICE: t("preapPurposeService"),
    MAINTENANCE: t("preapPurposeMaintenance"),
    OTHER: t("preapPurposeOther"),
  };

  /* ── Live IST clock ── */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
        })
      );
      setIstDate(
        now.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short", day: "2-digit", month: "short", year: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── API calls ── */
  const fetchMyPasses = async () => {
    try {
      const res = await API.get("/preapproval/my");
      setMyPasses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkFlat = async () => {
    try {
      const res = await API.get("/users/get-flat");
      const data = res.data;
      const flats = Array.isArray(data)
        ? data
        : data?.flats
          ? data.flats
          : data?.flat_number
            ? [data]
            : [];

      setMyFlats(flats);
      const hasFlat = flats.length > 0;
      setFlatAssigned(hasFlat);
      if (hasFlat) {
        setSelectedFlatId(flats[0].flat_id || flats[0].id || "");
      }
    } catch (err) {
      console.error(err);
      setMyFlats([]);
      setFlatAssigned(false);
    }
  };

  useEffect(() => {
    checkFlat();
    fetchMyPasses();
  }, []);

  /* ── Form submit ── */
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!hasEligibleFlat) return;

  // ✅ simple validation
  if (
    !form.visitor_name ||
    !form.mobile ||
    !form.valid_date ||
    !form.purpose
  ) {
    alert("Please fill all required fields");
    return;
  }

  try {
    setSubmitting(true);

    const payload = {
      flat_id: selectedFlatId,
      visitor_name: form.visitor_name,
      mobile: form.mobile,
      vehicle_number: form.vehicle_number,
      purpose: form.purpose,
      valid_date: form.valid_date, // YYYY-MM-DD
    };

    console.log("PAYLOAD:", payload);

    const res = await API.post("/preapproval", payload);

    setGatePass(res.data.GatePass);

    setForm({
      visitor_name: "",
      mobile: "",
      vehicle_number: "",
      purpose: "",
      valid_date: "",
    });

    fetchMyPasses();
  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
          <MdPersonAdd size={20} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("preapTitle")}</h2>
          <p className="text-secondary text-xs mt-0.5">{t("preapSubtitle")}</p>
        </div>
      </div>

      {/* ── LIVE IST CLOCK ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-secondary text-xs">Current time (IST)</span>
        <span className="ml-auto font-mono text-xs font-medium tabular-nums text-white/80 tracking-wide">
          {istDate}&nbsp;&nbsp;{istTime}
        </span>
      </div>

      {/* ── NO FLAT WARNING ── */}
      {!flatAssigned && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl p-4 animate-scaleIn">
          <MdWarning size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400/90 leading-relaxed">{t("preapNoFlat")}</p>
        </div>
      )}

      {/* ── OWNER RENTED WARNING ── */}
      {flatAssigned && !hasEligibleFlat && isOwner && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 animate-scaleIn">
          <MdWarning size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-400/90 leading-relaxed">Owners cannot pre-approve visitors for rented units.</p>
        </div>
      )}

      {/* ── GATE PASS RESULT ── */}
      {gatePass && hasEligibleFlat && (
        <div
          className="relative overflow-hidden rounded-2xl p-5 animate-scaleIn"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, #22c55e, #10b981, transparent)" }}
          />

          <div className="flex items-center gap-2 mb-3">
            <MdCheckCircle size={18} className="text-green-400" />
            <p className="text-sm font-semibold text-green-400">{t("preapPassGenerated")}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">{t("preapPassCode")}</p>
              <p className="text-3xl font-bold tracking-[0.25em] text-green-300">{gatePass}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <MdQrCode size={32} className="text-gray-800" />
              </div>
              <p className="text-[10px] text-secondary">QR</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              // onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                copied
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-white/8 text-secondary border-white/10 hover:bg-white/12 hover:text-white"
              }`}
            >
              {copied ? <MdCheckCircle size={13} /> : <MdContentCopy size={13} />}
              {copied ? t("preapCopied") : t("preapCopyCode")}
            </button>
            <p className="text-[11px] text-secondary/60">{t("preapShareHint")}</p>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {hasEligibleFlat && (
        <div className="bg-card p-4 sm:p-5 rounded-2xl">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
            {t("preapVisitorDetails")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {myFlats.length > 0 && (
              <div>
                <label className="text-xs text-secondary mb-1.5 block">
                  {t("preapSelectFlat") || "Select Flat"} <span className="text-red-400">*</span>
                </label>
                <Select
                  className="input h-11 w-full"
                  value={selectedFlatId}
                  onChange={(e) => setSelectedFlatId(e.target.value)}
                  required
                >
                  {eligibleFlats.map((flat) => (
                    <option key={flat.flat_id || flat.id} value={flat.flat_id || flat.id}>
                      Flat {flat.Flat?.flat_number || flat.flat_number || flat.flatNumber || flat.number || "—"}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Row 1: Name + Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary mb-1.5 block">
                  {t("preapVisitorName")} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MdPerson size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                  <input
                    className="input h-11 w-full pl-9"
                    placeholder={t("preapVisitorNamePlaceholder")}
                    required
                    value={form.visitor_name}
                    onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary mb-1.5 block">
                  {t("preapMobile")} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MdPhone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                  <input
                    className="input h-11 w-full pl-9"
                    placeholder={t("preapMobilePlaceholder")}
                    required
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Vehicle + Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary mb-1.5 block">{t("preapVehicle")}</label>
                <div className="relative">
                  <MdDirectionsCar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                  <input
                    className="input h-11 w-full pl-9"
                    placeholder={t("preapVehiclePlaceholder")}
                    value={form.vehicle_number}
                    onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary mb-1.5 block">
                  {t("preapPurpose")} <span className="text-red-400">*</span>
                </label>
                <Select
                  className="input h-11 w-full"
                  required
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                >
                  <option value="">{t("preapSelectPurpose")}</option>
                  {Object.entries(PURPOSE_ICONS).map(([val, emoji]) => (
                    <option key={val} value={val}>
                      {emoji} {purposeLabels[val]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Row 3: Valid Date */}
            <div className="sm:w-1/2">
              <label className="text-xs text-secondary mb-1.5 block">
                {t("preapValidDate")} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MdCalendarToday size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                <input
  type="date"
  value={form.valid_date}
  onChange={(e) =>
    setForm({ ...form, valid_date: e.target.value })
  }
  required
/>
              </div>
            </div>
            
            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !hasEligibleFlat}
              className="btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Spinner /> {t("preapGenerating")}</>
                : <><MdQrCode size={17} /> {t("preapGenerateBtn")}</>
              }
            </button>
          </form>
        </div>
      )}

      {/* ── ACTIVE PASSES ── */}
      {myPasses.length > 0 && (
        <div className="bg-card p-4 sm:p-5 rounded-2xl space-y-4 animate-fadeIn">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Active Gate Passes
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-white/8 border border-white/10 text-secondary">
              {myPasses.length}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {myPasses.map((pass, idx) => {
              const pc = PURPOSE_COLORS[pass.purpose] || PURPOSE_COLORS.OTHER;
              const isCopied = copiedId === pass.id;

              return (
                <div
                  key={pass.id}
                  className="rounded-xl overflow-hidden border border-white/10 bg-white/5 animate-fadeIn"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* color bar */}
                  <div className="h-0.5" style={{ background: pc.text }} />

                  <div className="p-3.5 flex flex-col gap-2.5">

                    {/* top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                          style={{ background: pc.bg, border: `1px solid ${pc.border}` }}
                        >
                          {PURPOSE_ICONS[pass.purpose] || "🔖"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{pass.visitor_name}</p>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                            style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}
                          >
                            {purposeLabels[pass.purpose] || pass.purpose}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 shrink-0">
                        Active
                      </span>
                    </div>

                    {/* OTP code */}
                    <p className="text-2xl font-bold tracking-[0.2em] text-green-300 tabular-nums">
                      {pass.otp}
                    </p>

                    {/* meta chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {pass.vehicle_number && (
                        <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                          <MdDirectionsCar size={11} /> {pass.vehicle_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                        <MdCalendarToday size={10} /> Valid till {formatDateIST(pass.valid_date)}
                      </span>
                    </div>

                    {/* copy button */}
                    <button
                      // onClick={() => handleCopyPass(pass.otp, pass.id)}
                      className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                        isCopied
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-white/8 text-secondary border-white/10 hover:bg-white/12 hover:text-white"
                      }`}
                    >
                      {isCopied ? <MdCheckCircle size={13} /> : <MdContentCopy size={13} />}
                      {isCopied ? "Copied!" : "Copy Code"}
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}