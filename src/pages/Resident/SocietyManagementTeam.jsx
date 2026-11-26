import { useEffect, useState, useMemo, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import {
  MdGroups,
  MdEmail,
  MdPhone,
  MdContentCopy,
  MdCheck,
  MdOutlineInbox,
  MdRefresh,
  MdVerifiedUser,
  MdCalculate,
  MdStar,
  MdAdminPanelSettings,
} from "react-icons/md";
import {
  getDesignationStyle,
  getInitials,
  resolveProfilePictureUrl,
  cleanPhoneForTel,
  filterManagementTeam,
} from "./managementTeamUtils";

function getRoleBadgeIcon(roleKey) {
  switch (roleKey) {
    case "SOCIETY_ADMIN":
      return MdAdminPanelSettings;
    case "ACCOUNTANT":
      return MdCalculate;
    case "CHAIRMAN":
    case "SECRETARY":
    case "TREASURER":
      return MdStar;
    default:
      return MdGroups;
  }
}

function TeamCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1.5px solid var(--glass-border)",
        borderRadius: "20px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="rd-skeleton" style={{ width: "100%", height: 72, borderRadius: "14px" }} />
      <div
        className="rd-skeleton"
        style={{ width: 82, height: 82, borderRadius: "50%", marginTop: "-52px", border: "4px solid var(--card-bg)" }}
      />
      <div className="rd-skeleton" style={{ width: "58%", height: 18, borderRadius: 6 }} />
      <div className="rd-skeleton" style={{ width: "100%", height: 34, borderRadius: 10 }} />
      <div className="rd-skeleton" style={{ width: "100%", height: 34, borderRadius: 10 }} />
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <div className="rd-skeleton" style={{ flex: 1, height: 36, borderRadius: 999 }} />
        <div className="rd-skeleton" style={{ flex: 1, height: 36, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function MemberPortrait({ name, profilePicture, roleKey }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveProfilePictureUrl(profilePicture);
  const styleMeta = getDesignationStyle(roleKey);

  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Clean Smooth Gradient Header Strip (No Bubbles) */}
      <div
        style={{
          width: "100%",
          height: "62px",
          borderRadius: "14px 14px 10px 10px",
          background: `linear-gradient(135deg, ${styleMeta.bg} 0%, rgba(255, 255, 255, 0.02) 100%)`,
          borderTop: `3px solid ${styleMeta.color}`,
        }}
      />

      {/* Overlapping Circular Avatar */}
      <div
        style={{
          marginTop: "-42px",
          zIndex: 2,
          width: "84px",
          height: "84px",
          borderRadius: "50%",
          padding: "3px",
          background: "var(--card-bg)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
        }}
      >
        {resolvedUrl && !imgError ? (
          <img
            src={resolvedUrl}
            alt={name || "Team Member"}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              objectPosition: "center",
              background: "#F8FAFC",
              display: "block",
              border: `1.5px solid ${styleMeta.border}`,
            }}
          />
        ) : (
          <div
            aria-label={name || "Team Member"}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: styleMeta.pillGradient || styleMeta.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.03em",
            }}
          >
            {getInitials(name)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocietyManagementTeam() {
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/users/management-team");
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setMembers(list);
    } catch (err) {
      console.error("Failed to fetch society management team:", err);
      setError(
        err?.response?.data?.message ||
          "Unable to load the society management directory right now."
      );
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const counts = useMemo(() => {
    const adminCount = members.filter(
      (m) =>
        m.role_key === "SOCIETY_ADMIN" ||
        (Array.isArray(m.designations) && m.designations.includes("Society Admin"))
    ).length;
    const committeeCount = members.filter((m) =>
      ["CHAIRMAN", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"].includes(m.role_key)
    ).length;
    const accountantCount = members.filter(
      (m) =>
        m.role_key === "ACCOUNTANT" ||
        (Array.isArray(m.designations) && m.designations.includes("Accountant"))
    ).length;
    return {
      total: members.length,
      adminCount,
      committeeCount,
      accountantCount,
    };
  }, [members]);

  const tabItems = useMemo(
    () => [
      { id: "ALL", label: t("compTabAll", "All"), badge: counts.total },
      { id: "SOCIETY_ADMIN", label: t("roleSocietyAdmin", "Society Admin"), badge: counts.adminCount },
      { id: "COMMITTEE", label: t("roleCommittee", "Committee Member"), badge: counts.committeeCount },
      { id: "ACCOUNTANT", label: t("roleAccountant", "Accountant"), badge: counts.accountantCount },
    ],
    [counts, t]
  );

  const filtered = useMemo(
    () => filterManagementTeam(members, { roleFilter, search }),
    [members, roleFilter, search]
  );

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="page-root animate-fadeIn">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="ad-page-icon">
            <MdGroups size={24} />
          </div>
          <div>
            <h2 className="page-title">
              {t("menuSocietyTeam", "Society Management Team")}
            </h2>
            <div className="page-subtitle">
              {loading
                ? t("loadingManagementTeam", "Loading society management directory…")
                : t(
                    "managementTeamSubtitle",
                    "Connect with your Society Admin, Management Committee & Accountant"
                  )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchTeam}
          disabled={loading}
          className="btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <MdRefresh size={16} />
          {t("refresh", "Refresh")}
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-5 mb-5">
        <div className="overflow-x-auto">
          <SlidingTabs
            tabs={tabItems}
            value={roleFilter}
            onChange={setRoleFilter}
          />
        </div>

        <div className="flex items-center gap-2.5 lg:ml-auto w-full lg:w-auto justify-end">
          <ExpandableSearch
            placeholder={t("searchManagementTeam", "Search name, role, email, phone…")}
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* 4-in-a-row Responsive Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <TeamCardSkeleton key={idx} />
          ))}
        </div>
      ) : error ? (
        <div
          className="empty-state"
          style={{
            background: "var(--card-bg)",
            border: "1.5px solid var(--glass-border)",
            borderRadius: "20px",
            padding: "40px 24px",
          }}
        >
          <MdOutlineInbox size={48} className="empty-state__icon" />
          <h3 className="empty-state__title">
            {t("managementTeamErrorTitle", "Could not load directory")}
          </h3>
          <p className="empty-state__desc">{error}</p>
          <button
            type="button"
            onClick={fetchTeam}
            className="btn-primary"
            style={{ marginTop: 14, padding: "9px 18px", borderRadius: "12px" }}
          >
            {t("retry", "Try Again")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <MdOutlineInbox size={48} className="empty-state__icon" />
          <h3 className="empty-state__title">
            {t("managementTeamEmptyTitle", "No Management Members Found")}
          </h3>
          <p className="empty-state__desc">
            {search || roleFilter !== "ALL"
              ? t(
                  "managementTeamEmptyFilter",
                  "No team members match your current filter or search query."
                )
              : t(
                  "managementTeamEmptyDesc",
                  "No active society admin, committee members, or accountant are assigned yet."
                )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((member) => {
            const styleMeta = getDesignationStyle(member.role_key);
            const BadgeIcon = getRoleBadgeIcon(member.role_key);
            const cleanPhone = cleanPhoneForTel(member.phone);
            const hasEmail = Boolean(member.email);
            const hasPhone = Boolean(cleanPhone);
            const copyEmailKey = `email-${member.id}`;
            const copyPhoneKey = `phone-${member.id}`;
            const secondaryDesignations = Array.isArray(member.designations)
              ? member.designations.filter((d) => d !== member.designation)
              : [];

            return (
              <div
                key={member.id}
                className="hover-card-elevation"
                style={{
                  background: "var(--card-bg)",
                  border: "1.5px solid var(--glass-border)",
                  borderRadius: "20px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                {/* Top Portrait + Centered Name & Role Pill */}
                <div>
                  <MemberPortrait
                    name={member.name}
                    profilePicture={member.profile_picture}
                    roleKey={member.role_key}
                  />

                  {/* Centered Name & Designation Pill */}
                  <div style={{ marginTop: "10px", padding: "0 4px", textAlign: "center" }}>
                    <h4
                      title={member.name}
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {member.name}
                    </h4>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "5px",
                        marginTop: "7px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3.5px 10px",
                          borderRadius: "999px",
                          background: styleMeta.bg,
                          color: styleMeta.color,
                          border: `1px solid ${styleMeta.border}`,
                          fontSize: "11.5px",
                          fontWeight: 700,
                        }}
                      >
                        <BadgeIcon size={12} />
                        {member.designation}
                      </span>

                      {secondaryDesignations.map((sec) => (
                        <span
                          key={sec}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            backgroundColor: "var(--card-inner-bg)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <MdVerifiedUser size={10} />
                          {sec}
                        </span>
                      ))}
                      {member.is_outsider && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            backgroundColor: "var(--card-inner-bg)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          External
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {/* Email Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "7px 10px",
                      borderRadius: "10px",
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <MdEmail size={15} style={{ color: "#2563EB", flexShrink: 0 }} />
                      {hasEmail ? (
                        <a
                          href={`mailto:${member.email}`}
                          title={member.email}
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {member.email}
                        </a>
                      ) : (
                        <span style={{ fontSize: "12.5px", color: "var(--text-tertiary)" }}>
                          {t("notProvided", "Not provided")}
                        </span>
                      )}
                    </div>

                    {hasEmail && (
                      <button
                        type="button"
                        onClick={() => handleCopy(member.email, copyEmailKey)}
                        title="Copy email"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: copiedId === copyEmailKey ? "#10B981" : "var(--text-tertiary)",
                          padding: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {copiedId === copyEmailKey ? <MdCheck size={14} /> : <MdContentCopy size={13} />}
                      </button>
                    )}
                  </div>

                  {/* Phone Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "7px 10px",
                      borderRadius: "10px",
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <MdPhone size={15} style={{ color: "#2563EB", flexShrink: 0 }} />
                      {hasPhone ? (
                        <a
                          href={`tel:${cleanPhone}`}
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            textDecoration: "none",
                          }}
                        >
                          {member.phone}
                        </a>
                      ) : (
                        <span style={{ fontSize: "12.5px", color: "var(--text-tertiary)" }}>
                          {t("notProvided", "Not provided")}
                        </span>
                      )}
                    </div>

                    {hasPhone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(member.phone, copyPhoneKey)}
                        title="Copy phone number"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: copiedId === copyPhoneKey ? "#10B981" : "var(--text-tertiary)",
                          padding: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {copiedId === copyPhoneKey ? <MdCheck size={14} /> : <MdContentCopy size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons (Outlined Call + Solid Blue Email) */}
                {(hasEmail || hasPhone) && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {hasPhone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        style={{
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "8px 10px",
                          borderRadius: "999px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          textDecoration: "none",
                          backgroundColor: "transparent",
                          color: "var(--text-primary)",
                          border: "1.5px solid var(--glass-border)",
                        }}
                      >
                        <MdPhone size={14} style={{ color: "#2563EB" }} />
                        {t("call", "Call")}
                      </a>
                    )}
                    {hasEmail && (
                      <a
                        href={`mailto:${member.email}`}
                        style={{
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "8px 10px",
                          borderRadius: "999px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          textDecoration: "none",
                          background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                          color: "#FFFFFF",
                          boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
                        }}
                      >
                        <MdEmail size={14} />
                        {t("email", "Email")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
