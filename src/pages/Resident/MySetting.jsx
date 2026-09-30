import SettingsPanel from "../../components/common/SettingsPanel";

/**
 * Resident account settings.
 *
 * All four sections (Profile, Password, Notifications, Language) come from
 * the shared SettingsPanel. The only resident-specific part is the read-only
 * Account Information grid, which adds "Resident Type".
 */
export default function MySetting() {
  return <SettingsPanel />;
}
