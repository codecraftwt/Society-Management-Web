import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import API from "../../services/api";
import { IoArrowBackOutline, IoCopyOutline, IoCheckmarkOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { MdReceiptLong, MdQrCodeScanner } from "react-icons/md";

export default function PaymentMethods() {
  const navigate = useNavigate();
  const location = useLocation();

  const { id, amount, title, type } = location.state || {};

  const [upiData, setUpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("No bill selected");
      setLoading(false);
      return;
    }
    fetchUpiData();
  }, [id]);

  const fetchUpiData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await API.post("/payments/demo-upi", { bill_id: id });
      if (data.success && data.data) {
        setUpiData(data.data);
      } else {
        setError(data.message || "Could not load payment details");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiData?.upiId || "society@upi");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const { data } = await API.post("/payments/demo-verify", { bill_id: id });
      if (data.success) {
        navigate("/resident/payment-receipt", {
          state: {
            paymentData: {
              transaction_id: `UPI-${id}`,
              payment_mode: "UPI",
            },
            amount: amount || upiData?.amount,
            title,
          },
        });
      } else {
        alert(data.message || "Confirmation failed");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setConfirming(false);
    }
  };

  const displayAmount = amount || upiData?.amount;

  return (
    <div className="py-4 px-3 max-w-md mx-auto space-y-4 animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex items-center justify-center w-9 h-9 rounded-xl border transition-all cursor-pointer"
          style={{
            background: "var(--card-inner-bg)",
            borderColor: "var(--glass-border)",
            color: "var(--text-primary)",
          }}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <IoArrowBackOutline size={18} />
        </button>
        <div className="text-center flex-1 pr-9">
          <h2 className="text-base font-bold tracking-tight text-primary">Pay Bill</h2>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center space-y-3 rounded-2xl border"
          style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
          <div className="animate-spin w-7 h-7 border-2 border-accent border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-secondary">Generating secure QR code...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center space-y-3 rounded-2xl border"
          style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
          <p className="text-xs text-red-400 font-semibold">{error}</p>
          <button onClick={fetchUpiData} className="btn-primary text-xs px-4 py-2 mx-auto">
            Retry
          </button>
        </div>
      ) : (
        /* Unified compact payment card */
        <div
          className="rounded-2xl p-5 border space-y-4 shadow-xl"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--glass-border)",
          }}
        >
          {/* Bill Info & Amount Banner */}
          <div
            className="flex items-center justify-between p-3.5 rounded-xl border"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-accent shrink-0"
                style={{ background: "var(--accent-soft)" }}
              >
                <MdReceiptLong size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary truncate">
                  {title || "Maintenance Bill"}
                </p>
                <p className="text-[10px] text-secondary">Total Payable</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-accent">
                ₹{Number(displayAmount || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/8">
            <div className="bg-white p-2.5 rounded-xl shadow-md">
              {upiData?.upiLink ? (
                <QRCodeSVG value={upiData.upiLink} size={148} bgColor="#ffffff" fgColor="#0f172a" />
              ) : (
                <div className="w-[148px] h-[148px] flex items-center justify-center text-gray-400 text-xs">
                  QR unavailable
                </div>
              )}
            </div>
            <p className="text-[11px] font-semibold text-secondary mt-2 flex items-center gap-1">
              <MdQrCodeScanner size={13} className="text-accent" /> Scan with GPay, PhonePe, Paytm or BHIM
            </p>
          </div>

          {/* UPI ID copy pill */}
          <div
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">UPI ID</p>
              <p className="font-mono font-bold text-xs text-primary truncate">
                {upiData?.upiId || "society@upi"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyUpiId}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shrink-0"
              style={{
                background: copied ? "rgba(34,197,94,0.15)" : "var(--hover-bg)",
                borderColor: copied ? "#22c55e" : "var(--glass-border)",
                color: copied ? "#22c55e" : "var(--text-primary)",
              }}
            >
              {copied ? <IoCheckmarkOutline size={13} /> : <IoCopyOutline size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="btn-primary w-full justify-center h-10 text-xs font-bold rounded-xl shadow-md"
          >
            {confirming ? "Verifying Payment..." : "I Have Completed Payment"}
          </button>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-secondary pt-1">
            <IoShieldCheckmarkOutline size={14} className="text-green-400" />
            <span>100% Secure & Verified Payment</span>
          </div>
        </div>
      )}
    </div>
  );
}
