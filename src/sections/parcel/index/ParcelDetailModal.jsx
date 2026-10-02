import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdClose,
  MdLocalShipping,
  MdStorefront,
  MdCheckCircle,
  MdPerson,
  MdAccessTime,
  MdMeetingRoom,
  MdInfo,
} from "react-icons/md";
import { FaUserShield, FaRegHandPaper, FaBuilding } from "react-icons/fa";
import API from "../../../services/api";
import GlobalBadge from "../../../components/common/GlobalBadge";
import {
  formatDate,
  formatDateTime,
  formatTime,
  getStatusMeta,
  getUnitDetails,
  getUnitLabel,
  resolveArrivalGuard,
  resolveDeliveryGuard,
  resolveRequester,
  resolveResident,
} from "../parcelDetails";

const PartyCard = ({ icon: Icon, title, person, fallback, tone = "default" }) => {
  const toneConfig = {
    resident: { bg: "rgba(99, 102, 241, 0.12)", border: "rgba(99, 102, 241, 0.25)", color: "#818cf8" },
    arrival: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)", color: "#f59e0b" },
    delivery: { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", color: "#10b981" },
    requester: { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)", color: "#60a5fa" },
    default: { bg: "var(--card-inner-bg)", border: "var(--glass-border)", color: "var(--text-secondary)" },
  }[tone] || { bg: "var(--card-inner-bg)", border: "var(--glass-border)", color: "var(--text-secondary)" };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: "var(--card-inner-bg)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: toneConfig.bg,
          border: `1px solid ${toneConfig.border}`,
          color: toneConfig.color,
        }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary" style={{ margin: 0 }}>
          {title}
        </p>
        {person ? (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-xs font-bold text-primary truncate">{person.name}</span>
            {person.phone && (
              <span className="text-[11px] font-medium text-secondary shrink-0">{person.phone}</span>
            )}
          </div>
        ) : (
          <p className="text-xs italic text-tertiary mt-0.5" style={{ margin: 0 }}>
            {fallback || "Not recorded"}
          </p>
        )}
      </div>
    </div>
  );
};

