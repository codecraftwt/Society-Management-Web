import SettingsPanel from "../../components/common/SettingsPanel";

/**
 * Guard account settings.
 *
 * A guard has no society-level permissions to manage, so Role Permissions is
 * deliberately not offered. The four shared sections are enough:
 * Profile, Password, Notifications and Language.
 *
 * `accountCells` supplies the read-only Account Information grid with the
 * fields that apply to a guard — notably no "Resident Type", which the
 * resident panel shows.
 */
export default function GuardSetting() {
  return (
    <SettingsPanel
      notifsHint="gsNotifsHint"
      accountCells={({ me, user, t, email, roleLabel, societyLabel, statusTone, approvalLabel }) => [
        {
          key: "email",
          label: t("asEmailLabel", "Email Address"),
          value: email || t("asNA", "Not provided"),
        },
        {
          key: "role",
          label: t("gsRole", "Role"),
          value: roleLabel || t("gdGuard", "Guard"),
        },
        {
          key: "society",
          label: t("asSocietyLabel", "Society"),
          value: societyLabel || t("asNotApplicable", "Not applicable"),
        },
        {
          key: "phone",
          label: t("asPhoneLabel", "Phone Number"),
          value: me?.phone || user?.phone || t("asNA", "Not provided"),
        },
        {
          key: "status",
          label: t("asAccountStatusLabel", "Account Status"),
          status: { tone: statusTone, text: approvalLabel },
        },
        {
          key: "id",
          label: t("asUserIdLabel", "User ID"),
          value: `#${me?.id ?? user?.id ?? "—"}`,
          mono: true,
        },
      ]}
    />
  );
}
