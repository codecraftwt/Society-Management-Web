import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import API from "../../services/api";
import { IoArrowBackOutline, IoCopyOutline, IoCheckmarkOutline } from "react-icons/io5";

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

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">

      <button
        className="bg-card flex justify-center items-center gap-2 text-sm font-medium h-10 w-12"
        onClick={() => navigate(-1)}
      >
        <IoArrowBackOutline style={{ fontSize: "20px" }} />
      </button>

      {/* Bill Summary */}
      <div className="bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Make Payment</h2>

        <div className="text-center space-y-1">
          <p className="text-secondary text-sm">Total Payable</p>
          <p className="text-3xl font-bold text-accent">₹{amount}</p>
          <p className="text-sm text-secondary">{title}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card p-8 text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-secondary">Loading payment details...</p>
        </div>
      ) : error ? (
        <div className="bg-card p-8 text-center space-y-3">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchUpiData} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* QR Code Section */}
          <div className="bg-card p-6 space-y-5">
            <h3 className="font-semibold">Scan QR Code to Pay</h3>

            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-bold text-green-400">
                ₹{parseFloat(upiData?.amount ?? amount).toLocaleString()}
              </p>

              <div className="bg-white p-4 rounded-2xl shadow-lg">
                {upiData?.upiLink ? (
                  <QRCodeSVG value={upiData.upiLink} size={180} bgColor="#ffffff" fgColor="#1a1a2e" />
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-400 text-xs">
                    QR unavailable
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-secondary">or pay via UPI ID</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* UPI ID + Copy */}
            <div className="flex items-center justify-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
              <span className="font-mono font-semibold text-sm">
                {upiData?.upiId || "society@upi"}
              </span>
              <button
                onClick={handleCopyUpiId}
                className="btn-muted flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
              >
                {copied ? <IoCheckmarkOutline size={13} /> : <IoCopyOutline size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* I have paid button */}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-primary w-full justify-center"
            >
              {confirming ? "Confirming..." : "I have paid"}
            </button>
            <p className="text-center text-xs text-secondary">
              After payment, tap the button above to confirm.
            </p>
          </div>
        </>
      )}

      <p className="text-center text-xs text-secondary">
        100% Secure Payment
      </p>
    </div>
  );
}