export default function ParcelDetailModal({ parcel, onClose }) {
  const [detail, setDetail] = useState(parcel || null);
  const [, setLoading] = useState(false);

  useEffect(() => {
    if (!parcel?.id) return;
    let active = true;
    setLoading(true);
    setDetail(parcel);

    (async () => {
      try {
        const res = await API.get(`/parcels/${parcel.id}`);
        const raw = res?.data?.data || res?.data;
        if (active && raw?.id) setDetail(raw);
      } catch {
        /* keep existing detail if fresh fetch fails */
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [parcel]);

  useEffect(() => {
    if (!parcel) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [parcel, onClose]);

  if (!parcel || !detail) return null;

  const meta = getStatusMeta(detail.status);
  const resident = resolveResident(detail);
  const requester = resolveRequester(detail);
  const arrivalGuard = resolveArrivalGuard(detail);
  const deliveryGuard = resolveDeliveryGuard(detail);
  const unitInfo = getUnitDetails(detail);

  const isCollected = detail.status === "COLLECTED";
  const isCancelled = detail.status === "CANCELLED";
  const isAtGate = detail.status === "AT_GATE";
  const isExpected = detail.status === "EXPECTED";

  // Deduplicate resident and requester if they are the exact same person
  const isSamePerson =
    resident && requester && (resident.id === requester.id || resident.name === requester.name);

  // Timeline steps
  const steps = [
    {
      icon: MdLocalShipping,
      title: "Parcel Logged",
      subtitle: isExpected ? "Added by resident — awaiting gate arrival" : "Parcel entry recorded",
      time: formatDateTime(detail.createdAt || detail.created_at),
      active: true,
      done: true,
    },
    {
      icon: MdStorefront,
      title: "Arrived at Gate",
      subtitle: arrivalGuard
        ? `Received at gate by ${arrivalGuard.name}`
        : isAtGate || isCollected
        ? "Received at gate"
        : "Awaiting arrival at gate",
      time: detail.entry_time ? `${formatDate(detail.entry_time)} · ${formatTime(detail.entry_time)}` : null,
      active: isAtGate || isCollected,
      done: isAtGate || isCollected,
    },
    {
      icon: MdCheckCircle,
      title: "Collected / Handover",
      subtitle: isCollected
        ? deliveryGuard
          ? `Handed over by ${deliveryGuard.name}`
          : "Handed over to resident"
        : isCancelled
        ? "Cancelled"
        : "Pending resident pickup",
      time: detail.pickup_time ? `${formatDate(detail.pickup_time)} · ${formatTime(detail.pickup_time)}` : null,
      active: isCollected,
      done: isCollected,
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1300,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl animate-scaleIn bg-card border overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
        style={{
          borderColor: "var(--glass-border)",
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Parcel details"
      >
        {/* ── Header ── */}
        <div
          className="p-5 border-b relative shrink-0"
          style={{
            borderColor: "var(--glass-border)",
            background: `linear-gradient(135deg, ${meta.accent}14 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${meta.accent}25, ${meta.accent}15)`,
                  border: `1.5px solid ${meta.accent}40`,
                  color: meta.accent,
                }}
              >
                <MdLocalShipping size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-primary truncate" style={{ margin: 0 }}>
                    {detail.courier_name || "Parcel Delivery"}
                  </h2>
                  <GlobalBadge variant={meta.variant} dot size="sm">
                    {meta.label}
                  </GlobalBadge>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-secondary mt-1">
                  <span className="font-semibold text-primary">Parcel #{detail.id}</span>
                  {detail.Society?.name && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px]"
                      style={{
                        background: "rgba(124, 58, 237, 0.12)",
                        border: "1px solid rgba(124, 58, 237, 0.25)",
                        color: "var(--accent)",
                      }}
                    >
                      <FaBuilding size={10} className="shrink-0" />
                      <span className="truncate">{detail.Society.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-inner transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <MdClose size={18} />
            </button>
          </div>

          {/* Destination Unit & Logged Banner */}
          <div className="mt-4 p-3.5 rounded-2xl bg-card-inner border border-glass flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  color: "var(--accent)",
                }}
              >
                <MdMeetingRoom size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary m-0">
                  Flat / Unit Destination
                </p>
                <p className="text-sm font-extrabold text-primary m-0 mt-0.5">
                  {getUnitLabel(detail)}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary m-0">
                Logged Date
              </p>
              <p className="text-xs font-semibold text-secondary m-0 mt-0.5 flex items-center gap-1 justify-end">
                <MdAccessTime size={13} className="text-tertiary" />
                <span>{formatDate(detail.createdAt || detail.created_at)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Cancelled Banner */}
          {isCancelled && (
            <div
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <MdInfo size={18} className="text-red-500 shrink-0" />
              <p className="text-xs font-medium text-red-400 m-0">
                This parcel was cancelled and was not received/handed over at the gate.
              </p>
            </div>
          )}

          {/* ── Timeline Section ── */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-tertiary mb-3">
              Parcel Journey
            </p>
            <div className="relative pl-6 space-y-4">
              {/* Connecting Line */}
              <div
                className="absolute top-3 bottom-3 left-2.5 w-[2px] -translate-x-1/2"
                style={{ background: "var(--glass-border)" }}
              />

              {steps.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="relative flex items-start gap-3">
                    {/* Node Dot */}
                    <div
                      className="absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 -translate-x-1/2"
                      style={{
                        background: s.done ? meta.accent : "var(--card-inner-bg)",
                        border: `2px solid ${s.done ? meta.accent : "var(--glass-border)"}`,
                        color: s.done ? "#ffffff" : "var(--text-tertiary)",
                        boxShadow: s.done ? `0 0 10px ${meta.accent}66` : "none",
                      }}
                    >
                      <Icon size={11} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold ${
                            s.done ? "text-primary" : "text-tertiary"
                          }`}
                        >
                          {s.title}
                        </span>
                        {s.time && (
                          <span className="text-[10px] text-tertiary font-medium shrink-0">
                            {s.time}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5 m-0 leading-relaxed">
                        {s.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: "var(--glass-border)" }} />

          {/* ── People Involved Section ── */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-tertiary mb-3">
              People Involved
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* If requester and resident are same, show one unified card */}
              {isSamePerson || (!requester && resident) ? (
                <PartyCard
                  icon={MdPerson}
                  title="Resident / Recipient"
                  person={resident}
                  tone="resident"
                />
              ) : (
                <>
                  <PartyCard
                    icon={MdPerson}
                    title="Resident (Unit Owner)"
                    person={resident}
                    fallback="No resident on record"
                    tone="resident"
                  />
                  <PartyCard
                    icon={MdPerson}
                    title="Requested By"
                    person={requester}
                    tone="requester"
                  />
                </>
              )}

              {/* Arrival Guard */}
              <PartyCard
                icon={FaUserShield}
                title="Received at Gate By"
                person={arrivalGuard}
                fallback={isAtGate || isCollected ? "Gate Staff" : "Awaiting arrival"}
                tone="arrival"
              />

              {/* Delivery Guard */}
              <PartyCard
                icon={FaRegHandPaper}
                title="Handed Over By"
                person={deliveryGuard}
                fallback={isCollected ? "Gate Staff" : "Pending collection"}
                tone="delivery"
              />
            </div>
          </div>

          {/* Optional Image */}
          {detail.image ? (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-tertiary mb-2">
                Parcel Photo
              </p>
              <a href={detail.image} target="_blank" rel="noreferrer" className="inline-block group">
                <img
                  src={detail.image}
                  alt={`Parcel from ${detail.courier_name || "courier"}`}
                  className="rounded-2xl border max-h-48 object-cover group-hover:opacity-95 transition-opacity"
                  style={{ borderColor: "var(--glass-border)" }}
                />
              </a>
            </div>
          ) : null}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3.5 border-t shrink-0 flex items-center justify-end"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
