import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { MdPerson } from "react-icons/md";
import SettingsPanel from "../../components/common/SettingsPanel";
import { AuthContext } from "../../context/AuthContext";
import { getDashboardPath } from "../../constants/app";

/**
 * Committee / admin "My Profile" screen.
 *
 * Opened from the identity hero at the top of the panel screens. It reuses the
 * shared SettingsPanel profile section, so the editable name, phone and photo
 * behaviour is byte-for-byte identical to the resident and guard panels. Only
 * the framing differs: it opens straight into the profile section and its back
 * button leaves for the panel home instead of returning to the settings hub.
 *
 * Deliberately no Role Permissions section here — that lives on the admin
 * settings screen and depends on society-level permission tables.
 */
export default function AdminMyProfile() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const goHome = () => navigate(getDashboardPath(user) || "/admin", { replace: true });

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
