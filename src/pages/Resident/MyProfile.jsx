import { useLocation, useNavigate } from "react-router-dom";
import { MdPerson } from "react-icons/md";
import SettingsPanel from "../../components/common/SettingsPanel";

/**
 * Resident / family "My Profile" screen.
 *
 * This is the canonical editable profile for both roles. It mounts the shared
 * SettingsPanel profile section, which is the same component the Settings hub
 * renders for its "My Profile" card, so name, phone and photo editing,
 * validation, save, cancel and the photo upload / change / remove flow all
 * come from one implementation and cannot drift apart.
 *
 * There is deliberately no redirect to /settings?section=profile. Both routes
 * mount the section directly, which keeps browser history clean and avoids a
 * /myprofile -> /settings -> /myprofile bounce.
 *
 * The resident-only overview (flat label, household / vehicle / visitor counts,
 * Quick Management shortcuts) moved to ResidentOverview and lives at
 * /resident/overview and /family/overview.
 *
 * Back behaviour is an explicit destination rather than navigate(-1): the
 * section is reached from the sidebar and from the dashboard hero avatar, so
 * browser history cannot be trusted. The base is derived from the actual
 * pathname so a family member is sent to /family and a resident to /resident,
 * even if their stored active role disagrees with the panel they are viewing.
 */
export default function MyProfile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const goHome = () => {
    const base = pathname.startsWith("/family") ? "/family" : "/resident";
    navigate(base, { replace: true });
  };

  return (
    <SettingsPanel
      initialView="profile"
      onExit={goHome}
      backLabel="back"
      headerTitle="asProfileTitle"
      headerIcon={MdPerson}
    />
  );
}
