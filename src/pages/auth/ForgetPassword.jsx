import { useState } from "react";
import API from "../../services/api";
import { Link } from "react-router-dom";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await API.post("/users/forgot-password", {
        email,
      });

      setMessage(res.data.message || "Reset link sent to your email.");
      setEmail("");

    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">

      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-white/10 shadow-lg">

        <h2 className="text-2xl font-semibold text-center mb-2">
          Forgot Password
        </h2>

        <p className="text-sm text-secondary text-center mb-6">
          Enter your registered email to receive reset link
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="text-sm text-secondary mb-1 block">
              Email Address
            </label>

            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

        </form>

        {/* Success Message */}
        {message && (
          <p className="mt-4 text-green-500 text-sm text-center">
            {message}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-4 text-red-500 text-sm text-center">
            {error}
          </p>
        )}

        <div className="mt-6 text-center text-sm text-secondary">
          Remember your password?{" "}
          <Link
            to="/login"
            className="text-blue-400 hover:underline"
          >
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
