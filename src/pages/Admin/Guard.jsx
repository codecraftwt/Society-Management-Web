import { useEffect, useState, useContext, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdDelete, MdPerson, MdEmail,
  MdVisibility, MdVisibilityOff,
  MdSecurity, MdSchedule, MdCalendarToday, MdCalendarMonth,
  MdWbSunny, MdNightsStay, MdBrightness5, MdEdit, MdApartment, MdLock,
  MdCloudUpload, MdFingerprint, MdAccessTime, MdLocationOn, MdCheckCircle,
  MdCameraAlt, MdRefresh, MdFilterList, MdToday, MdZoomIn, MdPhone,
} from "react-icons/md";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import UserAvatar from "../../components/common/UserAvatar";
import ProfilePictureUploader from "../../components/common/ProfilePictureUploader";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import StatCard from "../../components/common/StatCard";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getEmailError } from "../../utils/validators";
import {
  APP_TIMEZONE,
  getTodayISO, shiftStatus, shiftForToday, isShiftEditable,
  sortShiftsForDisplay, formatShiftRange,
  SHIFT_TODAY, SHIFT_UPCOMING, SHIFT_COMPLETED,
} from "../../utils/guardShifts";
import { useCustomAlert } from "../../context/CustomAlertContext";

function ShiftBadge({ type, t }) {
  const SHIFT_CFG = {
    MORNING:   { label: t("guardShiftMorning") || "Morning",   icon: MdWbSunny,     variant: "info" },
    AFTERNOON: { label: t("guardShiftAfternoon") || "Afternoon", icon: MdBrightness5, variant: "warning" },
    NIGHT:     { label: t("guardShiftNight") || "Night",     icon: MdNightsStay,  variant: "neutral" },
  };
  const cfg = SHIFT_CFG[type] || SHIFT_CFG.MORNING;
  return (
    <GlobalBadge variant={cfg.variant} icon={cfg.icon} size="sm">
      {cfg.label}
    </GlobalBadge>
  );
}

function Avatar({ name, src, size = 34 }) {
  return (
    <UserAvatar
      name={name}
      src={src}
      size={size}
      className="guard-row-avatar"
    />
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 5,
    }}>
      {children}
    </p>
  );
}

const fmtTime12h = (hhmm) => {
  if (!hhmm || !/^\d{2}:\d{2}/.test(hhmm)) return hhmm || "—";
  try {
    const [h, m] = hhmm.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).replace(" ", " ");
  } catch {
    return hhmm;
  }
};

/* Compact 12-hour time control (Hour / Minute / AM-PM).
   Operates on "HH:mm" (24h) values so the stored format stays consistent. */
