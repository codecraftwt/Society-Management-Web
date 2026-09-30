import SettingsPanel from "../../components/common/SettingsPanel";

/**
 * Accountant settings.
 *
 * The accountant panel was the only one without a usable settings screen — it
 * could only change a profile photo. It now uses the same shared
 * SettingsPanel as the resident, guard and family panels, so accountants get
 * the same Profile / Password / Notifications / Language sections and the same
 * hub + detail flow.
 *
 * The default account-information cells are used unchanged: name, email, role,
 * society and status all apply to an accountant as they do to any other role.
 * There is no Role Permissions section here — that is society-admin only.
 */
export default function AccountantSetting() {
  return <SettingsPanel headerSubtitle="asSubtitle" />;
}
