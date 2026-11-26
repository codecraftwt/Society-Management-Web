import { useState } from "react";
import {
  MdPrint,
  MdCalendarToday,
  MdCategory,
  MdPerson,
  MdAssignment,
  MdDescription,
  MdLightbulb,
  MdPeople,
} from "react-icons/md";
import GlobalModal from "../common/GlobalModal";
import GlobalButton from "../common/GlobalButton";
import UserAvatar from "../common/UserAvatar";

export default function MeetingMinutesDetailModal({ open, onClose, meeting, loading }) {
  const [attTab, setAttTab] = useState("ALL");

  if (!open) return null;

  const attendees = Array.isArray(meeting?.attendees) ? meeting.attendees : [];
  const presentMembers = attendees.filter((a) => a.attendance_status === "PRESENT");
  const absentMembers = attendees.filter((a) => a.attendance_status === "ABSENT");

  const displayedAttendees =
    attTab === "PRESENT"
      ? presentMembers
      : attTab === "ABSENT"
      ? absentMembers
      : attendees;

  return (
    <GlobalModal
      isOpen={open}
      onClose={onClose}
      title={meeting?.meeting_title || "Meeting Minutes Details"}
      size="xl"
    >
      {loading ? (
        <div className="py-14 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading meeting details…
        </div>
      ) : !meeting ? (
        <div className="py-14 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Meeting record not found.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Executive Summary Banner */}
          <div
            className="p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(37,99,235,0.06))",
              border: "1px solid rgba(99,102,241,0.22)",
            }}
          >
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: "var(--accent)",
                  color: "#FFFFFF",
                }}
              >
                <MdCategory size={13} />
                {meeting.category?.name || "General"}
              </span>

              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <MdCalendarToday size={13} style={{ color: "var(--accent)" }} />
                {meeting.meeting_date}
              </span>

              {meeting.creator?.name && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{
                    background: "var(--card-bg)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <MdPerson size={14} />
                  Recorded by {meeting.creator.name}
                </span>
              )}
            </div>

            <GlobalButton
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MdPrint size={15} />
                Print MOM
              </span>
            </GlobalButton>
          </div>

          {/* Structured Content Cards: Agenda, Minutes, Decisions */}
          <div className="grid grid-cols-1 gap-3.5">
            {/* Agenda */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                borderLeft: "4px solid #6366F1",
              }}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#4F46E5" }}>
                <MdAssignment size={15} />
                Meeting Agenda / Purpose
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {meeting.agenda}
              </div>
            </div>

            {/* Minutes */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                borderLeft: "4px solid #2563EB",
              }}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#2563EB" }}>
                <MdDescription size={15} />
                Meeting Minutes (MOM)
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {meeting.minutes}
              </div>
            </div>

            {/* Key Decisions */}
            {meeting.decisions && (
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "rgba(16, 185, 129, 0.07)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderLeft: "4px solid #10B981",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 text-emerald-600">
                  <MdLightbulb size={15} />
                  Key Decisions Taken
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {meeting.decisions}
                </div>
              </div>
            )}
          </div>

          {/* Attendance Directory with Tabs */}
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <MdPeople size={16} />
                Attendance Record
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: "ALL", label: `All (${attendees.length})` },
                  { id: "PRESENT", label: `Present (${presentMembers.length})` },
                  { id: "ABSENT", label: `Absent (${absentMembers.length})` },
                ].map((t) => {
                  const active = attTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAttTab(t.id)}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: active ? "var(--accent)" : "var(--card-bg)",
                        color: active ? "#FFFFFF" : "var(--text-secondary)",
                        border: active ? "none" : "1px solid var(--glass-border)",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {displayedAttendees.length === 0 ? (
              <div className="py-6 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
                No members in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {displayedAttendees.map((a) => {
                  const isPresent = a.attendance_status === "PRESENT";
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl"
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={a.member_name_snapshot}
                          src={a.user?.profile_picture}
                          size={34}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {a.member_name_snapshot}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
                            {[a.member_role_snapshot, a.flat_info_snapshot].filter(Boolean).join(" • ") || "Member"}
                          </div>
                        </div>
                      </div>

                      <span
                        className="shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: isPresent ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                          color: isPresent ? "#059669" : "#DC2626",
                        }}
                      >
                        {isPresent ? "Present" : "Absent"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </GlobalModal>
  );
}
