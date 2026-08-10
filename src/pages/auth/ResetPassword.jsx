import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../../services/api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      const res = await API.post("/users/reset-password", {
        token,
        newPassword: password,
      });

      setMessage(res.data.message || "Password reset successful!");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Invalid or expired reset link"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">

      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-white/10 shadow-lg">

        <h2 className="text-2xl font-semibold text-center mb-2">
          Reset Password
        </h2>

        <p className="text-sm text-secondary text-center mb-6">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="text-sm text-secondary block mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label className="text-sm text-secondary block mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

        </form>

        {message && (
          <p className="mt-4 text-green-500 text-sm text-center">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-4 text-red-500 text-sm text-center">
            {error}
          </p>
        )}

        <div className="mt-6 text-center text-sm text-secondary">
          <Link to="/login" className="text-blue-400 hover:underline">
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
