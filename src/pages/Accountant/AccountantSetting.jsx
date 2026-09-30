import { useEffect, useState } from "react";
import { MdPerson } from "react-icons/md";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { useAuthContext } from "../../context/AuthContext";
import ProfilePictureUploader from "../../components/common/ProfilePictureUploader";

export default function AccountantSetting() {
  const { t } = useLang();
  const { user } = useAuthContext();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let active = true;
    API.get("/users/me")
      .then((res) => { if (active) setMe(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="page-root animate-fadeIn">
      <div className="as-header">
        <div className="as-header-left">
          <div className="as-header-icon"><MdPerson size={20} /></div>
          <div className="as-header-titles">
            <h1 className="as-header-title">{t("ppTitle", "Profile Picture")}</h1>
            <p className="as-header-sub">{t("ppSubtitle", "This photo appears on your profile and in admin lists.")}</p>
          </div>
        </div>
      </div>

      <div className="cpw-card animate-scaleIn">
        <ProfilePictureUploader
          name={me?.name || user?.name}
          currentUrl={me?.profile_picture}
          onChange={(url) => setMe((prev) => (prev ? { ...prev, profile_picture: url } : prev))}
        />
      </div>
    </div>
  );
}