function TimeInput12({ value, onChange, disabled }) {
  let h24 = 0, min = 0;
  if (/^\d{2}:\d{2}$/.test(value || "")) {
    const [hh, mm] = value.split(":").map(Number);
    h24 = hh; min = mm;
  }
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ap = h24 >= 12 ? "PM" : "AM";
  const toHHmm = (hour12, minutes, ampm) => {
    let h = hour12 % 12;
    if (ampm === "PM") h += 12;
    return `${String(h).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  const selStyle = {
    height: 40, fontSize: 13.5, fontWeight: 600, borderRadius: 10,
    background: "var(--card-inner-bg)",
    border: "1.5px solid var(--glass-border)", color: "var(--text-primary)",
    padding: "0 6px", outline: "none", cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
  return (
    <span className="gt-time-group" style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
      <select
        className="input"
        disabled={disabled}
        value={h12}
        onChange={e => onChange(toHHmm(Number(e.target.value), min, ap))}
        style={{ ...selStyle, flex: "1 1 0", minWidth: 0 }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <select
        className="input"
        disabled={disabled}
        value={min}
        onChange={e => onChange(toHHmm(h12, Number(e.target.value), ap))}
        style={{ ...selStyle, flex: "1 1 0", minWidth: 0 }}
      >
        {Array.from({ length: 60 }, (_, i) => i).map(n => (
          <option key={n} value={n}>{String(n).padStart(2, "0")}</option>
        ))}
      </select>
      <select
        className="input"
        disabled={disabled}
        value={ap}
        onChange={e => onChange(toHHmm(h12, min, e.target.value))}
        style={{ ...selStyle, flexShrink: 0, width: "auto" }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </span>
  );
}

export default function Guard() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const { showUnauthorized, showError, showSuccess } = useCustomAlert();
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  const shiftName = (type) =>
    type === "MORNING" ? t("guardShiftMorning", "Morning")
    : type === "AFTERNOON" ? t("guardShiftAfternoon", "Afternoon")
    : t("guardShiftNight", "Night");
  
  const canCreateGuard = hasPermission(user, "guard", "create");
  const canEditGuard = hasPermission(user, "guard", "edit");
  const canDeleteGuard = hasPermission(user, "guard", "delete");
  const canShiftGuard = hasPermission(user, "guard", "edit_shift");

  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAllShiftsModal, setShowAllShiftsModal] = useState(false);
  const [reopenListAfterEdit, setReopenListAfterEdit] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [guardShifts, setGuardShifts] = useState({});
  const [shiftForm, setShiftForm] = useState({ shift_type: "", start_date: "", end_date: "" });
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [shiftError, setShiftError] = useState("");

  /* "Today" has to roll over on its own: a page left open across midnight, or a
     shift that starts tomorrow, must show the new day without a reload. The
     value itself is always resolved in the app timezone (see utils/guardShifts),
     the timer only decides when to recompute it. */
  const [todayISO, setTodayISO] = useState(() => getTodayISO());

  /* ── MAIN TAB SWITCHER (ROSTER vs ATTENDANCE) ── */
  const [mainTab, setMainTab] = useState("ROSTER"); // "ROSTER" | "ATTENDANCE"

  /* ── ATTENDANCE STATE ── */
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => getTodayISO());
  const [attendanceGuardFilter, setAttendanceGuardFilter] = useState("ALL");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("ALL");
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, punched_in: 0, punched_out: 0 });
  const [selectedSelfie, setSelectedSelfie] = useState(null);
  useEffect(() => {
    let timer;
    const scheduleRollover = () => {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 5, 0);
      timer = setTimeout(() => {
        setTodayISO(getTodayISO());
        scheduleRollover();
      }, Math.max(1000, nextMidnight.getTime() - Date.now()));
    };
    scheduleRollover();
    return () => clearTimeout(timer);
  }, []);

  // Society-wide shift timing config (GuardShiftTiming)
  const DEFAULTS = {
    MORNING: { start: "08:00", end: "16:00" },
    AFTERNOON: { start: "16:00", end: "00:00" },
    NIGHT: { start: "00:00", end: "08:00" },
  };
  const SHIFT_WINDOWS = [
    { type: "MORNING", label: t("guardShiftMorning") || "Morning", icon: MdWbSunny, accent: "#10b981", glow: "rgba(16,185,129,0.35)", tint: "rgba(16,185,129,0.10)" },
    { type: "AFTERNOON", label: t("guardShiftAfternoon") || "Afternoon", icon: MdBrightness5, accent: "#f59e0b", glow: "rgba(245,158,11,0.35)", tint: "rgba(245,158,11,0.10)" },
    { type: "NIGHT", label: t("guardShiftNight") || "Night", icon: MdNightsStay, accent: "#818cf8", glow: "rgba(129,140,248,0.35)", tint: "rgba(129,140,248,0.10)" },
  ];
  const [shiftTimings, setShiftTimings] = useState(null);
  const [timingsDirty, setTimingsDirty] = useState(false);
  const [timingsSaving, setTimingsSaving] = useState(false);
  const [timingsLoading, setTimingsLoading] = useState(false);
  const [showTimingsModal, setShowTimingsModal] = useState(false);

  // SuperAdmin society filter
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    return localStorage.getItem("superadmin_society_filter") || "ALL";
  });

  const timingsSocietyId = isSuperAdmin
    ? filterSocietyId && filterSocietyId !== "ALL" ? filterSocietyId : null
    : user?.society_id;
  const [formData, setFormData] = useState({ name: "", email: "", password: "", society_id: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, societyId: null, loading: false });

  const fetchSocieties = async () => {
    try {
      const res = await API.get("/societies");
      setSocietiesList(res.data || []);
    } catch {
      setSocietiesList([]);
    }
  };

  const loadShifts = async (guardList) => {
    const shiftMap = {};
    for (const g of guardList) {
      try {
        const res = await API.get(`/guards/${g.id}/shifts`);
        shiftMap[g.id] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.shifts || []);
      } catch {
        shiftMap[g.id] = [];
      }
    }
    setGuardShifts(shiftMap);
  };

  const fetchGuards = async () => {
    setLoading(true);
    try {
      let res;
      if (isSuperAdmin) {
        if (!filterSocietyId || filterSocietyId === "ALL") {
          res = await API.get("/guards/all");
        } else {
          res = await API.get(`/guards/society/${filterSocietyId}`);
        }
      } else {
        res = await API.get("/guards");
      }
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.guards)
        ? res.data.guards
        : [];
      setGuards(list);
      await loadShifts(list);
    } catch (err) {
      console.error(err);
      setGuards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchSocieties();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchGuards();
  }, [isSuperAdmin, filterSocietyId]);

  /* ── FETCH ATTENDANCE LIST & SUMMARY ── */
  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const params = {
        limit: 100,
      };
      if (attendanceDate) params.date = attendanceDate;
      if (attendanceGuardFilter && attendanceGuardFilter !== "ALL") params.guard_id = attendanceGuardFilter;
      if (attendanceStatusFilter && attendanceStatusFilter !== "ALL") params.status = attendanceStatusFilter;
      if (isSuperAdmin && filterSocietyId && filterSocietyId !== "ALL") {
        params.society_id = filterSocietyId;
      }

      const res = await API.get("/guard-attendance", { params });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setAttendanceList(items);
      setAttendanceTotal(res.data?.total || items.length);
    } catch (err) {
      console.error("Failed to fetch guard attendance:", err);
      setAttendanceList([]);
      setAttendanceTotal(0);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const params = {};
      if (isSuperAdmin && filterSocietyId && filterSocietyId !== "ALL") {
        params.society_id = filterSocietyId;
      }
      const res = await API.get("/guard-attendance/summary/today", { params });
      if (res.data?.success) {
        setAttendanceSummary({
          total: res.data.total || 0,
          punched_in: res.data.punched_in || 0,
          punched_out: res.data.punched_out || 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch today summary:", err);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary();
  }, [filterSocietyId, isSuperAdmin]);

  useEffect(() => {
    if (mainTab === "ATTENDANCE") {
      fetchAttendance();
    }
  }, [mainTab, filterSocietyId, attendanceDate, attendanceGuardFilter, attendanceStatusFilter]);

  /* ── SOCIETY SHIFT TIMINGS ── */
  const fetchTimings = async (societyId) => {
    if (!societyId) {
      setShiftTimings(null);
      setTimingsDirty(false);
      return;
    }
    setTimingsLoading(true);
    try {
      const res = await API.get("/guard-shift/timings", {
        params: isSuperAdmin ? { society_id: societyId } : {},
      });
      const t = res.data?.timings || {};
      setShiftTimings({
        MORNING: t.MORNING || DEFAULTS.MORNING,
        AFTERNOON: t.AFTERNOON || DEFAULTS.AFTERNOON,
        NIGHT: t.NIGHT || DEFAULTS.NIGHT,
      });
      setTimingsDirty(false);
    } catch (err) {
      const msg = err?.response?.data?.message || t("guardErrLoadTimings", "Failed to load shift timings.");
      showError(msg);
      setShiftTimings(null);
    } finally {
      setTimingsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimings(timingsSocietyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timingsSocietyId]);

  /* ── TIMEZONE & CURRENT TIME TRACKING ── */
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()).split(":").map(Number);
      return parts[0] * 60 + parts[1];
    } catch {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
  });

  useEffect(() => {
    const updateTime = () => {
      try {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: APP_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()).split(":").map(Number);
        setCurrentMinutes(parts[0] * 60 + parts[1]);
      } catch {
        const now = new Date();
        setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
      }
    };
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const isValidHHmm = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

  const toMins = (v) => {
    const [h, m] = (v || "0:0").split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const isActiveNow = (s, e) => {
    if (!s || !e || !isValidHHmm(s) || !isValidHHmm(e)) return false;
    const a = toMins(s), b = toMins(e);
    if (a === b) return true;
    if (a < b) return currentMinutes >= a && currentMinutes < b;
    return currentMinutes >= a || currentMinutes < b;
  };

  const durationLabel = (s, e) => {
    if (!s || !e || !isValidHHmm(s) || !isValidHHmm(e)) return "…";
    let d = (toMins(e) - toMins(s) + 1440) % 1440;
    if (d === 0) d = 1440;
    const h = Math.floor(d / 60), m = d % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const activeShift = timingsLoading || !shiftTimings
    ? null
    : SHIFT_WINDOWS.find((w) => isActiveNow(shiftTimings[w.type]?.start, shiftTimings[w.type]?.end)) || null;

  /* Helper to get today's shift for a guard */
  const getGuardTodayShift = (guardId) => {
    return shiftForToday(guardShifts[guardId] || [], todayISO);
  };

  /* Helper to check if a guard is active on the current active shift right now */
  const isGuardOnCurrentShift = (guardId) => {
    if (!activeShift) return false;
    const shift = getGuardTodayShift(guardId);
    return shift?.shift_type === activeShift.type;
  };

  /* Guards actively on duty right now on the current shift */
  const activeGuards = useMemo(() => {
    if (!activeShift) return [];
    return guards.filter((g) => isGuardOnCurrentShift(g.id));
  }, [guards, guardShifts, todayISO, activeShift, currentMinutes]);

  /* Guards scheduled for any shift today */
  const todayGuards = useMemo(() => {
    return guards.filter((g) => Boolean(getGuardTodayShift(g.id)));
  }, [guards, guardShifts, todayISO]);

  /* Guards off duty today */
  const offDutyGuards = useMemo(() => {
    return guards.filter((g) => !getGuardTodayShift(g.id));
  }, [guards, guardShifts, todayISO]);

  /* Filter tab & search query */
  const [filterTab, setFilterTab] = useState("ALL"); // "ALL" | "ON_DUTY" | "TODAY" | "OFF_DUTY"
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGuards = useMemo(() => {
    let list = guards;
    if (filterTab === "ON_DUTY") {
      list = activeGuards;
    } else if (filterTab === "TODAY") {
      list = todayGuards;
    } else if (filterTab === "OFF_DUTY") {
      list = offDutyGuards;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.email && g.email.toLowerCase().includes(q))
      );
    }

    // Always prioritize active on-duty guards at position #1 in records
    return [...list].sort((a, b) => {
      const aActive = isGuardOnCurrentShift(a.id) ? 1 : 0;
      const bActive = isGuardOnCurrentShift(b.id) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const aToday = getGuardTodayShift(a.id) ? 1 : 0;
      const bToday = getGuardTodayShift(b.id) ? 1 : 0;
      if (aToday !== bToday) return bToday - aToday;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [guards, filterTab, searchQuery, activeGuards, todayGuards, offDutyGuards, guardShifts, todayISO, activeShift, currentMinutes]);

  const timingsHaveOverlap = () => {
    if (!shiftTimings) return false;
    const toMin = (v) => {
      const [h, m] = v.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const inWindow = (mins, s, e) => {
      const a = toMin(s), b = toMin(e);
      if (a === b) return true;
      if (a < b) return mins >= a && mins < b;
      return mins >= a || mins < b;
    };
    const rows = [shiftTimings.MORNING, shiftTimings.AFTERNOON, shiftTimings.NIGHT];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (
          (isValidHHmm(a.start) && isValidHHmm(a.end) && isValidHHmm(b.start) && isValidHHmm(b.end)) &&
          (inWindow(toMin(b.start), a.start, a.end) || inWindow(toMin(a.start), b.start, b.end))
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const handleSaveTimings = async () => {
    if (!timingsSocietyId) {
      showError(isSuperAdmin ? t("guardErrSelectSociety", "Select a society to configure shift timings.") : t("guardErrNoSociety", "Society not found."));
      return;
    }
    if (!shiftTimings) return;
    for (const type of ["MORNING", "AFTERNOON", "NIGHT"]) {
      const r = shiftTimings[type];
      if (!r || !isValidHHmm(r.start) || !isValidHHmm(r.end)) {
        showError(t("guardErrInvalidTimings", "{type} shift requires valid start and end times (HH:mm).", { type: shiftName(type) }));
        return;
      }
    }
    if (timingsHaveOverlap()) {
      showError(t("guardErrOverlap", "Shift windows must not overlap. Adjust the timings so each time of day belongs to one shift."));
      return;
    }
    try {
      setTimingsSaving(true);
      await API.put("/guard-shift/timings", {
        ...(isSuperAdmin ? { society_id: timingsSocietyId } : {}),
        timings: shiftTimings,
      });
      setTimingsDirty(false);
      setShowTimingsModal(false);
      showSuccess(t("guardSuccessTimingsSaved", "Shift timings updated. Guards reflect the new windows immediately."));
    } catch (err) {
      const msg = err?.response?.data?.message || t("guardErrSaveTimings", "Failed to save shift timings.");
      showError(msg);
    } finally {
      setTimingsSaving(false);
    }
  };

  const handleResetTimings = async () => {
    if (!timingsSocietyId) {
      showError(isSuperAdmin ? t("guardErrSelectSociety", "Select a society to configure shift timings.") : t("guardErrNoSociety", "Society not found."));
      return;
    }
    try {
      setTimingsSaving(true);
      await API.put("/guard-shift/timings", {
        ...(isSuperAdmin ? { society_id: timingsSocietyId } : {}),
        timings: DEFAULTS,
      });
      setShiftTimings({
        MORNING: { ...DEFAULTS.MORNING },
        AFTERNOON: { ...DEFAULTS.AFTERNOON },
        NIGHT: { ...DEFAULTS.NIGHT },
      });
      setTimingsDirty(false);
      showSuccess(t("guardSuccessTimingsReset", "Shift timings reset to defaults (08:00–16:00 / 16:00–00:00 / 00:00–08:00)."));
    } catch (err) {
      const msg = err?.response?.data?.message || t("guardErrResetTimings", "Failed to reset shift timings.");
      showError(msg);
    } finally {
      setTimingsSaving(false);
    }
  };

  const setTimingField = (type, field, value) => {
    setShiftTimings(prev => prev ? { ...prev, [type]: { ...prev[type], [field]: value } } : prev);
    setTimingsDirty(true);
  };

  const handleOpenAddModal = () => {
    if (!hasPermission(user, "guard", "create")) {
      showUnauthorized(t("guardErrPermissionAdd", "You do not have permission to add guards."));
      return;
    }
    setEditingId(null);
    setFormData({ name: "", email: "", password: "Admin@123", society_id: filterSocietyId === "ALL" ? "" : filterSocietyId });
    setPhotoFile(null);
    setShowGuardModal(true);
  };

  const handleEdit = (g) => {
    if (!hasPermission(user, "guard", "edit")) {
      showUnauthorized(t("guardErrPermissionEdit", "You do not have permission to edit guard details."));
      return;
    }
    setEditingId(g.id);
    setFormData({
      name: g.name,
      email: g.email,
      password: "",
      society_id: g.society_id || "",
    });
    setPhotoFile(null);
    setPhotoPreview(g.profile_picture || null);
    setShowGuardModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const reqAction = editingId ? "edit" : "create";
    if (!hasPermission(user, "guard", reqAction)) {
      showUnauthorized(t("guardErrPermissionAction", "You do not have permission to {action} guards.", { action: reqAction === "edit" ? t("guardActionEdit", "edit") : t("guardActionCreate", "create") }));
      return;
    }
    const nameErr = getTitleError(formData.name, "Guard name");
    if (nameErr) { showError(nameErr); return; }
    const emailErr = getEmailError(formData.email);
    if (emailErr) { showError(emailErr); return; }
    if (!editingId) {
      if (!formData.password) { showError(t("guardErrPasswordRequired", "Password is required for new guards.")); return; }
      if (formData.password.length < 6) { showError(t("guardErrPasswordMin", "Password must be at least 6 characters.")); return; }
    }

    try {
      setSubmitLoading(true);
      if (editingId) {
        const updatePayload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          ...(formData.password ? { password: formData.password } : {}),
          ...(isSuperAdmin && formData.society_id ? { society_id: formData.society_id } : {}),
        };
        if (photoFile) {
          const fd = new FormData();
          Object.entries(updatePayload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) fd.append(key, String(value));
          });
          fd.append("photo", photoFile);
          await API.put(`/guards/${editingId}`, fd);
        } else {
          await API.put(`/guards/${editingId}`, updatePayload);
        }
      } else {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          society_id: isSuperAdmin ? (formData.society_id || filterSocietyId) : user?.society_id,
        };
        if (photoFile) {
          const fd = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) fd.append(key, String(value));
          });
          fd.append("photo", photoFile);
          await API.post("/guards", fd);
        } else {
          await API.post("/guards", payload);
        }
      }
      setShowGuardModal(false);
      setEditingId(null);
      setFormData({ name: "", email: "", password: "", society_id: "" });
      setPhotoFile(null);
      fetchGuards();
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || t("guardErrRestricted", "Operation restricted"));
      } else {
        showError(err.response?.data?.message || t("guardErrOperationFailed", "Operation failed"));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenDelete = (g) => {
    if (!hasPermission(user, "guard", "delete")) {
      showUnauthorized(t("guardErrPermissionDelete", "You do not have permission to delete guards."));
      return;
    }
    setDeleteConfirm({ isOpen: true, id: g.id, societyId: g.society_id, loading: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    if (!hasPermission(user, "guard", "delete")) {
      showUnauthorized(t("guardErrPermissionDelete", "You do not have permission to delete guards."));
      setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false });
      return;
    }
    try {
      setDeleteConfirm(p => ({ ...p, loading: true }));
      await API.delete(`/guards/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false });
      fetchGuards();
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || t("guardErrRestricted", "Operation restricted"));
      } else {
        showError(err.response?.data?.message || t("guardErrDelete", "Failed to delete guard"));
      }
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

  /* ── SHIFTS ── */
  /* Edit one specific assignment. There is deliberately no "pick a different
     shift" fallback any more: the caller always passes the row the user chose
     from the "All Shifts" list, so a record can never be edited by accident.
     `allowCompleted` is only for the 409 overlap shortcut: the API answers
     "this range is already taken, edit that shift" and the taken shift may sit
     in the past. Everywhere else a completed assignment stays read-only. */
  const openShiftModal = (guard, shift, { allowCompleted = false } = {}) => {
    if (!hasPermission(user, "guard", "edit_shift")) {
      showUnauthorized(t("guardErrPermissionShift", "You do not have permission to manage guard shifts."));
      return;
    }
    if (!shift) return;
    if (!allowCompleted && !isShiftEditable(shift, todayISO)) {
      showError(t("guardErrCompletedShift", "This shift has already ended and can no longer be edited."));
      return;
    }
    setSelectedGuard(guard);
    setShiftError("");
    setEditingShiftId(shift.id);
    setShiftForm({
      shift_type: shift.shift_type,
      start_date: shift.start_date,
      end_date: shift.end_date,
    });
    setShowShiftModal(true);
  };

  /* The table row only ever shows today's shift. Everything else - running,
     upcoming and history - lives behind this one action. */
  const openAllShiftsModal = (guard) => {
    setSelectedGuard(guard);
    setShowAllShiftsModal(true);
  };

  /* Hand off from the list to the editor. The list closes because two stacked
     modals would overlap, and this flag brings it back once the editor is done
     so the user keeps their place in the history. */
  const leaveListForEditor = (open) => {
    setReopenListAfterEdit(true);
    setShowAllShiftsModal(false);
    open();
  };

  const closeShiftModal = () => {
    setShowShiftModal(false);
    if (reopenListAfterEdit) {
      setReopenListAfterEdit(false);
      setShowAllShiftsModal(true);
    }
  };

  /* Unlike openShiftModal(guard) - which falls back to an existing assignment -
     this always opens a blank form, so "Assign New Shift" never silently edits
     an existing record (or a completed one). */
  const openNewShiftModal = (guard) => {
    if (!hasPermission(user, "guard", "edit_shift")) {
      showUnauthorized(t("guardErrPermissionShift", "You do not have permission to manage guard shifts."));
      return;
    }
    setSelectedGuard(guard);
    setShiftError("");
    setEditingShiftId(null);
    setShiftForm({ shift_type: "", start_date: "", end_date: "" });
    setShowShiftModal(true);
  };

  const selectedGuardShifts = useMemo(
    () => sortShiftsForDisplay(guardShifts[selectedGuard?.id] || [], todayISO),
    [guardShifts, selectedGuard?.id, todayISO],
  );

  const shiftStatusLabel = (status) => {
    if (status === SHIFT_TODAY) return t("guardShiftStatusToday", "Today");
    if (status === SHIFT_UPCOMING) return t("guardShiftStatusUpcoming", "Upcoming");
    return t("guardShiftStatusCompleted", "Completed");
  };

  const shiftStatusVariant = (status) => {
    if (status === SHIFT_TODAY) return "success";
    if (status === SHIFT_UPCOMING) return "info";
    return "neutral";
  };

  const formatAttendanceTime = (dt) => {
    if (!dt) return "—";
    try {
      const d = new Date(dt);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: APP_TIMEZONE,
      });
    } catch {
      return dt;
    }
  };

  const formatWorkedDuration = (minutes) => {
    if (minutes === null || minutes === undefined) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  /* ── ATTENDANCE TABLE COLUMNS ── */
  const attendanceColumns = [
    {
      key: "guard",
      header: t("guardColGuard", "Guard"),
      render: (row) => {
        const g = row.guard || {};
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="gt-avatar-wrap">
              <Avatar name={g.name} src={g.profile_picture} size={36} />
            </div>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {g.name || "Guard"}
              </div>
              {g.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  <MdPhone size={11} /> {g.phone}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    ...(isSuperAdmin
      ? [{
          key: "society",
          header: t("guardColSociety", "Society"),
          hiddenMobile: true,
          render: (row) => {
            const socName = row.society?.name || t("guardUnknownSociety", "Society");
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MdApartment size={13} style={{ color: "var(--accent)", opacity: 0.8 }} />
                <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {socName}
                </span>
              </div>
            );
          },
        }]
      : []),
    {
      key: "date_shift",
      header: t("guardColDateShift", "Date & Shift"),
      render: (row) => {
        const shiftType = row.shift?.shift_type || "MORNING";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
              <MdToday size={13} style={{ color: "var(--text-secondary)" }} />
              {row.attendance_date}
            </div>
            <ShiftBadge type={shiftType} t={t} />
          </div>
        );
      },
    },
    {
      key: "punch_in",
      header: t("guardColPunchIn", "Punch In"),
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.86rem", fontWeight: 700, color: "#10b981" }}>
            <MdAccessTime size={13} />
            {formatAttendanceTime(row.punch_in)}
          </div>
          {row.punch_in_distance !== null && row.punch_in_distance !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", color: "var(--text-tertiary)" }}>
              <MdLocationOn size={11} style={{ color: "#10b981" }} />
              <span>{Math.round(Number(row.punch_in_distance))}m from center</span>
              
            </div>
          )}
        </div>
      ),
    },
    {
      key: "selfie",
      header: t("guardColSelfie", "Selfie"),
      render: (row) => {
        const selfieUrl = row.punch_in_selfie_url;
        if (!selfieUrl) {
          return <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", fontStyle: "italic" }}>No photo</span>;
        }
        return (
          <div
            onClick={() => setSelectedSelfie(row)}
            title={t("guardClickToViewSelfie", "Click to enlarge selfie & verification data")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              border: "1.5px solid rgba(16, 185, 129, 0.4)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            <img
              src={selfieUrl}
              alt="Guard Punch In Selfie"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
            >
              <MdZoomIn size={16} color="#ffffff" />
            </div>
          </div>
        );
      },
    },
    {
      key: "punch_out",
      header: t("guardColPunchOut", "Punch Out"),
      render: (row) => {
        if (!row.punch_out) {
          return (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "#f59e0b",
              background: "rgba(245, 158, 11, 0.12)",
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
              {t("guardInProgress", "On Duty")}
            </span>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
              <MdAccessTime size={13} style={{ color: "var(--text-secondary)" }} />
              {formatAttendanceTime(row.punch_out)}
            </div>
            {row.punch_out_distance !== null && row.punch_out_distance !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", color: "var(--text-tertiary)" }}>
                <MdLocationOn size={11} />
                <span>{Math.round(Number(row.punch_out_distance))}m from center</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "duration",
      header: t("guardColDuration", "Worked Duration"),
      render: (row) => {
        if (row.worked_minutes !== null && row.worked_minutes !== undefined) {
          return (
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatWorkedDuration(row.worked_minutes)}
            </span>
          );
        }
        if (row.punch_in && !row.punch_out) {
          const diffMin = Math.max(0, Math.round((Date.now() - new Date(row.punch_in).getTime()) / 60000));
          return (
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#10b981" }}>
              {formatWorkedDuration(diffMin)} (active)
            </span>
          );
        }
        return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
      },
    },
    {
      key: "status",
      header: t("guardColStatus", "Status"),
      align: "right",
      render: (row) => {
        if (row.status === "PUNCHED_IN") {
          return (
            <GlobalBadge variant="success" icon={MdCheckCircle} size="sm">
              {t("guardStatusOnDuty", "On Duty")}
            </GlobalBadge>
          );
        }
        if (row.status === "PUNCHED_OUT") {
          return (
            <GlobalBadge variant="neutral" size="sm">
              {t("guardStatusCompleted", "Punched Out")}
            </GlobalBadge>
          );
        }
        return (
          <GlobalBadge variant="info" size="sm">
            {row.status || "Recorded"}
          </GlobalBadge>
        );
      },
    },
  ];

  const handleShiftSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!shiftForm.shift_type || !shiftForm.start_date || !shiftForm.end_date) {
      setShiftError(t("guardErrFillShift", "Please fill all shift fields."));
      return;
    }
    if (new Date(shiftForm.start_date) > new Date(shiftForm.end_date)) {
      setShiftError(t("guardErrStartAfterEnd", "Start date cannot be after End date."));
      return;
    }

    const existingShift = (guardShifts[selectedGuard.id] || [])
      .filter(s => !editingShiftId || s.id !== editingShiftId)
      .find(s => shiftForm.start_date <= s.end_date && shiftForm.end_date >= s.start_date);
    if (existingShift) {
      setShiftError(
        t("guardErrDuplicateShift", "Guard already has a {label} shift from {start} to {end}. A guard can only have one shift per date — edit that shift instead of creating a new one.", { label: shiftName(existingShift.shift_type), start: existingShift.start_date, end: existingShift.end_date })
      );
      return;
    }

    try {
      setSubmitLoading(true);
      if (editingShiftId) {
        await API.put(`/guards/shifts/${editingShiftId}`, shiftForm);
      } else {
        await API.post(`/guards/${selectedGuard.id}/shifts`, shiftForm);
      }
      closeShiftModal();
      fetchGuards();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409 && data?.existingShift && !editingShiftId) {
        openShiftModal(selectedGuard, data.existingShift, { allowCompleted: true });
      } else {
        setShiftError(data?.message || t("guardErrSaveShift", "Failed to save shift"));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      key: "guard",
      header: t("guardColGuard") || "Guard",
      render: (g) => {
        const onDuty = isGuardOnCurrentShift(g.id);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`gt-avatar-wrap ${onDuty ? "gt-avatar-wrap--active" : ""}`}>
              <Avatar name={g.name} src={g.profile_picture} size={36} />
              {onDuty && <span className="gt-avatar-dot--active" title={t("guardOnDutyNow", "On Duty Now")} />}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {g.name}
                </span>
                {onDuty && (
                  <span className="gt-onduty-badge" style={{ fontSize: 9.5, padding: "2px 7px" }}>
                    <span className="gt-onduty-badge__dot" style={{ width: 5, height: 5 }} />
                    {t("guardOnDutyNow", "ON DUTY")}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: t("guardColEmail") || "Email",
      render: (g) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
          <MdEmail size={13} style={{ color: "var(--text-tertiary)" }} />
          <span>{g.email}</span>
        </div>
      ),
    },
    ...(isSuperAdmin
      ? [{
          key: "society",
          header: t("guardColSociety", "Society"),
          hiddenMobile: true,
          render: (g) => {
            const societyName =
              (g.societyName && g.societyName !== "NA"
                ? g.societyName
                : societiesList.find(s => String(s.id) === String(g.society_id))?.name) ||
              t("guardNotAssigned", "Not assigned");
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MdApartment size={13} style={{ color: "var(--accent)", opacity: 0.8 }} />
                <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {societyName}
                </span>
              </div>
            );
          },
        }]
      : []),
    {
      /* Only the assignment covering today */
      key: "shift",
      header: t("guardColShift") || "Shift",
      render: (g) => {
        const todayShift = getGuardTodayShift(g.id);
        if (!todayShift) {
          return (
            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontStyle: "italic" }}>
              {t("guardNoShiftToday", "No Shift Today")}
            </span>
          );
        }
        return <ShiftBadge type={todayShift.shift_type} t={t} />;
      },
    },
    {
      key: "schedule",
      header: t("guardColSchedule") || "Schedule",
      hiddenMobile: true,
      render: (g) => {
        const todayShift = getGuardTodayShift(g.id);
        if (!todayShift) {
          return (
            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", opacity: 0.6 }}>—</span>
          );
        }
        const timing = shiftTimings?.[todayShift.shift_type];
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <MdCalendarToday size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap" }}>{formatShiftRange(todayShift)}</span>
            </div>
            {timing && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                {fmtTime12h(timing.start)} – {fmtTime12h(timing.end)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: t("guardColActions") || "Actions",
      align: "right",
      render: (g) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {canEditGuard && (
            <GlobalButton
              variant="edit"
              size="sm"
              icon={MdEdit}
              onClick={() => handleEdit(g)}
              title={t("guardEditBtn", "Edit")}
            >
              {t("guardEditBtn", "Edit")}
            </GlobalButton>
          )}
          {/* View Attendance Log for this guard */}
          <GlobalButton
            variant="secondary"
            size="sm"
            icon={MdFingerprint}
            onClick={() => {
              setAttendanceGuardFilter(String(g.id));
              setMainTab("ATTENDANCE");
            }}
            title={t("guardViewAttendance", "View Attendance")}
          >
            {t("guardAttendanceBtn", "Attendance")}
          </GlobalButton>
          {/* The single shift-related action on the row. Editing happens inside
              the modal, where a completed assignment can be recognised. */}
          <GlobalButton
            variant="info"
            size="sm"
            icon={MdCalendarMonth}
            onClick={() => openAllShiftsModal(g)}
            title={t("guardViewAllShifts", "View All Shifts")}
          >
            {t("guardViewAllShifts", "View All Shifts")}
          </GlobalButton>
          {canDeleteGuard && (
            <GlobalButton
              variant="delete"
              size="sm"
              icon={MdDelete}
              onClick={() => handleOpenDelete(g)}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(158, 88, 255, 0.3)",
              color: "#ffffff",
            }}
          >
            <MdSecurity size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("guardTitle", "Security & Guard Management")}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {guards.length} {t("guardRegistered", "Guards Registered")} • {attendanceSummary.punched_in} {t("guardOnDutyNow", "On Duty Now")}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Main Sub-Tab Switcher */}
          <SlidingTabs
            value={mainTab}
            onChange={(tab) => {
              setMainTab(tab);
              if (tab === "ATTENDANCE") {
                setAttendanceGuardFilter("ALL");
                fetchAttendance();
                fetchAttendanceSummary();
              }
            }}
            items={[
              {
                id: "ROSTER",
                icon: <MdSecurity size={15} />,
                label: t("guardTabRoster", "Guards & Shift Roster"),
                badge: guards.length,
              },
              {
                id: "ATTENDANCE",
                icon: <MdFingerprint size={16} />,
                label: t("guardTabAttendance", "Attendance Records"),
                extra: attendanceSummary.punched_in > 0 ? (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: mainTab === "ATTENDANCE" ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                    color: mainTab === "ATTENDANCE" ? "#fff" : "#10b981",
                    border: mainTab === "ATTENDANCE" ? "none" : "1px solid rgba(16, 185, 129, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />
                    {attendanceSummary.punched_in} Active
                  </span>
                ) : null,
              },
            ]}
          />

          {isSuperAdmin && (
            <Select
              className="input"
              value={filterSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val);
              }}
              style={{ height: 40, fontSize: 13, minWidth: 190 }}
            >
              <option value="ALL">{t("allSocietiesGlobalView")}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          {canCreateGuard && mainTab === "ROSTER" && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenAddModal}
            >
              {t("guardAddBtn") || "Add Guard"}
            </GlobalButton>
          )}
        </div>
      </div>

{mainTab === "ROSTER" ? (
        <>
      {/* ── SOCIETY SHIFT TIMINGS CONFIG ── */}
      {canShiftGuard && (
        <div style={{
          marginTop: 14,
          borderRadius: 16,
          border: "1px solid var(--glass-border)",
          background: "var(--card-bg)",
          backdropFilter: "blur(12px)",
          padding: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, rgba(160,90,255,0.2), rgba(16,185,129,0.15))",
                border: "1px solid rgba(160,90,255,0.3)", color: "var(--accent)",
                boxShadow: "0 0 18px rgba(160,90,255,0.15)",
              }}>
                <MdSchedule size={18} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.01em" }}>
                  {t("guardShiftTimingsTitle") || "Guard Shift Timings"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
                  {isSuperAdmin
                    ? (timingsSocietyId
                        ? t("guardTimingsCfgSelected", "Configure shift windows for the selected society.")
                        : t("guardTimingsCfgPick", "Select a society to configure its shift windows."))
                    : t("guardShiftTimingsSubtitle", "These windows decide when each shift type is active for all guards.")}
                </div>
              </div>
            </div>

            {timingsSocietyId && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {activeShift && (
                  <div className="gt-live-pill" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 999, fontSize: 11,
                    fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    background: activeShift.tint, border: `1px solid ${activeShift.accent}44`,
                    color: activeShift.accent,
                  }}>
                    <span className="gt-live-dot" />
                    {t("guardActiveNow", "Now: {label}", { label: activeShift.label })}
                  </div>
                )}
                <GlobalButton
                  variant="primary"
                  size="sm"
                  icon={MdEdit}
                  onClick={() => setShowTimingsModal(true)}
                  disabled={timingsLoading || timingsSaving}
                >
                  {t("guardShiftTimingsEdit") || "Edit Shift Timings"}
                </GlobalButton>
              </div>
            )}
          </div>

          {timingsSocietyId ? (
            <div style={{ marginTop: 16, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {SHIFT_WINDOWS.map(({ type, label, icon, accent, glow }, ci) => {
                const ShiftIcon = icon;
                const r = shiftTimings?.[type];
                const active = timingsLoading ? false : isActiveNow(r?.start, r?.end);
                return (
                  <div
                    key={type}
                    className={`gt-shift-card ${active ? "gt-shift-card--active" : ""}`}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      padding: "16px 14px",
                      borderRadius: 18,
                      textAlign: "center",
                      background: `linear-gradient(150deg, ${accent}1F 0%, ${accent}0A 55%, var(--card-bg) 100%)`,
                      border: `1.5px solid ${active ? accent : `${accent}3D`}`,
                      boxShadow: active
                        ? `0 14px 32px -10px ${glow}, inset 0 1px 0 rgba(255,255,255,0.12)`
                        : `0 4px 18px ${glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                      animationDelay: `${ci * 70}ms`,
                    }}
                  >
                    <div style={{
                      position: "absolute", top: -24, right: -24, width: 84, height: 84,
                      borderRadius: "50%", background: `${accent}1A`, pointerEvents: "none",
                    }} />

                    <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 13,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `linear-gradient(135deg, ${accent}30, ${accent}12)`,
                        border: `1px solid ${accent}45`, color: accent,
                        boxShadow: `0 6px 16px -6px ${glow}`,
                      }}>
                        <ShiftIcon size={20} />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-primary)" }}>
                        {label}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}>
                        <span style={{
                          fontSize: 15, fontWeight: 800, color: "var(--text-primary)",
                          fontVariantNumeric: "tabular-nums",
                          background: "var(--card-inner-bg)",
                          border: "1px solid var(--glass-border)",
                          padding: "3px 9px", borderRadius: 8,
                        }}>
                          {r ? fmtTime12h(r.start) : "…"}
                        </span>
                        <span style={{ color: accent, fontWeight: 800, fontSize: 14 }}>→</span>
                        <span style={{
                          fontSize: 15, fontWeight: 800, color: "var(--text-primary)",
                          fontVariantNumeric: "tabular-nums",
                          background: "var(--card-inner-bg)",
                          border: "1px solid var(--glass-border)",
                          padding: "3px 9px", borderRadius: 8,
                        }}>
                          {r ? fmtTime12h(r.end) : "…"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, minHeight: 20 }}>
                      {(() => {
                        const shiftGuardCount = guards.filter(g => getGuardTodayShift(g.id)?.shift_type === type).length;
                        if (active) {
                          return (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "3px 10px", borderRadius: 999, fontSize: 10,
                                fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                                background: accent, color: "#ffffff", boxShadow: `0 4px 12px ${glow}`,
                              }}>
                                <span className="gt-pill-dot" /> {t("guardActiveNowPill", "Active Now")}
                              </span>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: shiftGuardCount > 0 ? accent : "#f59e0b", marginTop: 2 }}>
                                {shiftGuardCount > 0
                                  ? t("guardCountOnDuty", "{count} Guard(s) On Duty", { count: shiftGuardCount })
                                  : t("guardUnattended", "Unassigned")}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                              {r ? t("guardDurationShift", "{duration} shift", { duration: durationLabel(r.start, r.end) }) : "—"}
                            </span>
                            {shiftGuardCount > 0 && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)" }}>
                                {t("guardAssignedTodayCount", "{count} assigned today", { count: shiftGuardCount })}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>
              {isSuperAdmin
                ? t("guardTimingsHintPick", "Switch the society filter above from “All” to a specific society to edit its shift timings.")
                : t("guardNoSocietyContext", "No society context available.")}
            </div>
          )}
        </div>
      )}

      {/* ── FILTER TABS & SEARCH BAR ── */}
      <div style={{
        marginTop: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <SlidingTabs
            value={filterTab}
            onChange={setFilterTab}
            items={[
              { id: "ALL", label: t("guardFilterAll", "All Guards"), badge: guards.length },
              {
                id: "ON_DUTY",
                icon: <span className="gt-live-dot" style={{ color: filterTab === "ON_DUTY" ? "#fff" : "#10b981" }} />,
                label: t("guardFilterOnDuty", "On Duty Now"),
                badge: activeGuards.length,
              },
              { id: "TODAY", label: t("guardFilterToday", "Scheduled Today"), badge: todayGuards.length },
              { id: "OFF_DUTY", label: t("guardFilterOffDuty", "Off Duty"), badge: offDutyGuards.length },
            ]}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 220 }}>
          <input
            type="text"
            placeholder={t("guardSearchPlaceholder", "Search guards by name, email...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ height: 36, fontSize: 12, borderRadius: 10, padding: "0 12px", width: "100%" }}
          />
        </div>
      </div>

      {/* ── GUARD LIST TABLE ── */}
      <GlobalTable
        columns={columns}
        data={filteredGuards}
        rowClassName={(g) => isGuardOnCurrentShift(g.id) ? "gt-row--active-guard" : ""}
        loading={loading}
        emptyMessage={
          filterTab === "ON_DUTY"
            ? t("guardEmptyOnDuty", "No security guards on duty right now.")
            : filterTab === "TODAY"
            ? t("guardEmptyToday", "No guards scheduled for shifts today.")
            : t("guardEmpty") || "No security guards registered yet."
        }
        emptyIcon={MdSecurity}
        emptyAction={
          canCreateGuard ? (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenAddModal}
            >
              {t("guardAddBtn") || "Add Guard"}
            </GlobalButton>
          ) : null
        }
      />
        </>
      ) : (
        /* ── ATTENDANCE VIEW ── */
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <StatCard
              tone="brand"
              value={attendanceSummary.total}
              label={t("guardKpiTotalToday", "Today's Check-ins")}
              icon={MdFingerprint}
              subtext="Total shift punch-ins"
            />
            <StatCard
              tone="success"
              value={attendanceSummary.punched_in}
              label={t("guardKpiOnDuty", "Currently On Duty")}
              icon={MdSecurity}
              subtext={`${attendanceSummary.punched_in} active on duty`}
            />
            <StatCard
              tone="info"
              value={attendanceSummary.punched_out}
              label={t("guardKpiCompleted", "Shifts Completed")}
              icon={MdCheckCircle}
              subtext="Punched out safely"
            />
          </div>

          {/* Attendance Filters Bar */}
          <div style={{
            padding: 14,
            borderRadius: 16,
            background: "var(--card-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Date Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {t("guardFilterDate", "Date:")}
                </span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="input"
                  style={{ height: 36, fontSize: 12, borderRadius: 8, padding: "0 8px", width: "auto" }}
                />
                {attendanceDate !== todayISO && (
                  <button
                    type="button"
                    onClick={() => setAttendanceDate(todayISO)}
                    style={{
                      border: "none",
                      background: "rgba(158, 88, 255, 0.15)",
                      color: "var(--accent)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 9px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {t("today", "Today")}
                  </button>
                )}
                {attendanceDate && (
                  <button
                    type="button"
                    onClick={() => setAttendanceDate("")}
                    title="Clear date filter to view all history"
                    style={{
                      border: "none",
                      background: "var(--card-inner-bg)",
                      color: "var(--text-tertiary)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "5px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {t("allDates", "All Dates")}
                  </button>
                )}
              </div>

              {/* Guard Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {t("guardColGuard", "Guard:")}
                </span>
                <Select
                  className="input"
                  value={attendanceGuardFilter}
                  onChange={(e) => setAttendanceGuardFilter(e.target.value)}
                  style={{ height: 36, fontSize: 12, borderRadius: 8, minWidth: 140 }}
                >
                  <option value="ALL">{t("allGuards", "All Guards")}</option>
                  {guards.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Status Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {t("guardColStatus", "Status:")}
                </span>
                <Select
                  className="input"
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  style={{ height: 36, fontSize: 12, borderRadius: 8, minWidth: 130 }}
                >
                  <option value="ALL">{t("allStatuses", "All Statuses")}</option>
                  <option value="PUNCHED_IN">{t("guardStatusOnDuty", "On Duty (Punched In)")}</option>
                  <option value="PUNCHED_OUT">{t("guardStatusCompleted", "Punched Out")}</option>
                </Select>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GlobalButton
                variant="secondary"
                size="sm"
                icon={MdRefresh}
                onClick={() => {
                  fetchAttendance();
                  fetchAttendanceSummary();
                }}
                disabled={attendanceLoading}
              >
                {t("refresh", "Refresh")}
              </GlobalButton>
            </div>
          </div>

          {/* Attendance Table */}
          <GlobalTable
            columns={attendanceColumns}
            data={attendanceList}
            loading={attendanceLoading}
            emptyMessage={t("guardAttendanceEmpty", "No attendance records found for the selected filters.")}
            emptyIcon={MdFingerprint}
          />
        </div>
      )}

      {/* ── ADD / EDIT GUARD MODAL ── */}
      <GlobalModal
        isOpen={showGuardModal}
        onClose={() => setShowGuardModal(false)}
        title={editingId ? t("guardFormTitleEdit", "Update Security Guard") : t("guardFormTitle") || "Add Security Guard"}
        subtitle={t("guardModalSubtitle", "Credentials and Society Assignment")}
        icon={MdPerson}
        size="md"
        showFooter
        submitLabel={editingId ? t("guardUpdateBtn", "Update Guard") : t("guardCreateBtn") || "Add Guard"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleSubmit}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || Boolean(getTitleError(formData.name, "Guard name")) || Boolean(getEmailError(formData.email)) || (!editingId && (!formData.password || formData.password.length < 6))}
        submitIcon={editingId ? MdEdit : MdAdd}
        submitVariant={editingId ? "edit" : "primary"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <SectionLabel>{t("guardColSociety", "Society")}</SectionLabel>
              <Select
                className="input"
                value={formData.society_id}
                onChange={e => setFormData({ ...formData, society_id: e.target.value })}
                required
              >
                <option value="">{t("guardSelectSociety", "Select Society")}</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          )}

          <div>
            <SectionLabel>{t("guardName")}</SectionLabel>
            <div style={{ position: "relative" }}>
              <MdPerson size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder={t("guardNamePlaceholder")}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div>
            <SectionLabel>{t("guardEmail")}</SectionLabel>
            <div style={{ position: "relative" }}>
              <MdEmail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="email"
                placeholder={t("guardEmailPlaceholder")}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {!editingId ? (
            <div>
              <SectionLabel>{t("guardDefaultPasswordLabel", "Default Initial Password")}</SectionLabel>
              <div style={{ position: "relative" }}>
                <MdLock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  value="Admin@123"
                  disabled
                  readOnly
                  className="input"
                  style={{
                    paddingLeft: 36,
                    height: 38,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    background: "var(--card-inner-bg)",
                    cursor: "not-allowed",
                    letterSpacing: "0.04em",
                    border: "1.5px solid var(--glass-border)",
                    opacity: 0.95,
                  }}
                />
                <span style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 9.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}>
                  {t("guardFixedDefault", "Fixed Default")}
                </span>
              </div>

              {/* Compact Security Advisory Note */}
              <div style={{
                marginTop: 6,
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(245, 158, 11, 0.07)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>💡</span>
                <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.35, color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#f59e0b" }}>{t("guardPasswordNoteTitle", "Note:")} </strong>
                  {t("guardPasswordNoteDesc", "Guard will use Admin@123 to log in. Please advise them to change password on their own panel after first login.")}
                </p>
              </div>
            </div>
          ) : (
          <div>
            <SectionLabel>{t("guardPasswordNew", "New Password (Leave blank to keep current password)")}</SectionLabel>
            <div style={{ position: "relative" }}>
              <MdLock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("guardPasswordKeepPlaceholder", "Leave blank to keep current password")}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="input"
                style={{ paddingLeft: 36, paddingRight: 40, height: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-secondary)", display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <MdVisibilityOff size={17} /> : <MdVisibility size={17} />}
              </button>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: "var(--text-tertiary)" }}>
              Only enter if you want to change the password. If left empty, current password remains unchanged.
            </p>
          </div>
          )}

          <div>
            <SectionLabel>{`${t("ppTitle", "Profile Picture")} (${t("ppOptional", "Optional")})`}</SectionLabel>
            <ProfilePictureUploader
              name={formData.name || "Guard"}
              currentUrl={photoPreview}
              onFileSelect={(file, previewUrl) => {
                setPhotoFile(file);
                setPhotoPreview(previewUrl);
              }}
              size={64}
              showAvatar
            />
          </div>
        </form>
      </GlobalModal>

      {/* ── SHIFT ASSIGNMENT MODAL ── */}
      <GlobalModal
        isOpen={showShiftModal}
        onClose={closeShiftModal}
        title={editingShiftId ? t("guardShiftEditTitle", "Edit Guard Shift") : t("guardShiftAssignTitle", "Assign Guard Shift")}
        subtitle={selectedGuard ? t("guardShiftFor", "Guard: {name}", { name: selectedGuard.name }) : t("guardShiftScheduleSub", "Shift schedule")}
        icon={MdSchedule}
        size="md"
        showFooter
        submitLabel={editingShiftId ? t("guardShiftUpdateBtn", "Update Shift") : t("guardShiftAssignBtn", "Assign Shift")}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleShiftSubmit}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !shiftForm.shift_type || !shiftForm.start_date || !shiftForm.end_date}
        submitIcon={editingShiftId ? MdEdit : MdAdd}
      >
        <form onSubmit={handleShiftSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* The editor holds exactly one assignment: the one opened from the
              "All Shifts" list, or a blank form for a new assignment. The list
              itself is not repeated here - switching or adding a shift happens
              in that modal, so this stays a single-purpose form. */}

          {shiftError && (
            <div style={{
              color: "#ef4444", fontSize: 12, padding: "8px 12px",
              borderRadius: 8, background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}>
              {shiftError}
            </div>
          )}

          <div>
            <SectionLabel>{t("guardShiftType") || "Shift Type"}</SectionLabel>
            <Select
              className="input"
              value={shiftForm.shift_type}
              onChange={e => setShiftForm({ ...shiftForm, shift_type: e.target.value })}
              required
            >
              <option value="">{t("guardSelectShiftType", "Select Shift Type")}</option>
              <option value="MORNING">{t("guardShiftMorning", "Morning")} ({fmtTime12h(shiftTimings?.MORNING?.start)} - {fmtTime12h(shiftTimings?.MORNING?.end)})</option>
              <option value="AFTERNOON">{t("guardShiftAfternoon", "Afternoon")} ({fmtTime12h(shiftTimings?.AFTERNOON?.start)} - {fmtTime12h(shiftTimings?.AFTERNOON?.end)})</option>
              <option value="NIGHT">{t("guardShiftNight", "Night")} ({fmtTime12h(shiftTimings?.NIGHT?.start)} - {fmtTime12h(shiftTimings?.NIGHT?.end)})</option>
            </Select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <SectionLabel>{t("guardStartDate") || "Start Date"}</SectionLabel>
              <input
                type="date"
                className="input"
                value={shiftForm.start_date}
                onChange={e => setShiftForm({ ...shiftForm, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <SectionLabel>{t("guardEndDate") || "End Date"}</SectionLabel>
              <input
                type="date"
                className="input"
                value={shiftForm.end_date}
                onChange={e => setShiftForm({ ...shiftForm, end_date: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </GlobalModal>

      {/* ── ALL SHIFTS (history + editing entry point) ── */}
      <GlobalModal
        isOpen={showAllShiftsModal}
        onClose={() => setShowAllShiftsModal(false)}
        title={t("guardAllShiftsTitle", "All Shifts - {name}", { name: selectedGuard?.name || "" })}
        subtitle={t("guardAllShiftsSubtitle", "The shift running today is highlighted. Completed shifts are read-only.")}
        icon={MdSchedule}
        size="md"
        footer={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
            <GlobalButton variant="cancel" onClick={() => setShowAllShiftsModal(false)}>
              {t("close") || "Close"}
            </GlobalButton>
            {canShiftGuard && selectedGuard && (
              <GlobalButton
                variant="add"
                icon={MdAdd}
                onClick={() => leaveListForEditor(() => openNewShiftModal(selectedGuard))}
              >
                {t("guardAssignNewShift", "Assign New Shift")}
              </GlobalButton>
            )}
          </div>
        }
      >
        {/* GlobalModal's body already scrolls (maxHeight 90vh, overflowY auto),
            so a guard with a long history grows the list, not the dialog. */}
        {selectedGuardShifts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>{t("guardAssignedShifts", "Assigned Shifts ({count})", { count: selectedGuardShifts.length })}</SectionLabel>
            {selectedGuardShifts.map((s) => {
              const status = shiftStatus(s, todayISO);
              const isToday = status === SHIFT_TODAY;
              const editable = canShiftGuard && isShiftEditable(s, todayISO);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: isToday ? "rgba(37,99,235,0.10)" : "var(--card-inner-bg)",
                    border: `1px solid ${isToday ? "var(--accent)55" : "var(--glass-border)"}`,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <ShiftBadge type={s.shift_type} t={t} />
                      <GlobalBadge variant={shiftStatusVariant(status)} size="sm">
                        {shiftStatusLabel(status)}
                      </GlobalBadge>
                    </div>
                    <div style={{
                      marginTop: 6, fontSize: 12.5, fontWeight: 600,
                      color: "var(--text-secondary)", whiteSpace: "nowrap",
                    }}>
                      {formatShiftRange(s, { year: true })}
                    </div>
                  </div>
                  <GlobalButton
                    variant="edit"
                    size="sm"
                    icon={editable ? MdEdit : MdLock}
                    disabled={!editable}
                    onClick={() => editable && leaveListForEditor(() => openShiftModal(selectedGuard, s))}
                    title={editable
                      ? t("guardEditShiftTitleTooltip", "Edit {type} shift ({range})", { type: shiftName(s.shift_type), range: formatShiftRange(s, { year: true }) })
                      : t("guardErrCompletedShift", "This shift has already ended and can no longer be edited.")}
                  >
                    {t("guardEditBtn", "Edit")}
                  </GlobalButton>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 10px", textAlign: "center" }}>
            <MdSchedule size={30} style={{ color: "var(--text-tertiary)", opacity: 0.6 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
              {t("guardNoShiftsAssigned", "No shifts assigned yet")}
            </span>
            {canShiftGuard && selectedGuard && (
              <GlobalButton
                variant="add"
                icon={MdAdd}
                onClick={() => leaveListForEditor(() => openNewShiftModal(selectedGuard))}
              >
                {t("guardAssignNewShift", "Assign New Shift")}
              </GlobalButton>
            )}
          </div>
        )}
      </GlobalModal>

      {/* ── EDIT SHIFT TIMINGS MODAL ── */}
      <GlobalModal
        isOpen={showTimingsModal}
        onClose={() => setShowTimingsModal(false)}
        title={t("guardShiftTimingsTitle") || "Guard Shift Timings"}
        subtitle={t("guardShiftTimingsSubtitle") || "These windows decide when each shift type is active for all guards."}
        icon={MdSchedule}
        size="md"
        showFooter
        submitLabel={t("guardShiftTimingsSave") || "Save Timings"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleSaveTimings}
        submitLoading={timingsSaving}
        submitDisabled={timingsSaving || timingsLoading || !timingsDirty || timingsHaveOverlap()}
        submitIcon={MdSchedule}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SHIFT_WINDOWS.map(({ type, label, icon, accent }) => {
            const ShiftIcon = icon;
            return (
              <div
                key={type}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 14,
                  padding: 14,
                  background: `linear-gradient(135deg, ${accent}14, transparent 62%)`,
                  border: `1px solid ${accent}38`,
                  boxShadow: `0 2px 10px ${accent}14`,
                }}
              >
                <div style={{
                  position: "absolute", top: -26, right: -26, width: 80, height: 80,
                  borderRadius: "50%", background: `${accent}0F`, pointerEvents: "none",
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${accent}1F`, color: accent, flexShrink: 0,
                    boxShadow: `0 4px 12px ${accent}33`,
                  }}>
                    <ShiftIcon size={16} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.01em" }}>
                    {label}
                  </span>
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text-tertiary)", flexShrink: 0,
                  }}>
                    {t("guardShiftWindow") || "Shift Window"}
                  </span>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 26px minmax(0,1fr)",
                  alignItems: "center", gap: 10,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <SectionLabel>{t("guardShiftStart") || "Start"}</SectionLabel>
                    <TimeInput12
                      value={shiftTimings?.[type]?.start || ""}
                      disabled={timingsLoading}
                      onChange={(v) => setTimingField(type, "start", v)}
                    />
                  </div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: 16, textAlign: "center", alignSelf: "center", marginTop: 16 }}>→</div>
                  <div style={{ minWidth: 0 }}>
                    <SectionLabel>{t("guardShiftEnd") || "End"}</SectionLabel>
                    <TimeInput12
                      value={shiftTimings?.[type]?.end || ""}
                      disabled={timingsLoading}
                      onChange={(v) => setTimingField(type, "end", v)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {timingsHaveOverlap() && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              color: "#ef4444", fontSize: 12, padding: "8px 12px", borderRadius: 8,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <span>⚠</span>
              <span>{t("guardShiftTimingsOverlap") || "Shift windows overlap — each moment of the day must belong to exactly one shift."}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {timingsDirty ? `* ${t("guardShiftTimingsUnsaved") || "Unsaved changes"}` : <>&nbsp;</>}
            </span>
            <GlobalButton
              variant="secondary"
              size="sm"
              icon={MdEdit}
              onClick={handleResetTimings}
              disabled={timingsSaving || timingsLoading}
            >
              {t("guardShiftTimingsReset") || "Reset to Defaults"}
            </GlobalButton>
          </div>
        </div>
      </GlobalModal>

      {/* ── SELFIE LIGHTBOX & VERIFICATION MODAL ── */}
      <GlobalModal
        isOpen={Boolean(selectedSelfie)}
        onClose={() => setSelectedSelfie(null)}
        title={t("guardVerificationTitle", "Punch-In Verification")}
        subtitle={selectedSelfie?.guard?.name ? `Live Capture: ${selectedSelfie.guard.name}` : "Security Verification Details"}
        icon={MdCameraAlt}
        size="md"
      >
        {selectedSelfie && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Selfie Photo Preview */}
            <div style={{
              width: "100%",
              maxHeight: 360,
              borderRadius: 16,
              overflow: "hidden",
              border: "1.5px solid rgba(16, 185, 129, 0.4)",
              background: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}>
              {selectedSelfie.punch_in_selfie_url ? (
                <img
                  src={selectedSelfie.punch_in_selfie_url}
                  alt="Punch-in Verification Selfie"
                  style={{ width: "100%", height: "100%", maxHeight: 360, objectFit: "contain" }}
                />
              ) : (
                <div style={{ padding: 40, color: "var(--text-tertiary)" }}>No photo captured</div>
              )}
            </div>

            {/* Verification Metadata Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              padding: 14,
              borderRadius: 12,
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}>
              <div>
                <SectionLabel>{t("guardColGuard", "Guard Name")}</SectionLabel>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedSelfie.guard?.name || "—"}
                </div>
              </div>

              <div>
                <SectionLabel>{t("guardColDate", "Date & Time")}</SectionLabel>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedSelfie.attendance_date} ({formatAttendanceTime(selectedSelfie.punch_in)})
                </div>
              </div>

              <div>
                <SectionLabel>{t("guardGeofenceDist", "Geofence Distance")}</SectionLabel>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                  <MdLocationOn size={14} />
                  {selectedSelfie.punch_in_distance !== null ? `${Math.round(Number(selectedSelfie.punch_in_distance))}m from center` : "Verified"}
                </div>
              </div>

              <div>
                <SectionLabel>{t("guardGpsAccuracy", "GPS Coordinates")}</SectionLabel>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {selectedSelfie.punch_in_lat && selectedSelfie.punch_in_lng
                    ? `${Number(selectedSelfie.punch_in_lat).toFixed(5)}, ${Number(selectedSelfie.punch_in_lng).toFixed(5)}`
                    : "—"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <GlobalButton variant="secondary" onClick={() => setSelectedSelfie(null)}>
                {t("close", "Close")}
              </GlobalButton>
            </div>
          </div>
        )}
      </GlobalModal>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title={t("guardDeleteTitle", "Delete Security Guard")}
        message={t("guardDeleteMsg", "Are you sure you want to delete this guard account? They will lose access to gate check-in systems immediately.")}
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}
