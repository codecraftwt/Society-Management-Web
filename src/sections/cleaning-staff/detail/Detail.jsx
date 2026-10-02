import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import {
  MdPerson,
  MdConfirmationNumber,
  MdHistory,
  MdEdit,
  MdPersonOff,
  MdPersonAdd,
  MdQrCode,
} from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { hasPermission } from "../../../utils/permissions";
import { AuthContext } from "../../../context/AuthContext";
import GlobalModal from "../../../components/common/GlobalModal";
import GlobalBadge from "../../../components/common/GlobalBadge";
import SlidingTabs from "../../../components/common/SlidingTabs";
import GlobalButton from "../../../components/common/GlobalButton";
import UserAvatar from "../../../components/common/UserAvatar";
import PassesPanel from "./PassesPanel";
import AttendancePanel from "./AttendancePanel";
import PassQrModal from "./PassQrModal";
import {
  getAttendance,
  getPasses,
  getCleaningStaffById,
} from "../cleaningStaffService";
import {
  STAFF_STATUS,
  PASS_STATUS,
  STAFF_STATUS_LABEL,
} from "../constants";
import {
  formatDateOnly,
  formatDateOnlyLong,
  formatPhone,
  isDateOnlyString,
  todayIST,
} from "../format";

const BasicTab = ({ staff }) => {
  const { t } = useLang();

  const items = [
    { label: t("csFieldPhone", "Phone"), value: formatPhone(staff.phone) },
    { label: t("csFieldEmail", "Email"), value: staff.email || "—" },
    { label: t("csFieldDesignation", "Designation"), value: staff.designation || "—" },
    { label: t("csFieldJoiningDate", "Joining date"), value: formatDateOnly(staff.joining_date) },
    { label: t("csFieldAddress", "Address"), value: staff.address || "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h4 className="cs-section-title" style={{ margin: 0 }}>
          <MdPerson size={14} />
          {t("csBasicInfo", "Basic Information")}
        </h4>
        <dl className="cs-dl" style={{ marginTop: 10 }}>
          {items.map((it) => (
            <div className="cs-dl__item" key={it.label}>
              <dt className="cs-dl__label">{it.label}</dt>
              <dd className="cs-dl__value">{it.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

/**
 * Detail — staff record with Basic / Passes / Attendance tabs.
 */
export default function Detail({ isOpen, onClose, staffId, onChanged, onEdit, onToggleStatus }) {
  const { t } = useLang();
  const { user } = useContext(AuthContext);

  const [tab, setTab] = useState("basic");
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [passes, setPasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tabLoading, setTabLoading] = useState({ passes: false, attendance: false });
  const [qrModalPass, setQrModalPass] = useState(null);

  const canEdit = hasPermission(user, "cleaning_staff", "edit");
  const canStatus = hasPermission(user, "cleaning_staff", "status");
  const canPasses = hasPermission(user, "cleaning_staff", "create_passes");

  const reset = useCallback(() => {
    setTab("basic");
    setStaff(null);
    setNotFound(false);
    setPasses([]);
    setAttendance([]);
    setTabLoading({ passes: false, attendance: false });
  }, []);

  const loadStaff = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getCleaningStaffById(staffId);
      setStaff(data);
    } catch (err) {
      setNotFound(err?.response?.status === 404);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    if (!isOpen) return;
    reset();
    loadStaff();
  }, [isOpen, staffId, reset, loadStaff]);

  const loadPasses = useCallback(async () => {
    if (!staffId) return;
    setTabLoading((p) => ({ ...p, passes: true }));
    try {
      setPasses(await getPasses(staffId));
    } catch {
      setPasses([]);
    } finally {
      setTabLoading((p) => ({ ...p, passes: false }));
    }
  }, [staffId]);

  const loadAttendance = useCallback(async () => {
    if (!staffId) return;
    setTabLoading((p) => ({ ...p, attendance: true }));
    try {
      setAttendance(await getAttendance(staffId));
    } catch {
      setAttendance([]);
    } finally {
      setTabLoading((p) => ({ ...p, attendance: false }));
    }
  }, [staffId]);

  useEffect(() => {
    if (!isOpen || !staffId) return;
    if (tab === "passes") loadPasses();
    if (tab === "attendance") loadAttendance();
  }, [isOpen, staffId, tab, loadPasses, loadAttendance]);

  const reloadAll = useCallback(() => {
    loadStaff();
    if (tab === "passes") loadPasses();
    if (tab === "attendance") loadAttendance();
  }, [tab, loadStaff, loadPasses, loadAttendance]);

  const tabs = useMemo(
    () => [
      { id: "basic", label: t("csTabBasic", "Basic"), icon: <MdPerson size={15} /> },
      {
        id: "passes",
        label: t("csTabPasses", "Passes"),
        icon: <MdConfirmationNumber size={15} />,
        badge: passes.length || false,
      },
      {
        id: "attendance",
        label: t("csTabAttendance", "Attendance"),
        icon: <MdHistory size={15} />,
        badge: attendance.length || false,
      },
    ],
    [t, passes.length, attendance.length]
  );

  const isInactive = staff?.status === STAFF_STATUS.INACTIVE;
  const activePass = useMemo(
    () => passes.find((p) => p.status === PASS_STATUS.ACTIVE) || staff?.active_pass || null,
    [passes, staff]
  );

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={staff?.name || t("csStaffDetail", "Staff detail")}
      subtitle={staff ? formatDateOnlyLong(staff.created_at?.slice?.(0, 10) || todayIST()) : undefined}
      icon={MdPerson}
      size="xl"
    >
      {loading && !staff ? (
        <p className="cs-hint">{t("csLoading", "Loading...")}</p>
      ) : notFound ? (
        <p className="cs-error">{t("csNotFound", "Cleaning staff member not found.")}</p>
      ) : !staff ? null : (
        <>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="cs-detail-head" style={{ marginBottom: 14 }}>
            <UserAvatar name={staff.name} src={staff.profile_picture} size={56} radius={16} />
            <div className="cs-detail-head__text">
              <h3 className="cs-detail-head__name">{staff.name}</h3>
              <p className="cs-detail-head__sub">
                {staff.designation || t("csNoDesignation", "No designation")}
                {staff.phone ? ` · ${formatPhone(staff.phone)}` : ""}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <GlobalBadge status={staff.status} dot>
                {STAFF_STATUS_LABEL[staff.status] || staff.status}
              </GlobalBadge>

              {canEdit && (
                <GlobalButton variant="edit" icon={MdEdit} onClick={() => onEdit?.(staff)}>
                  {t("csEdit", "Edit")}
                </GlobalButton>
              )}

              {canStatus && (
                <GlobalButton
                  variant={isInactive ? "success" : "warning"}
                  icon={isInactive ? MdPersonAdd : MdPersonOff}
                  onClick={() => onToggleStatus?.(staff)}
                >
                  {isInactive ? t("csActivate", "Activate") : t("csDeactivate", "Deactivate")}
                </GlobalButton>
              )}
            </div>
          </div>

          {/* Current pass summary */}
          {activePass ? (
            <div
              className="cs-notice"
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <MdConfirmationNumber size={15} style={{ flexShrink: 0, color: "var(--accent)" }} />
                <span>
                  <strong>{activePass.pass_code}</strong>
                  {isDateOnlyString(activePass.valid_date) &&
                    ` · ${formatDateOnly(activePass.valid_date)}${
                      activePass.valid_until ? ` → ${formatDateOnly(activePass.valid_until)}` : " (single day)"
                    }`}
                </span>
              </div>
              <GlobalButton
                variant="info"
                icon={MdQrCode}
                onClick={() => setQrModalPass(activePass)}
                style={{ padding: "4px 10px", fontSize: "11.5px" }}
              >
                {t("csViewQr", "View QR Code")}
              </GlobalButton>
            </div>
          ) : (
            <div className="cs-notice" style={{ marginBottom: 12 }}>
              <MdConfirmationNumber size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t("csNoActivePass", "No active pass right now.")}</span>
            </div>
          )}

          <SlidingTabs items={tabs} value={tab} onChange={setTab} />

          <div style={{ marginTop: 14, minWidth: 0 }}>
            {tab === "basic" && <BasicTab staff={staff} />}
            {tab === "passes" &&
              (canPasses ? (
                <PassesPanel
                  staff={staff}
                  passes={passes}
                  loading={tabLoading.passes}
                  onReload={reloadAll}
                />
              ) : (
                <p className="cs-hint">{t("csNoPassAccess", "You cannot manage passes.")}</p>
              ))}
            {tab === "attendance" && (
              <AttendancePanel
                rows={attendance}
                loading={tabLoading.attendance}
                onUpdated={reloadAll}
              />
            )}
          </div>

          {/* QR Code Modal */}
          <PassQrModal
            isOpen={Boolean(qrModalPass)}
            onClose={() => setQrModalPass(null)}
            pass={qrModalPass}
            staff={staff}
          />
        </>
      )}
    </GlobalModal>
  );
}