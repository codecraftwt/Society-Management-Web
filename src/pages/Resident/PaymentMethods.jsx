import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../services/api";
import { IoArrowBackOutline } from "react-icons/io5";

export default function PaymentMethods() {
  const navigate = useNavigate();
  const location = useLocation();

  const { id, amount, title, type } = location.state || {};

  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const { data } = await API.post("/payments/create-order", {
        bill_id: id,
        type,
      });

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: "INR",
        name: "Society Management",
        description: title,
        order_id: data.order.id,

        // ✅ Only prefill name/email/contact — no method prefill
        prefill: {
          name: "",
          email: "",
          contact: "",
        },

        // ✅ Let Razorpay show all methods naturally
        theme: {
          color: "#16a34a",
        },

        handler: async function (response) {
          try {
            const verifyRes = await API.post("/payments/verify", {
              ...response,
              bill_id: id,
              type,
            });

            if (verifyRes.data.success) {
              navigate("/resident/payment-receipt", {
                state: {
                  paymentData: {
                    transaction_id: response.razorpay_payment_id,
                    payment_mode: selectedMethod,
                  },
                  amount,
                },
              });
            } else {
              alert("Payment Verification Failed");
            }
          } catch (err) {
            alert("Verification Failed");
          }
        },

        modal: {
          ondismiss: function () {
            console.log("Payment popup closed");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.log("Payment Failed:", response.error);
        alert(`Payment Failed: ${response.error.description}`);
      });

      rzp.open();

    } catch (error) {
      console.log("PAYMENT ERROR:", error.response?.data);
      alert(error.response?.data?.message || "Payment Error");
    } finally {
      setLoading(false);
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

      {/* Payment Method Selector — UI only, Razorpay handles actual method */}
      <div className="bg-card p-6 space-y-4">
        <h3 className="font-semibold">Select Payment Method</h3>

        {["UPI", "CARD", "NET_BANKING"].map((method) => (
          <div
            key={method}
            onClick={() => setSelectedMethod(method)}
            className={`p-3 rounded-xl border cursor-pointer transition
              ${
                selectedMethod === method
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 bg-white/5"
              }`}
          >
            <div className="flex justify-between items-center">
              <p className="font-medium">{method}</p>
              {selectedMethod === method && (
                <span className="text-accent text-sm">Selected</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="btn-primary w-full justify-center"
      >
        {loading ? "Processing..." : `Pay ₹${amount}`}
      </button>

      <p className="text-center text-xs text-secondary">
        100% Secure Payment
      </p>
    </div>
  );
}