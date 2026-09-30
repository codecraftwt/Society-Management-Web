import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdCalendarToday } from "react-icons/md";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { isCommitteeMember } from "../../utils/permissions";
import { getProfilePath } from "../../constants/app";
import UserAvatar, { getInitials } from "./UserAvatar";

const DATE_LOCALES = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

/* Generic role names stored as the display name need a localised label. */
const ROLE_NAME_KEYS = {
  "Society Admin": "dashSocietyAdminName",
  Admin: "dashAdminName",
  "Committee Member": "dashCommitteeMember",
};

/**
 * Identity hero shared by the admin/committee panel screens so every top
 * section looks and behaves the same as the dashboard's.
 *
 * The clock, greeting and role chip are all derived internally, so screens
 * only decide one thing: whether the avatar is a button.
 *
 *   onOpenProfile  Optional. Custom handler for the avatar click.
 *   clickableAvatar Opt in to turning the avatar into a button. Without it
 *                  the avatar stays inert, exactly as on the dashboard. When
 *                  enabled with no handler, it routes to the panel's
 *                  My Profile screen.
 *   societyName    Optional override for the committee society line.
 *   showStatus     Hide the clock + live strip on very short screens.
 */
export default function PanelHero({
  onOpenProfile,
  clickableAvatar = false,
  societyName,
  showStatus = true,
}) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isCommittee = isCommitteeMember(user);

  const hour = dateTime.getHours();
  const greeting = t(
    hour < 12 ? "dashGoodMorning" : hour < 17 ? "dashGoodAfternoon" : "dashGoodEvening"
  );

  const fallbackNameKey = isCommittee ? "dashCommitteeMember" : "dashAdminName";
  const rawName = user?.name;
  const displayName = rawName
    ? ROLE_NAME_KEYS[rawName]
      ? t(ROLE_NAME_KEYS[rawName])
      : rawName
    : t(fallbackNameKey);

  const dateLocale = DATE_LOCALES[lang] || "en-IN";
  const society = societyName || user?.society_name || t("dashYourSociety");

  const canOpenProfile = clickableAvatar || Boolean(onOpenProfile);

  const openProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }
    navigate(getProfilePath(user));
  };

  const avatarFace = (
    <>
      <span className="adh-avatar__ring" aria-hidden />
      {user?.profile_picture ? (
        <UserAvatar
          name={user?.name || displayName}
          src={user.profile_picture}
          className="adh-avatar__photo"
          alt={user?.name || displayName}
        />
      ) : (
        <span className="adh-avatar__initials">
          {getInitials(user?.name || displayName)}
        </span>
      )}
      <span className="adh-avatar__dot" aria-hidden />
    </>
  );

  return (
    <header className="adh-hero">
      <span className="adh-hero__aurora" aria-hidden />

      <div className="adh-hero__body">
        <div className="adh-identity">
          {canOpenProfile ? (
            <button
              type="button"
              className="adh-avatar adh-avatar--btn"
              onClick={openProfile}
              aria-label={t("asProfileTitle", "My Profile")}
            >
              {avatarFace}
            </button>
          ) : (
            <div className="adh-avatar">{avatarFace}</div>
          )}

          <div className="adh-identity__text">
            <h1 className="adh-name">
              {displayName}
              {isCommittee && (
                <span className="adh-role-chip">
                  {user?.committee_position || user?.designation || t("dashCommitteeMember")}
                </span>
              )}
            </h1>
            <p className="adh-sub">
              <span className="adh-greet">{greeting}</span>
              <span aria-hidden>&middot;</span>
              <span className="adh-sub__txt">
                {isCommittee ? t("dashOverviewFor", { society }) : t("dashOverviewToday")}
              </span>
            </p>
          </div>
        </div>

        {showStatus && (
          <div className="adh-aside">
            <div className="adh-clock">
              <span className="adh-clock__ic" aria-hidden>
                <MdCalendarToday size={14} />
              </span>
              <span>
                {dateTime.toLocaleDateString(dateLocale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="adh-clock__sep" aria-hidden>
                |
              </span>
              <span className="adh-clock__time">
                {dateTime.toLocaleTimeString(dateLocale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="adh-status">
              <span className="adh-status__dot" aria-hidden />
              <span className="adh-status__label">{t("dashRunning", "Running")}</span>
              <span className="adh-status__live">{t("dashLive", "Live")}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
