import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { APP_NAME } from "../constants/app";
import API from "../services/api";
import { MdEmail } from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FiUser, FiLock, FiArrowRight, FiArrowLeft, FiCheck } from "react-icons/fi";
import {
  HiOutlineBuildingOffice2,
  HiOutlineSparkles,
  HiOutlineArrowLeft
} from "react-icons/hi2";
import { toast } from "react-toastify";
import Select from "../components/common/Select";
import ThemeToggle from "../components/common/ThemeToggle";

import homeBannerImg from "../assets/Photos/Home/Home.png";
import "./Register.css";

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
const STRENGTH_COLORS = ["", "#ef4444", "#2563EB", "#eab308", "#22c55e", "#10b981"];

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
    <div className="reg-root">
      {/* Glowing Ambient Orbs */}
      <div className="reg-glow-orb orb-1" />
      <div className="reg-glow-orb orb-2" />

      {/* Full-bleed background photo of residential community */}
      <img
        src={homeBannerImg}
        alt="Residential Community Background"
        className="reg-bg-photo"
      />

      {/* Header Bar */}
      <header className="reg-top-bar">
        <Link to="/" className="reg-brand-logo">
          <div className="reg-brand-icon">
            <HiOutlineBuildingOffice2 />
          </div>
          <div>
            <div className="reg-brand-title">Society Management</div>
          </div>
        </Link>

        <div className="reg-top-actions">
          <ThemeToggle />
          <Link to="/" className="reg-back-home">
            <HiOutlineArrowLeft /> Back to Home
          </Link>
        </div>
      </header>

      {/* Register Glassmorphism Card */}
      <div className={`reg-card ${visible ? "reg-visible" : ""}`}>

        {/* Card Header */}
        <div className="reg-header">
          <div className="reg-badge">
            <HiOutlineSparkles /> Resident Registration Portal
          </div>
          <h1 className="reg-title">Create Account</h1>
          <p className="reg-subtitle">Join {APP_NAME} — Complete details below</p>
        </div>

        {/* Steps Bar */}
        <div className="reg-steps">
          <div className={`reg-step-dot ${step === 1 ? "reg-active" : "reg-done"}`}>
            {step > 1 ? <FiCheck size={14} /> : "1"}
          </div>
          <div className={`reg-step-line ${step > 1 ? "reg-done" : ""}`} />
          <div className={`reg-step-dot ${step === 2 ? "reg-active" : ""}`}>2</div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister}>

          {/* STEP 1 (Two Textboxes per Row) */}
          {step === 1 && (
            <div className="reg-fields">

              {/* Row 1: Full Name & Email Address */}
              <div className="reg-row-2col">
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
                    <span className="reg-err">Enter a valid email.</span>}
                </div>
              </div>

              {/* Row 2: Mobile Number & Password */}
              <div className="reg-row-2col">
                <div className="reg-field">
                  <label className="reg-label">Mobile Number</label>
                  <div className="reg-phone-row">
                    <div className="reg-input-wrap" style={{ width: "100%" }}>
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
                  </div>
                  {touched.mobile && !isMobile(formData.mobile) &&
                    <span className="reg-err">Enter 10-digit mobile.</span>}
                </div>

                <div className="reg-field">
                  <label className="reg-label">Password</label>
                  <div className="reg-input-wrap">
                    <FiLock className="reg-icon-left" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create password"
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
                </div>
              </div>

              {/* Password Rules Checklist */}
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

              {/* Society (Full Width) */}
              <div className="reg-field">
                <label className="reg-label">Society</label>
                <div className="reg-input-wrap">
                  <HiOutlineBuildingOffice2 className="reg-icon-left" />
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

              {/* Row 2: Block & Flat in One Row */}
              <div className="reg-row-2col">
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
  );
}

export default Register;
