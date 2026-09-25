import { useRef, useState } from "react";
import { MdCloudUpload, MdClose, MdCheckCircle, MdOutlineUploadFile } from "react-icons/md";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { useAuthContext } from "../../../context/AuthContext";
import { useCustomAlert } from "../../../context/CustomAlertContext";
import { hasPermission } from "../../../utils/permissions";
import { getTitleError } from "../../../utils/validators";
import Select from "../../../components/common/Select";
import GlobalButton from "../../../components/common/GlobalButton";
import GlobalModal from "../../../components/common/GlobalModal";

const FORM_CATS = ["Legal", "Meetings", "Guidelines", "Finance", "Security"];

export default function Create({ isOpen, onClose, onCreated, onToast, catLabel }) {
  const { t } = useLang();
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
  const fileRef = useRef();

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(() => ({ title: "", category: "Legal", desc: "" }));

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!hasPermission(user, "society_documents", "upload")) {
      showUnauthorized("You do not have permission to upload society documents.");
      return;
    }
    const titleErr = getTitleError(form.title, "Document title");
    if (titleErr) {
      onToast(titleErr, "error");
      return;
    }
    if (!file) {
      onToast(t("adDocErrFile"), "error");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", form.title.trim());
      formData.append("category", form.category);
      formData.append("description", form.desc.trim());
      const res = await API.post("/documents/admin", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onClose();
      onCreated(res.data.data.title);
    } catch (err) {
      onToast(err.response?.data?.message || t("adDocUploadFail"), "error");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={() => {
        if (uploading) return;
        onClose();
      }}
      title={t("adDocUploadTitle")}
      subtitle={t("adDocUploadSub")}
      icon={MdCloudUpload}
      size="lg"
    >
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("adDocFieldTitle")} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              className="input"
              type="text"
              placeholder={t("adDocFieldTitlePlaceholder")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("adDocFieldCategory")} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <Select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {FORM_CATS.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("adDocFieldDesc")}{" "}
            <span style={{ fontWeight: 500, opacity: 0.7 }}>({t("compPhotoOptional")})</span>
          </label>
          <textarea
            className="input"
            rows={2}
            placeholder={t("adDocFieldDescPlaceholder")}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            style={{ resize: "vertical", minHeight: 64 }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("adDocFieldFile")} <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div
            className={`ad-dropzone${dragOver ? " ad-dropzone--over" : ""}${file ? " ad-dropzone--filled" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{ cursor: "pointer" }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file ? (
              <div className="ad-dz-filled">
                <div className="ad-dz-file-icon">
                  <MdCheckCircle size={20} />
                </div>
                <div className="ad-dz-info">
                  <p className="ad-dz-filename">{file.name}</p>
                  <p className="ad-dz-filesize">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  className="ad-dz-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <MdClose size={14} />
                </button>
              </div>
            ) : (
              <div className="ad-dz-empty">
                <MdOutlineUploadFile size={34} className="ad-dz-cloud" />
                <p className="ad-dz-text">
                  {t("adDocDragDrop")} <span className="ad-dz-browse">{t("adDocBrowse")}</span>
                </p>
                <p className="ad-dz-hint">{t("adDocFileHint")}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <GlobalButton type="button" variant="secondary" disabled={uploading} onClick={onClose}>
            {t("cancel")}
          </GlobalButton>
          <GlobalButton type="submit" variant="add" icon={MdCloudUpload} disabled={uploading} borderDraw>
            {uploading ? t("adDocUploading") : t("adDocUploadBtn")}
          </GlobalButton>
        </div>
      </form>
    </GlobalModal>
  );
}