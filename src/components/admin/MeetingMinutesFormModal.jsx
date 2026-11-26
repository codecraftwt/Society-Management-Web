import { useEffect, useState, useCallback, useMemo } from "react";
import {
  MdDoneAll,
  MdRemoveDone,
  MdPeople,
  MdSearch,
  MdHistory,
  MdCheck,
  MdClose,
  MdArrowBack,
  MdArrowForward,
  MdEventNote,
  MdAssignment,
  MdDescription,
  MdCancel,
} from "react-icons/md";
import { toast } from "react-toastify";
import GlobalModal from "../common/GlobalModal";
import GlobalButton from "../common/GlobalButton";
import Select from "../common/Select";
import CustomDatePicker from "../common/CustomDatePicker";
import Pagination from "../common/Pagination";
import UserAvatar from "../common/UserAvatar";
import {
  ROLE_FILTER_OPTIONS,
  meetingMinutesService,
  buildInitialAttendanceMap,
  setMemberAttendanceStatus,
  setVisibleMembersAttendance,
  getAttendanceSummary,
} from "../../services/meetingMinutesService";

const STEPS = [
  { id: 1, title: "Details", icon: MdEventNote },
  { id: 2, title: "Agenda", icon: MdAssignment },
  { id: 3, title: "Minutes", icon: MdDescription },
  { id: 4, title: "Attendance", icon: MdPeople },
];

const QUICK_TITLE_CHIPS = [
  "Monthly Committee Meeting",
  "Annual General Meeting",
  "Emergency Meeting",
  "Maintenance Review",
];

const FIELD_STYLE = {
  background: "var(--card-bg)",
  border: "1.5px solid var(--glass-border)",
  borderRadius: "12px",
  color: "var(--text-primary)",
};

