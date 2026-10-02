import { useRef, useState, useContext } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import {
  MdQrCode,
  MdClose,
  MdApartment,
  MdSchedule,
  MdContentCopy,
  MdCheckCircle,
  MdDownload,
  MdPictureAsPdf,
  MdCheck,
  MdConfirmationNumber,
} from "react-icons/md";
import { toast } from "react-toastify";

import { useLang } from "../../../context/LanguageContext";
import { AuthContext } from "../../../context/AuthContext";
import GlobalModal from "../../../components/common/GlobalModal";
import GlobalBadge from "../../../components/common/GlobalBadge";
import {
  formatDateOnly,
  formatPassValidity,
  formatPassCode,
  todayIST,
  isDateOnlyString,
} from "../format";
import { MAX_SCANS_PER_DAY } from "../constants";

export default function PassQrModal({ isOpen, onClose, pass, staff }) {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  if (!pass) return null;

  const societyName = user?.society_name || user?.society?.name || "Society";
  const passCode = formatPassCode(pass.pass_code);
  const staffName = staff?.name || "Staff Member";
  const designation = staff?.designation || "Cleaning Staff";

  const copyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(passCode);
      } else {
        const el = document.createElement("textarea");
        el.value = passCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success(t("csPassCopied", "Pass code copied to clipboard!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("csCopyFail", "Could not copy pass code."));
    }
  };

  /* ── Download PNG ── */
  const downloadPNG = () => {
    if (!qrRef.current || !pass) return;
    try {
      const canvas = qrRef.current;
      const W = 600;
      const H = 820;
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Card Header gradient
      const headerGrad = ctx.createLinearGradient(0, 0, W, 220);
      headerGrad.addColorStop(0, "#1e1b4b");
      headerGrad.addColorStop(0.55, "#4f46e5");
      headerGrad.addColorStop(1, "#7c3aed");
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, W, 210);

      // Society Name
      ctx.fillStyle = "#c7d2fe";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(societyName.toUpperCase(), W / 2, 45);

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("CLEANING STAFF GATE PASS", W / 2, 90);

      // Staff Name & Designation
      ctx.fillStyle = "#e0e7ff";
      ctx.font = "20px sans-serif";
      ctx.fillText(`${staffName} · ${designation}`, W / 2, 135);

      // QR Code container white box
      const qrBoxSize = 300;
      const qrBoxX = (W - qrBoxSize) / 2;
      const qrBoxY = 240;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
      else ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.fill();

      // Draw QR Canvas
      ctx.drawImage(canvas, qrBoxX + 15, qrBoxY + 15, qrBoxSize - 30, qrBoxSize - 30);

      // Pass Code Label & Code
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px sans-serif";
      ctx.fillText("GATE PASS CODE", W / 2, 590);

      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 44px monospace";
      ctx.fillText(passCode, W / 2, 645);

      // Validity & Details
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "20px sans-serif";
      const valText = `Validity: ${formatPassValidity(pass)}`;
      ctx.fillText(valText, W / 2, 705);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Daily Limit: ${MAX_SCANS_PER_DAY} scans/day (Entry + Exit)`, W / 2, 740);

      // Footer note
      ctx.fillStyle = "#64748b";
      ctx.font = "14px sans-serif";
      ctx.fillText("Show this QR code at the security gate for attendance scan.", W / 2, 785);

      const link = document.createElement("a");
      link.href = out.toDataURL("image/png");
      link.download = `GatePass_${staffName.replace(/\s+/g, "_")}_${passCode}.png`;
      link.click();
    } catch (e) {
      console.error("Download PNG error:", e);
      toast.error(t("csDownloadError", "Could not download QR image."));
    }
  };

  /* ── Download PDF ── */
  const downloadPDF = () => {
    if (!qrRef.current || !pass) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 595, 842, "F");

      // Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(40, 40, 515, 762, 12, 12, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, 40, 515, 762, 12, 12, "S");

      // Society name
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(societyName.toUpperCase(), 297.5, 72, { align: "center" });

      // Title
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("CLEANING STAFF GATE PASS", 297.5, 96, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(`${staffName} (${designation})`, 297.5, 122, { align: "center" });

      // QR Image
      const qrData = qrRef.current.toDataURL("image/png");
      doc.addImage(qrData, "PNG", 297.5 - 100, 150, 200, 200);

      // Pass code
      doc.setFontSize(28);
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text(passCode, 297.5, 390, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("SECURITY GATE SCAN PASS CODE", 297.5, 410, { align: "center" });

      // Meta Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(80, 440, 435, 110, 8, 8, "F");

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("Validity Period:", 105, 470);
      doc.setFont("helvetica", "normal");
      doc.text(formatPassValidity(pass), 230, 470);

      doc.setFont("helvetica", "bold");
      doc.text("Designation:", 105, 495);
      doc.setFont("helvetica", "normal");
      doc.text(designation, 230, 495);

      doc.setFont("helvetica", "bold");
      doc.text("Daily Limit:", 105, 520);
      doc.setFont("helvetica", "normal");
      doc.text(`${MAX_SCANS_PER_DAY} scans/day (Entry + Exit)`, 230, 520);

      // Note
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("This pass is registered with the society security gate system.", 297.5, 610, { align: "center" });
      doc.text("Guard will verify and scan the QR code upon arrival and exit.", 297.5, 625, { align: "center" });

      doc.save(`GatePass_${staffName.replace(/\s+/g, "_")}_${passCode}.pdf`);
    } catch (e) {
      console.error("Download PDF error:", e);
      toast.error(t("csDownloadError", "Could not download PDF."));
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("csPassQrTitle", "Staff Gate Pass QR")}
      subtitle={`${staffName} · ${passCode}`}
      icon={MdQrCode}
      size="md"
    >
      <div className="flex flex-col items-center gap-3 pt-1 w-full text-center">
        {/* Branded Pass Card */}
        <div
          className="w-full rounded-2xl overflow-hidden border border-white/10"
          style={{
            background: "var(--card-bg, #1e293b)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          }}
        >
          {/* Card header — gradient brand band */}
          <div
            className="px-4 pt-4 pb-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 55%, #7c3aed 100%)",
            }}
          >
            <div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-black/20"
              aria-hidden="true"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-indigo-200 font-semibold">
                <MdApartment size={13} /> {societyName}
              </span>
              <p className="mt-1.5 text-white text-sm font-bold tracking-[0.22em]">
                CLEANING STAFF GATE PASS
              </p>
              <p className="mt-0.5 text-indigo-200 text-xs truncate">
                {staffName} · {designation}
              </p>
            </div>
          </div>

          {/* Body — QR + Pass Code + meta */}
          <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-2">
            <div
              className="bg-white rounded-xl p-3 shadow-md border border-slate-200"
              style={{ display: "inline-flex", justifyContent: "center" }}
            >
              <QRCodeCanvas ref={qrRef} value={String(pass.pass_code)} size={160} />
            </div>

            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              {t("csPassCode", "Gate Pass Code")}
            </p>
            <p
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "0.2em",
                color: "#22c55e",
                margin: "2px 0 6px",
              }}
            >
              {passCode}
            </p>

            {/* Validity & Meta Badges */}
            <div className="flex flex-wrap justify-center gap-2 w-full mt-1">
              <span className="flex items-center gap-1 text-[11.5px] text-secondary px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                <MdSchedule size={13} className="text-green-400" />
                {formatPassValidity(pass)}
              </span>
              <span className="flex items-center gap-1 text-[11.5px] text-secondary px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                <MdConfirmationNumber size={13} className="text-primary" />
                {MAX_SCANS_PER_DAY} {t("csScansPerDay", "scans/day")}
              </span>
              <GlobalBadge status={pass.status} size="sm" dot />
            </div>
          </div>
        </div>

        {/* Action Buttons: Copy, Download PNG, Download PDF */}
        <div className="w-full space-y-2 mt-2">
          <button
            type="button"
            onClick={copyCode}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition ${
              copied
                ? "bg-green-600 text-white border-green-500 shadow-sm"
                : "bg-primary text-white border-primary hover:bg-primary/90 shadow-sm cursor-pointer"
            }`}
          >
            {copied ? <MdCheckCircle size={15} /> : <MdContentCopy size={15} />}
            {copied ? t("csPassCopied", "Pass Code Copied!") : t("csCopyPassCode", "Copy Pass Code")}
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={downloadPNG}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition cursor-pointer"
            >
              <MdDownload size={14} className="text-cyan-400" /> {t("docDownload", "Download")} PNG
            </button>
            <button
              type="button"
              onClick={downloadPDF}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition cursor-pointer"
            >
              <MdPictureAsPdf size={14} className="text-rose-400" /> {t("docDownload", "Download")} PDF
            </button>
          </div>
        </div>
      </div>
    </GlobalModal>
  );
}
