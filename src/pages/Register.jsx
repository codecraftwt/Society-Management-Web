import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "../constants/app";
import API from "../services/api";
import { MdEmail } from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FiUser, FiPhone, FiLock, FiArrowRight, FiArrowLeft, FiCheck } from "react-icons/fi";
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import { toast } from "react-toastify";
import Select from "../components/common/Select";

/* ─── Password rule checks ─── */
const PW_RULES = [
  { id: "len",   label: "At least 8 characters",  test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter",    test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter",    test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "One number",              test: (p) => /\d/.test(p) },
  { id: "spec",  label: "One special character",   test: (p) => /[\W_]/.test(p) },
];

function pwStrength(p) {
  return PW_RULES.filter((r) => r.test(p)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Moderate", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

/* ─── Scoped styles ─── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@500;600;700&family=Satoshi:wght@400;500;600&display=swap');

  .reg-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--bg-main, #0f1117);
    position: relative;
    overflow: hidden;
    font-family: 'Satoshi', sans-serif;
  }

  /* ── Ambient blobs ── */
  .reg-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.15;
    pointer-events: none;
  }
  html.light .reg-blob { opacity: 0.10; }

  .reg-blob-1 {
    width: 420px; height: 420px;
    background: radial-gradient(circle, #6366f1, #3b82f6);
    top: -130px; left: -110px;
    animation: regBlobFloat 14s ease-in-out infinite alternate;
  }
  .reg-blob-2 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, #8b5cf6, #ec4899);
    bottom: -80px; right: -70px;
    animation: regBlobFloat 18s ease-in-out infinite alternate-reverse;
  }
  .reg-blob-3 {
    width: 180px; height: 180px;
    background: radial-gradient(circle, #06b6d4, #3b82f6);
    top: 45%; right: 8%;
    animation: regBlobFloat 11s ease-in-out infinite alternate;
  }
  @keyframes regBlobFloat {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(28px, 18px) scale(1.07); }
  }

  /* ── Card ── */
  .reg-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    background: var(--card-bg, rgba(255,255,255,0.04));
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    padding: 1.5rem 1.75rem 1.25rem;
    box-shadow: 0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset;
    backdrop-filter: blur(20px);
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  html.light .reg-card {
    background: #ffffff;
    border-color: #e5e7eb;
    box-shadow: 0 4px 32px rgba(0,0,0,0.10);
  }
  .reg-card.reg-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── er ── */
  .reg-er { text-align: center; margin-bottom: 1rem; }
  .reg-icon-wrap {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #3b82f6);
    margin-bottom: 0.6rem;
    box-shadow: 0 4px 20px rgba(99,102,241,0.4);
    font-size: 1.3rem; color: #fff;
  }
  .reg-title {
    font-family: 'Clash Display', 'DM Serif Display', Georgia, serif;
    font-size: 1.5rem; font-weight: 600;
    color: var(--text-primary, #f1f5f9);
    letter-spacing: -0.02em;
    margin: 0 0 0.2rem;
  }
  html.light .reg-title { color: #111827; }
  .reg-subtitle {
    font-size: 0.82rem;
    color: var(--text-muted, #64748b);
  }
  html.light .reg-subtitle { color: #6b7280; }

  /* ── Step indicator ── */
  .reg-steps {
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.1rem;
  }
  .reg-step-dot {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.78rem; font-weight: 600;
    border: 2px solid rgba(255,255,255,0.14);
    color: var(--text-muted, #64748b);
    background: transparent;
    transition: all 0.3s ease;
  }
  html.light .reg-step-dot { border-color: #d1d5db; color: #9ca3af; }
  .reg-step-dot.reg-active {
    background: linear-gradient(135deg, #6366f1, #3b82f6);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.22);
  }
  .reg-step-dot.reg-done {
    background: #22c55e;
    border-color: transparent;
    color: #fff;
  }
  .reg-step-line {
    width: 56px; height: 2px;
    background: rgba(255,255,255,0.1);
    transition: background 0.4s;
  }
  html.light .reg-step-line { background: #e5e7eb; }
  .reg-step-line.reg-done { background: #22c55e; }

  /* ── Fields ── */
  .reg-fields { display: flex; flex-direction: column; gap: 0.65rem; }
  .reg-field  { display: flex; flex-direction: column; gap: 0.25rem; }
  .reg-label  {
    font-size: 0.7rem; font-weight: 600;
    letter-spacing: 0.05em; text-transform: uppercase;
    color: var(--text-muted, #64748b);
    padding-left: 2px;
  }
  html.light .reg-label { color: #6b7280; }

  .reg-input-wrap { position: relative; }
  .reg-icon-left {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: var(--text-muted, #64748b); font-size: 0.95rem;
    pointer-events: none; transition: color 0.2s;
  }
  .reg-input-wrap:focus-within .reg-icon-left { color: #6366f1; }
  html.light .reg-input-wrap:focus-within .reg-icon-left { color: #4f46e5; }

  .reg-input {
    width: 100%; height: 42px;
    padding: 0 2.5rem 0 2.5rem;
    border-radius: 10px;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--text-primary, #f1f5f9);
    font-family: 'Satoshi', sans-serif;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    box-sizing: border-box;
  }
  html.light .reg-input {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #111827;
  }
  .reg-input::placeholder { color: var(--text-muted, #64748b); opacity: 0.7; }
  html.light .reg-input::placeholder { color: #9ca3af; opacity: 1; }

  .reg-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.16);
    background: rgba(99,102,241,0.05);
  }
  html.light .reg-input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.12);
    background: #f5f3ff;
  }

  .reg-input.reg-valid:not(:focus)   { border-color: #22c55e !important; }
  .reg-input.reg-error:not(:focus)   { border-color: #ef4444 !important; }

  .reg-input.reg-select {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-left: 2.75rem;
    padding-right: 2.5rem;
    cursor: pointer;
  }
  .reg-input.reg-select-noleft { padding-left: 1rem; }
  .reg-input.reg-select option { background: #1e2130; color: #f1f5f9; }
  html.light .reg-input.reg-select option { background: #fff; color: #111827; }
  .reg-input:disabled { opacity: 0.5; cursor: not-allowed; }

  .reg-eye-btn {
    position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--text-muted, #64748b);
    display: flex; align-items: center; padding: 4px;
    transition: color 0.2s;
  }
  .reg-eye-btn:hover { color: var(--text-primary, #f1f5f9); }
  html.light .reg-eye-btn:hover { color: #111827; }

  /* Phone */
  .reg-phone-row { display: flex; }
  .reg-phone-prefix {
    height: 42px; padding: 0 10px;
    border: 1.5px solid rgba(255,255,255,0.1);
    border-right: none;
    border-radius: 10px 0 0 10px;
    display: flex; align-items: center;
    font-size: 0.82rem; font-weight: 600;
    color: var(--text-muted, #64748b);
    background: rgba(255,255,255,0.04);
    white-space: nowrap;
    user-select: none;
    flex-shrink: 0;
  }
  html.light .reg-phone-prefix {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #6b7280;
  }
  .reg-phone-input {
    border-radius: 0 10px 10px 0 !important;
    padding-left: 12px !important;
    flex: 1;
  }

  /* Error text */
  .reg-err {
    font-size: 0.73rem; color: #ef4444;
    padding-left: 3px;
    animation: regFadeIn 0.2s ease;
  }
  @keyframes regFadeIn {
    from { opacity: 0; transform: translateY(-3px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Strength bar */
  .reg-strength-row {
    display: flex; align-items: center; gap: 8px; margin-top: 4px;
  }
  .reg-strength-bars { display: flex; gap: 3px; flex: 1; }
  .reg-strength-seg {
    height: 3px; flex: 1; border-radius: 99px;
    background: rgba(255,255,255,0.1);
    transition: background 0.3s;
  }
  html.light .reg-strength-seg { background: #e5e7eb; }
  .reg-strength-lbl {
    font-size: 0.68rem; font-weight: 600;
    min-width: 70px; text-align: right;
    transition: color 0.3s;
    color: var(--text-muted, #64748b);
  }

  /* PW Rules */
  .reg-pw-rules {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0.2rem 0.6rem;
    padding: 0.6rem 0.85rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    margin-top: 0.25rem;
    animation: regFadeIn 0.2s ease;
  }
  html.light .reg-pw-rules { background: #f9fafb; border-color: #e5e7eb; }
  .reg-pw-rule {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.7rem;
    color: var(--text-muted, #64748b);
    transition: color 0.2s;
  }
  .reg-pw-rule.ok { color: #22c55e; }
  .reg-pw-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: currentColor; flex-shrink: 0;
  }

  /* Info box */
  .reg-info-box {
    display: flex; gap: 8px; align-items: flex-start;
    padding: 0.65rem 0.85rem;
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 10px;
    font-size: 0.76rem;
    color: var(--text-secondary, #94a3b8);
    line-height: 1.5;
  }
  html.light .reg-info-box {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #4338ca;
  }

  /* Buttons */
  .reg-btn-row { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.25rem; }
  .reg-btn-primary {
    width: 100%; height: 44px; border-radius: 10px;
    border: none; cursor: pointer;
    font-family: 'Satoshi', sans-serif;
    font-size: 0.92rem; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
    color: #fff;
    box-shadow: 0 4px 18px rgba(99,102,241,0.38);
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  }
  .reg-btn-primary:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(99,102,241,0.48);
  }
  .reg-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .reg-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

  .reg-btn-back {
    background: none; border: none; cursor: pointer;
    font-family: 'Satoshi', sans-serif;
    font-size: 0.84rem; font-weight: 500;
    color: var(--text-muted, #64748b);
    display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 6px;
    transition: color 0.2s;
    width: 100%;
  }
  .reg-btn-back:hover { color: var(--text-primary, #f1f5f9); }
  html.light .reg-btn-back:hover { color: #111827; }

  /* Spinner */
  .reg-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: regSpin 0.7s linear infinite;
  }
  @keyframes regSpin { to { transform: rotate(360deg); } }

  /* Footer */
  .reg-footer {
    text-align: center; margin-top: 1rem;
    font-size: 0.82rem;
    color: var(--text-muted, #64748b);
  }
  html.light .reg-footer { color: #6b7280; }
  .reg-footer-link {
    background: none; border: none; cursor: pointer;
    color: #6366f1; font-weight: 600;
    font-family: inherit; font-size: inherit;
    padding: 0; margin-left: 4px;
    transition: color 0.2s;
  }
  html.light .reg-footer-link { color: #4f46e5; }
  .reg-footer-link:hover { color: #818cf8; text-decoration: underline; }
`;

function Register() {
  const navigate = useNavigate();

  const [step, setStep]               = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [pwFocused, setPwFocused]     = useState(false);
  const [touched, setTouched]         = useState({});
  const [visible, setVisible]         = useState(false);

  const [societies, setSocieties] = useState([]);
  const [blocks, setBlocks]       = useState([]);
  const [flats, setFlats]         = useState([]);

  const [formData, setFormData] = useState({
    name: "", email: "", mobile: "", password: "",
    society_id: "", block_id: "", flat_id: "",
  });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    API.get("/public/societies")
      .then((res) => setSocieties(res.data))
      .catch(console.error);
  }, []);

  const handleSocietyChange = async (e) => {
    const societyId = e.target.value;
    setFormData((p) => ({ ...p, society_id: societyId, block_id: "", flat_id: "" }));
    try {
      const res = await API.get(`/public/societies/${societyId}/blocks`);
      setBlocks(res.data); setFlats([]);
    } catch (err) { console.error(err); }
  };

  const handleBlockChange = async (e) => {
    const blockId = e.target.value;
    setFormData((p) => ({ ...p, block_id: blockId, flat_id: "" }));
    try {
      const res = await API.get(`/public/blocks/${blockId}/flats`);
      setFlats(res.data);
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const touch = (f) => setTouched((p) => ({ ...p, [f]: true }));

  const isEmail  = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isMobile = (v) => /^\d{10}$/.test(v);
  const isPwOk   = (v) => pwStrength(v) === 5;

  const inputClass = (field, valid) => {
    if (!touched[field]) return "reg-input";
    return `reg-input ${valid ? "reg-valid" : "reg-error"}`;
  };

  const nextStep = () => {
    setTouched({ name: true, email: true, mobile: true, password: true });
    if (!formData.name || !isEmail(formData.email) ||
        !isMobile(formData.mobile) || !isPwOk(formData.password)) {
      toast.error("Please fix all errors before continuing.");
      return;
    }
    setStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        phone: formData.mobile,
        password: formData.password,
        society_id: Number(formData.society_id),
        flat_id: Number(formData.flat_id),
      });
      navigate("/registration-pending", { state: { userId: res.data.userId } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  const strength = pwStrength(formData.password);

  return (
    <>
      <style>{STYLES}</style>

      <div className="reg-root">
        <div className="reg-blob reg-blob-1" />
        <div className="reg-blob reg-blob-2" />
        <div className="reg-blob reg-blob-3" />

        <div className={`reg-card ${visible ? "reg-visible" : ""}`}>

          {/* ── er ── */}
          <div className="reg-er">
            <div className="reg-icon-wrap">
              <HiOutlineOfficeBuilding />
            </div>
            <h1 className="reg-title">Create Account</h1>
            <p className="reg-subtitle">Join {APP_NAME} — Register below</p>
          </div>

          {/* ── Steps ── */}
          <div className="reg-steps">
            <div className={`reg-step-dot ${step === 1 ? "reg-active" : "reg-done"}`}>
              {step > 1 ? <FiCheck size={14} /> : "1"}
            </div>
            <div className={`reg-step-line ${step > 1 ? "reg-done" : ""}`} />
            <div className={`reg-step-dot ${step === 2 ? "reg-active" : ""}`}>2</div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleRegister}>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="reg-fields">

                {/* Name */}
                <div className="reg-field">
                  <label className="reg-label">Full Name</label>
                  <div className="reg-input-wrap">
                    <FiUser className="reg-icon-left" />
                    <input
                      type="text" name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={() => touch("name")}
                      className={inputClass("name", !!formData.name)}
                    />
                  </div>
                  {touched.name && !formData.name &&
                    <span className="reg-err">Full name is required.</span>}
                </div>

                {/* Email */}
                <div className="reg-field">
                  <label className="reg-label">Email Address</label>
                  <div className="reg-input-wrap">
                    <MdEmail className="reg-icon-left" />
                    <input
                      type="email" name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => touch("email")}
                      className={inputClass("email", isEmail(formData.email))}
                    />
                  </div>
                  {touched.email && !isEmail(formData.email) &&
                    <span className="reg-err">Enter a valid email address.</span>}
                </div>

                {/* Mobile */}
                <div className="reg-field">
                  <label className="reg-label">Mobile Number</label>
                  <div className="reg-phone-row">
                    <div className="reg-phone-prefix">🇮🇳 +91</div>
                    <input
                      type="tel" name="mobile"
                      placeholder="9876543210"
                      value={formData.mobile}
                      onChange={handleChange}
                      onBlur={() => touch("mobile")}
                      maxLength={10}
                      className={`${inputClass("mobile", isMobile(formData.mobile))} reg-phone-input`}
                    />
                  </div>
                  {touched.mobile && !isMobile(formData.mobile) &&
                    <span className="reg-err">Enter a valid 10-digit mobile number.</span>}
                </div>

                {/* Password */}
                <div className="reg-field">
                  <label className="reg-label">Password</label>
                  <div className="reg-input-wrap">
                    <FiLock className="reg-icon-left" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setPwFocused(true)}
                      onBlur={() => { setPwFocused(false); touch("password"); }}
                      className={inputClass("password", isPwOk(formData.password))}
                    />
                    <button
                      type="button"
                      className="reg-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword
                        ? <AiOutlineEyeInvisible size={17} />
                        : <AiOutlineEye size={17} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {formData.password.length > 0 && (
                    <div className="reg-strength-row">
                      <div className="reg-strength-bars">
                        {[1,2,3,4,5].map((i) => (
                          <div
                            key={i}
                            className="reg-strength-seg"
                            style={{ background: i <= strength ? STRENGTH_COLORS[strength] : undefined }}
                          />
                        ))}
                      </div>
                      <span
                        className="reg-strength-lbl"
                        style={{ color: strength > 0 ? STRENGTH_COLORS[strength] : undefined }}
                      >
                        {STRENGTH_LABELS[strength]}
                      </span>
                    </div>
                  )}

                  {/* Rules checklist */}
                  {(pwFocused || (touched.password && !isPwOk(formData.password))) && (
                    <div className="reg-pw-rules">
                      {PW_RULES.map((r) => (
                        <div
                          key={r.id}
                          className={`reg-pw-rule ${r.test(formData.password) ? "ok" : ""}`}
                        >
                          <div className="reg-pw-dot" />
                          {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="reg-btn-row">
                  <button type="button" onClick={nextStep} className="reg-btn-primary">
                    Continue <FiArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="reg-fields">

                {/* Society */}
                <div className="reg-field">
                  <label className="reg-label">Society</label>
                  <div className="reg-input-wrap">
                    <HiOutlineOfficeBuilding className="reg-icon-left" />
                    <Select
                      value={formData.society_id}
                      onChange={handleSocietyChange}
                      className="reg-input reg-select"
                      required
                    >
                      <option value="">Select your society</option>
                      {societies.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Block */}
                <div className="reg-field">
                  <label className="reg-label">Block / Tower</label>
                  <div className="reg-input-wrap">
                    <Select
                      value={formData.block_id}
                      onChange={handleBlockChange}
                      className="reg-input reg-select reg-select-noleft"
                      disabled={!formData.society_id}
                      required
                    >
                      <option value="">Select block</option>
                      {blocks.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Flat */}
                <div className="reg-field">
                  <label className="reg-label">Flat / Unit</label>
                  <div className="reg-input-wrap">
                    <Select
                      name="flat_id"
                      value={formData.flat_id}
                      onChange={handleChange}
                      className="reg-input reg-select reg-select-noleft"
                      disabled={!formData.block_id}
                      required
                    >
                      <option value="">Select flat</option>
                      {flats.map((f) => (
                        <option key={f.id} value={f.id}>{f.flat_number}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Info */}
                <div className="reg-info-box">
                  <span style={{ fontSize: "1rem", marginTop: "1px", flexShrink: 0 }}>ℹ️</span>
                  <span>
                    Your account will be <strong>pending approval</strong> until a Society Admin verifies your registration. You'll be notified once approved.
                  </span>
                </div>

                <div className="reg-btn-row">
                  <button
                    type="submit"
                    disabled={loading || !formData.society_id || !formData.flat_id}
                    className="reg-btn-primary"
                  >
                    {loading
                      ? <><div className="reg-spinner" /> Registering…</>
                      : <><FiCheck size={15} /> Complete Registration</>}
                  </button>
                  <button type="button" onClick={() => setStep(1)} className="reg-btn-back">
                    <FiArrowLeft size={13} /> Back to details
                  </button>
                </div>

              </div>
            )}
          </form>

          {/* Footer */}
          <div className="reg-footer">
            Already have an account?
            <button className="reg-footer-link" onClick={() => navigate("/login")}>
              Sign in
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default Register;  