export default function MeetingMinutesFormModal({
  open,
  onClose,
  onSaved,
  categories = [],
  editingMeeting = null,
}) {
  const isEdit = Boolean(editingMeeting?.id);

  const [step, setStep] = useState(1);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [minutes, setMinutes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [saving, setSaving] = useState(false);

  const [attendanceMap, setAttendanceMap] = useState(new Map());

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
      setMemberPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [memberSearch]);

  useEffect(() => {
    if (!open) return;
    setStep(1);

    if (editingMeeting) {
      setMeetingTitle(editingMeeting.meeting_title || "");
      setCategoryId(String(editingMeeting.category_id || ""));
      setMeetingDate(editingMeeting.meeting_date || "");
      setAgenda(editingMeeting.agenda || "");
      setMinutes(editingMeeting.minutes || "");
      setDecisions(editingMeeting.decisions || "");
      setAttendanceMap(buildInitialAttendanceMap(editingMeeting.attendees || []));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const firstActiveCat = categories.find((c) => c.is_active);
      setMeetingTitle("");
      setCategoryId(firstActiveCat ? String(firstActiveCat.id) : "");
      setMeetingDate(today);
      setAgenda("");
      setMinutes("");
      setDecisions("");
      setAttendanceMap(new Map());
    }

    setMemberSearch("");
    setDebouncedMemberSearch("");
    setMemberRoleFilter("");
    setMemberPage(1);
  }, [open, editingMeeting, categories]);

  const fetchEligibleMembers = useCallback(async () => {
    if (!open) return;
    try {
      setMembersLoading(true);
      const res = await meetingMinutesService.getEligibleMembers({
        page: memberPage,
        limit: 8,
        search: debouncedMemberSearch || undefined,
        role: memberRoleFilter || undefined,
      });
      setMembers(Array.isArray(res.data) ? res.data : []);
      setMemberTotal(res.total || 0);
      setMemberTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch eligible members:", err);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [open, memberPage, debouncedMemberSearch, memberRoleFilter]);

  useEffect(() => {
    fetchEligibleMembers();
  }, [fetchEligibleMembers]);

  const historicalOnlyAttendees = useMemo(() => {
    if (!isEdit) return [];
    const currentPageIds = new Set(members.map((m) => Number(m.id)));
    const list = [];
    for (const entry of attendanceMap.values()) {
      if (!currentPageIds.has(entry.user_id)) {
        list.push(entry);
      }
    }
    return list;
  }, [isEdit, attendanceMap, members]);

  const summary = useMemo(() => getAttendanceSummary(attendanceMap), [attendanceMap]);

  const validateStep = (targetStep) => {
    if (targetStep === 1) {
      if (!meetingTitle.trim() || meetingTitle.trim().length < 3) {
        toast.error("Meeting title must be at least 3 characters.");
        return false;
      }
      if (!categoryId) {
        toast.error("Please select a meeting category.");
        return false;
      }
      if (!meetingDate) {
        toast.error("Please select the meeting date.");
        return false;
      }
    }
    if (targetStep === 2 && !agenda.trim()) {
      toast.error("Please enter the meeting agenda.");
      return false;
    }
    if (targetStep === 3 && !minutes.trim()) {
      toast.error("Please enter the meeting minutes.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleStepClick = (targetId) => {
    if (targetId === step) return;
    if (targetId < step) {
      setStep(targetId);
      return;
    }
    for (let s = step; s < targetId; s += 1) {
      if (!validateStep(s)) return;
    }
    setStep(targetId);
  };

  const handleSetMemberStatus = (member, status) => {
    setAttendanceMap((prev) => setMemberAttendanceStatus(prev, member, status));
  };

  const handleMarkAllPresent = () => {
    setAttendanceMap((prev) => setVisibleMembersAttendance(prev, members, "PRESENT"));
  };

  const handleMarkAllAbsent = () => {
    setAttendanceMap((prev) => setVisibleMembersAttendance(prev, members, "ABSENT"));
  };

  const handleClearVisible = () => {
    setAttendanceMap((prev) => setVisibleMembersAttendance(prev, members, null));
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (step !== STEPS.length) return;
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    const attendeesPayload = Array.from(attendanceMap.values()).map((a) => ({
      user_id: a.user_id,
      attendance_status: a.attendance_status,
    }));

    const payload = {
      meeting_title: meetingTitle.trim(),
      category_id: Number(categoryId),
      meeting_date: meetingDate,
      agenda: agenda.trim(),
      minutes: minutes.trim(),
      decisions: decisions.trim() || null,
      attendees: attendeesPayload,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await meetingMinutesService.updateMeeting(editingMeeting.id, payload);
        toast.success("Meeting minutes updated successfully.");
      } else {
        await meetingMinutesService.createMeeting(payload);
        toast.success("Meeting minutes created successfully.");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save meeting minutes.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const activeCategories = categories.filter(
    (c) => c.is_active || (isEdit && Number(c.id) === Number(editingMeeting?.category_id))
  );

  const selectedCategoryName =
    activeCategories.find((c) => String(c.id) === String(categoryId))?.name || "—";

  const progressPercent = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <GlobalModal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? "Edit Meeting Minutes (MOM)" : "Record New Meeting Minutes (MOM)"}
      size="xl"
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {/* Connected Stepper */}
        <div className="px-2 pt-1 pb-2">
          <div className="relative flex items-center justify-between">
            {/* Background Track */}
            <div
              style={{
                position: "absolute",
                top: "18px",
                left: "10%",
                right: "10%",
                height: "2.5px",
                background: "var(--glass-border)",
                borderRadius: "999px",
                zIndex: 0,
              }}
            />
            {/* Active Progress Track */}
            <div
              style={{
                position: "absolute",
                top: "18px",
                left: "10%",
                width: `${progressPercent * 0.8}%`,
                height: "2.5px",
                background: "var(--accent)",
                borderRadius: "999px",
                transition: "width 0.25s ease",
                zIndex: 1,
              }}
            />

            {STEPS.map((s) => {
              const IconComp = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  className="relative z-10 flex flex-col items-center gap-1.5 w-1/4 group focus:outline-none"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isDone
                        ? "#10B981"
                        : isActive
                        ? "var(--accent)"
                        : "var(--card-bg)",
                      color: isDone || isActive ? "#FFFFFF" : "var(--text-secondary)",
                      border: isDone || isActive ? "none" : "1.5px solid var(--glass-border)",
                      boxShadow: isActive ? "0 0 0 4px rgba(37, 99, 235, 0.16)" : "var(--shadow-sm)",
                    }}
                  >
                    {isDone ? <MdCheck size={17} /> : <IconComp size={16} />}
                  </div>
                  <span
                    className="text-xs font-bold tracking-tight"
                    style={{
                      color: isActive
                        ? "var(--accent)"
                        : isDone
                        ? "#059669"
                        : "var(--text-secondary)",
                    }}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 1: Meeting Details */}
        {step === 1 && (
          <div
            className="p-5 rounded-2xl space-y-4 animate-fadeIn"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Meeting Details
              </h4>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Set the meeting title, category, and date.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  className="w-full h-11 text-sm px-3.5 outline-none"
                  style={FIELD_STYLE}
                  placeholder="e.g. Monthly Committee Meeting — November 2026"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  autoFocus
                />
                {!isEdit && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      Quick fill:
                    </span>
                    {QUICK_TITLE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setMeetingTitle(chip)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors"
                        style={{
                          background: "var(--card-bg)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Meeting Category *
                  </label>
                  <Select
                    className="w-full h-11 text-sm px-3"
                    style={FIELD_STYLE}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.is_active ? " (Inactive)" : ""}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Meeting Date *
                  </label>
                  <CustomDatePicker
                    value={meetingDate}
                    onChange={setMeetingDate}
                    placeholder="Select meeting date"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Meeting Agenda */}
        {step === 2 && (
          <div
            className="p-5 rounded-2xl space-y-3 animate-fadeIn"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Meeting Agenda / Purpose
              </h4>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Outline the topics planned for{" "}
                <strong style={{ color: "var(--text-primary)" }}>{meetingTitle}</strong> ({selectedCategoryName}).
              </p>
            </div>

            <textarea
              rows={7}
              className="w-full text-sm p-3.5 leading-relaxed outline-none"
              style={FIELD_STYLE}
              placeholder={"1. Review monthly maintenance collection\n2. Security gate & CCTV upgrade proposal\n3. Upcoming festival event budget"}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Step 3: Meeting Minutes & Decisions */}
        {step === 3 && (
          <div
            className="p-5 rounded-2xl space-y-4 animate-fadeIn"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Meeting Minutes & Decisions
              </h4>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Record key discussion details, resolutions, and action items.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Detailed Minutes (MOM) *
              </label>
              <textarea
                rows={5}
                className="w-full text-sm p-3.5 leading-relaxed outline-none"
                style={FIELD_STYLE}
                placeholder="Document the discussion points, member feedback, and outcomes…"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Key Decisions Taken (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full text-sm p-3.5 leading-relaxed outline-none"
                style={FIELD_STYLE}
                placeholder="Summarize final approved decisions and assigned owners…"
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Attendance */}
        {step === 4 && (
          <div
            className="p-4 rounded-2xl space-y-3 animate-fadeIn"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  Member Attendance
                </h4>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Check members who attended as Present. Filter by role or search by name/flat.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}>
                  Present: {summary.present}
                </span>
                <span className="px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#DC2626" }}>
                  Absent: {summary.absent}
                </span>
                <span
                  className="px-2.5 py-1 rounded-full"
                  style={{ background: "var(--card-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                >
                  Marked: {summary.total}
                </span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2.5">
              <div className="relative flex-1">
                <MdSearch
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="w-full h-10 text-xs outline-none"
                  style={{
                    ...FIELD_STYLE,
                    paddingLeft: "38px",
                    paddingRight: memberSearch ? "34px" : "12px",
                  }}
                  placeholder="Search by name, flat, email or phone…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                {memberSearch && (
                  <button
                    type="button"
                    onClick={() => setMemberSearch("")}
                    title="Clear search"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-tertiary)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      padding: 2,
                    }}
                  >
                    <MdClose size={16} />
                  </button>
                )}
              </div>

              <Select
                className="h-10 text-xs lg:w-44 px-3"
                style={FIELD_STYLE}
                value={memberRoleFilter}
                onChange={(e) => {
                  setMemberRoleFilter(e.target.value);
                  setMemberPage(1);
                }}
              >
                {ROLE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <div className="flex flex-wrap items-center gap-1.5">
                <GlobalButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllPresent}
                  disabled={members.length === 0}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-600">
                    <MdDoneAll size={15} />
                    All Present
                  </span>
                </GlobalButton>
                <GlobalButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllAbsent}
                  disabled={members.length === 0}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-rose-600">
                    <MdCancel size={14} />
                    All Absent
                  </span>
                </GlobalButton>
                <GlobalButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleClearVisible}
                  disabled={members.length === 0}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <MdRemoveDone size={14} />
                    Clear
                  </span>
                </GlobalButton>
              </div>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {membersLoading ? (
                <div className="p-8 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                  Loading eligible society members…
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                  No eligible members found for this filter.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                  {members.map((member) => {
                    const record = attendanceMap.get(Number(member.id));
                    const isPresent = record?.attendance_status === "PRESENT";
                    const isAbsent = record?.attendance_status === "ABSENT";

                    return (
                      <div
                        key={member.id}
                        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <UserAvatar
                            name={member.name}
                            src={member.profile_picture}
                            size={36}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                {member.name}
                              </span>
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(99,102,241,0.12)",
                                  color: "#4F46E5",
                                }}
                              >
                                {member.primary_role_label || "Resident"}
                              </span>
                              {member.flat_info && (
                                <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                                  • {member.flat_info}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                              {[member.email, member.phone].filter(Boolean).join(" • ")}
                            </div>
                          </div>
                        </div>

                        {/* Explicit Present / Absent Segmented Pill Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetMemberStatus(member, isPresent ? null : "PRESENT")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                            style={{
                              background: isPresent ? "#10B981" : "var(--card-inner-bg)",
                              color: isPresent ? "#FFFFFF" : "var(--text-secondary)",
                              border: isPresent ? "1px solid #10B981" : "1px solid var(--glass-border)",
                            }}
                          >
                            <MdCheck size={13} />
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSetMemberStatus(member, isAbsent ? null : "ABSENT")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                            style={{
                              background: isAbsent ? "#EF4444" : "var(--card-inner-bg)",
                              color: isAbsent ? "#FFFFFF" : "var(--text-secondary)",
                              border: isAbsent ? "1px solid #EF4444" : "1px solid var(--glass-border)",
                            }}
                          >
                            <MdClose size={13} />
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Page {memberPage} of {memberTotalPages} ({memberTotal} eligible members)
              </span>
              <Pagination
                page={memberPage}
                totalPages={memberTotalPages}
                onPageChange={setMemberPage}
              />
            </div>

            {isEdit && historicalOnlyAttendees.length > 0 && (
              <div
                className="mt-2 p-3 rounded-xl space-y-2"
                style={{
                  background: "var(--card-bg)",
                  border: "1px dashed var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  <MdHistory size={15} />
                  Other Saved Attendees ({historicalOnlyAttendees.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {historicalOnlyAttendees.map((att) => {
                    const isPresent = att.attendance_status === "PRESENT";
                    return (
                      <button
                        key={att.user_id}
                        type="button"
                        onClick={() =>
                          handleSetMemberStatus(
                            { id: att.user_id, name: att.member_name_snapshot },
                            isPresent ? "ABSENT" : "PRESENT"
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: isPresent ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                          color: isPresent ? "#059669" : "#DC2626",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {att.member_name_snapshot} ({isPresent ? "Present" : "Absent"})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step Wizard Footer */}
        <div
          className="flex items-center justify-between gap-3 pt-3 border-t"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <GlobalButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            <span className="whitespace-nowrap">Cancel</span>
          </GlobalButton>

          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <GlobalButton
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={saving}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <MdArrowBack size={16} />
                  Back
                </span>
              </GlobalButton>
            )}

            {step < STEPS.length ? (
              <GlobalButton
                key="btn-next"
                type="button"
                variant="primary"
                onClick={handleNext}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  Next
                  <MdArrowForward size={16} />
                </span>
              </GlobalButton>
            ) : (
              <GlobalButton
                key="btn-submit"
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <MdCheck size={16} />
                  {saving ? "Saving…" : isEdit ? "Update Meeting" : "Save Meeting Minutes"}
                </span>
              </GlobalButton>
            )}
          </div>
        </div>
      </form>
    </GlobalModal>
  );
}
