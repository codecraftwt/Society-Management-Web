import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentReceipt() {
  const location = useLocation();
  const navigate = useNavigate();

  const { paymentData, amount } = location.state || {};

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="bg-card p-8 text-center space-y-4">
        <div className="text-green-400 text-5xl">
          ✓
        </div>
        <h2 className="text-xl font-semibold">
          Payment Successful
        </h2>
        <p className="text-2xl font-bold text-accent">
          ₹{amount}
        </p>
        <div className="text-sm text-secondary space-y-1">
          <p>
            Transaction ID: {paymentData?.transaction_id}
          </p>
          <p>
            Payment Mode: {paymentData?.payment_mode}
          </p>
        </div>
        <button
          onClick={() => navigate(-2)}
          className="btn-primary w-full justify-center mt-4"
        >
          Back to Dashboard
        </button>    
      </div>
    </div>
  );
}








