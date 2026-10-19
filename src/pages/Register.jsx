import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { APP_NAME } from "../constants/app";
import API from "../services/api";
import {
  MdEmail,
  MdOutlineLocationOn,
  MdOutlineBadge,
  MdOutlineCreditCard,
  MdCheckCircle,
  MdSearch,
  MdApartment,
  MdCameraAlt,
  MdKeyboardArrowDown,
  MdDirectionsCar,
  MdPeopleAlt,
  MdOutlineContactPhone,
} from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import {
  FiUser,
  FiLock,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiHome,
} from "react-icons/fi";
import {
  HiOutlineBuildingOffice2,
  HiOutlineSparkles,
  HiOutlineArrowLeft,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { toast } from "react-toastify";
import ThemeToggle from "../components/common/ThemeToggle";
import { getTitleError, getEmailError, getMobileError } from "../utils/validators";

import homeBannerImg from "../assets/Photos/Home/Home.png";
import "./Register.css";

/* ─── Password rule checks ─── */
const PW_RULES = [
  { id: "len",   label: "At least 8 chars",       test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase (A-Z)",    test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase (a-z)",    test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "One number (0-9)",       test: (p) => /\d/.test(p) },
  { id: "spec",  label: "One special char (!@#)", test: (p) => /[\W_]/.test(p) },
];

function pwStrength(p) {
  return PW_RULES.filter((r) => r.test(p)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Moderate", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["", "#ef4444", "#2563EB", "#eab308", "#22c55e", "#10b981"];

// Helper to convert File to base64 Data URL
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

function Register() {
  const navigate = useNavigate();

  // 5 Step Flow
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [touched, setTouched] = useState({});
  const [visible, setVisible] = useState(false);

  // Societies, Wings/Blocks, Floors, Flats
  const [societies, setSocieties] = useState([]);
  const [societySearch, setSocietySearch] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [floors, setFloors] = useState([]);
  const [flats, setFlats] = useState([]);

  // Main Form Data
  const [formData, setFormData] = useState({
    society_id: "",
    name: "",
    email: "",
    mobile: "",
    password: "",
    occupant_count: 1,
    vehicle_count: 0,
    emergency_name: "",
    emergency_phone: "",
    profile_picture: "",
    aadhar_card: "",
    pan_card: "",
    block_id: "",
    floor_id: "",
    flat_id: "",
    resident_type: "OWNER",
  });

  // Previews & File Metadata
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [aadharName, setAadharName] = useState("");
  const [panPreview, setPanPreview] = useState(null);
  const [panName, setPanName] = useState("");

  const profileInputRef = useRef(null);
  const aadharInputRef = useRef(null);
  const panInputRef = useRef(null);

  // Email Check Status
  const [emailCheckState, setEmailCheckState] = useState({
    status: "idle",
    user: null,
    message: "",
  });
  const [useExistingAccount, setUseExistingAccount] = useState(false);

  // Load public societies on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    API.get("/public/societies")
      .then((res) => setSocieties(res.data || []))
      .catch((err) => console.error("Failed to load societies:", err));
  }, []);

  // Filtered Societies for Step 1
  const filteredSocieties = useMemo(() => {
    const q = (societySearch || "").trim().toLowerCase();
    if (!q) return societies;
    return societies.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [societies, societySearch]);

  const selectedSocietyObj = useMemo(
    () => societies.find((s) => String(s.id) === String(formData.society_id)),
    [societies, formData.society_id]
  );

  const selectedBlockObj = useMemo(
    () => blocks.find((b) => String(b.id) === String(formData.block_id)),
    [blocks, formData.block_id]
  );

  const selectedFloorObj = useMemo(
    () => floors.find((fl) => String(fl.id) === String(formData.floor_id)),
    [floors, formData.floor_id]
  );

  const selectedFlatObj = useMemo(
    () => flats.find((f) => String(f.id) === String(formData.flat_id)),
    [flats, formData.flat_id]
  );

  // Load Wings/Blocks when society changes
  const handleSelectSociety = async (societyId) => {
    setFormData((p) => ({
      ...p,
      society_id: societyId,
      block_id: "",
      floor_id: "",
      flat_id: "",
    }));
    setBlocks([]);
    setFloors([]);
    setFlats([]);

    try {
      const res = await API.get(`/public/societies/${societyId}/blocks`);
      setBlocks(res.data || []);
    } catch (err) {
      console.error("Failed to load blocks:", err);
    }
  };

  // Load Floors and Flats when Block changes
  const handleBlockChange = async (e) => {
    const blockId = e.target.value;
    setFormData((p) => ({ ...p, block_id: blockId, floor_id: "", flat_id: "" }));
    setFloors([]);
    setFlats([]);

    if (!blockId) return;

    try {
      const [floorRes, flatRes] = await Promise.all([
        API.get(`/public/blocks/${blockId}/floors`).catch(() => ({ data: [] })),
        API.get(`/public/blocks/${blockId}/flats`).catch(() => ({ data: [] })),
      ]);

      setFloors(floorRes.data || []);
      setFlats(flatRes.data || []);
    } catch (err) {
      console.error("Failed to load block data:", err);
    }
  };

  // Filter Flats by Floor when Floor changes
  const handleFloorChange = async (e) => {
    const floorId = e.target.value;
    setFormData((p) => ({ ...p, floor_id: floorId, flat_id: "" }));

    if (!formData.block_id) return;

    try {
      const res = await API.get(`/public/blocks/${formData.block_id}/flats`, {
        params: floorId ? { floor_id: floorId } : undefined,
      });
      setFlats(res.data || []);
    } catch (err) {
      console.error("Failed to load floor flats:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (name === "email") {
      setEmailCheckState({ status: "idle", user: null, message: "" });
      setUseExistingAccount(false);
    }
  };

  // Check email existence in backend
  const handleCheckEmail = async () => {
    const emailToTest = (formData.email || "").trim().toLowerCase();
    if (!emailToTest) {
      toast.warning("Please enter your email address first.");
      return;
    }
    if (!isEmail(emailToTest)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setEmailCheckState({ status: "checking", user: null, message: "Checking email availability..." });
    try {
      const res = await API.get("/auth/check-email", {
        params: {
          email: emailToTest,
          society_id: formData.society_id || undefined,
        },
      });
      const data = res.data;
      if (!data.exists) {
        setEmailCheckState({
          status: "not_found",
          user: null,
          message: data.message || "Email is available. New resident account will be created.",
        });
        setUseExistingAccount(false);
      } else if (data.alreadyMember) {
        setEmailCheckState({
          status: "already_member",
          user: data.user,
          message: data.message || "You are already registered in this society.",
        });
        setUseExistingAccount(false);
      } else {
        setEmailCheckState({
          status: "exists_other",
          user: data.user,
          message: data.message || "Existing account found in another society.",
        });
      }
    } catch (err) {
      setEmailCheckState({
        status: "idle",
        user: null,
        message: err.response?.data?.message || "Failed to check email.",
      });
      toast.error(err.response?.data?.message || "Failed to check email.");
    }
  };

  // Pre-fill existing account data
  const handleApplyExistingUser = (existingUser) => {
    if (!existingUser) return;

    setFormData((prev) => ({
      ...prev,
      name: existingUser.name || prev.name,
      mobile: existingUser.phone || prev.mobile,
      password: "••••••••", // Preloaded saved account password
      occupant_count: existingUser.occupant_count != null ? existingUser.occupant_count : prev.occupant_count,
      vehicle_count: existingUser.vehicle_count != null ? existingUser.vehicle_count : prev.vehicle_count,
      emergency_name: existingUser.emergency_contact?.name || prev.emergency_name,
      emergency_phone: existingUser.emergency_contact?.phone || prev.emergency_phone,
      profile_picture: existingUser.profile_picture || prev.profile_picture,
      aadhar_card: existingUser.documents?.aadhar_url || prev.aadhar_card,
      pan_card: existingUser.documents?.pan_url || prev.pan_card,
    }));

    if (existingUser.profile_picture) {
      setProfilePicPreview(existingUser.profile_picture);
    }
    if (existingUser.documents?.aadhar_url) {
      setAadharPreview(existingUser.documents.aadhar_url);
      setAadharName("Existing Verified Aadhaar on file");
    }
    if (existingUser.documents?.pan_url) {
      setPanPreview(existingUser.documents.pan_url);
      setPanName("Existing Verified PAN on file");
    }

    setUseExistingAccount(true);
    toast.success(`Account details and saved password loaded for ${existingUser.name}!`);
  };

  const handleUnlinkExistingAccount = () => {
    setUseExistingAccount(false);
    setFormData((prev) => ({
      ...prev,
      password: "",
    }));
    toast.info("Unlinked. You can enter new registration details.");
  };

  // File Handlers
  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture size must be under 5MB");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setProfilePicPreview(base64);
      setFormData((p) => ({ ...p, profile_picture: base64 }));
    } catch (err) {
      toast.error("Failed to read image file");
    }
  };

  const handleAadharChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Aadhaar document size must be under 8MB");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setAadharPreview(base64);
      setAadharName(file.name);
      setFormData((p) => ({ ...p, aadhar_card: base64 }));
    } catch (err) {
      toast.error("Failed to read Aadhaar file");
    }
  };

  const handlePanChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("PAN document size must be under 8MB");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setPanPreview(base64);
      setPanName(file.name);
      setFormData((p) => ({ ...p, pan_card: base64 }));
    } catch (err) {
      toast.error("Failed to read PAN file");
    }
  };

  const touch = (f) => setTouched((p) => ({ ...p, [f]: true }));
  const isEmail = (v) => getEmailError(v) === null;
  const isMobile = (v) => getMobileError(v) === null;
  const isPwOk = (v) => (useExistingAccount ? v && v.trim().length > 0 : pwStrength(v) === 5);

  const inputClass = (field, valid) => {
    if (!touched[field]) return "reg-input";
    return `reg-input ${valid ? "reg-valid" : "reg-error"}`;
  };

  // Step Validation & Navigation
  const goToStep = (target) => {
    if (target < step) {
      setStep(target);
      return;
    }
    if (step === 1) {
      if (!formData.society_id) {
        toast.warning("Please select your society to continue.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setTouched({ name: true, email: true, mobile: true, password: true });
      if (
        getTitleError(formData.name, "Full name") ||
        !isEmail(formData.email) ||
        !isMobile(formData.mobile) ||
        !isPwOk(formData.password)
      ) {
        toast.error("Please enter valid account details before proceeding.");
        return;
      }
      if (emailCheckState.status === "already_member") {
        toast.error("You are already registered in this society. Please sign in instead.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (Number(formData.occupant_count) < 1) {
        toast.warning("Occupant count must be at least 1.");
        return;
      }
      if (formData.emergency_phone && !isMobile(formData.emergency_phone)) {
        toast.error("Emergency phone must be a valid 10-digit number.");
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
  };

  // Final Registration Submission
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.society_id) {
      toast.error("Please select a society.");
      setStep(1);
      return;
    }
    if (!formData.flat_id) {
      toast.error("Please select your flat/unit.");
      return;
    }

    setLoading(true);
    try {
      const emergencyContact =
        formData.emergency_name.trim() && formData.emergency_phone.trim()
          ? { name: formData.emergency_name.trim(), phone: formData.emergency_phone.trim() }
          : undefined;

      const payload = {
        name: formData.name.trim().replace(/\s+/g, " "),
        email: formData.email.trim(),
        phone: formData.mobile,
        password:
          useExistingAccount && (!formData.password || formData.password === "••••••••")
            ? "__LINKED_EXISTING_USER__"
            : formData.password,
        use_existing_account: useExistingAccount,
        society_id: Number(formData.society_id),
        flat_id: Number(formData.flat_id),
        resident_type: "OWNER",
        occupant_count: Number(formData.occupant_count) || 1,
        vehicle_count: Number(formData.vehicle_count) || 0,
        emergency_contact: emergencyContact,
        profile_picture: formData.profile_picture || undefined,
        aadhar_card: formData.aadhar_card || undefined,
        pan_card: formData.pan_card || undefined,
      };

      const res = await API.post("/auth/register", payload);
      toast.success("Registration submitted successfully!");
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
      {/* Ambient Glow */}
      <div className="reg-glow-orb orb-1" />
      <div className="reg-glow-orb orb-2" />

      {/* Background photo */}
      <img
        src={homeBannerImg}
        alt="Residential Background"
        className="reg-bg-photo"
      />

      {/* Header Bar */}
      <header className="reg-top-bar">
        <Link to="/" className="reg-brand-logo">
          <div className="reg-brand-icon">
            <HiOutlineBuildingOffice2 />
          </div>
          <div className="reg-brand-title">{APP_NAME || "Society Management"}</div>
        </Link>

        <div className="reg-top-actions">
          <ThemeToggle />
          <Link to="/" className="reg-back-home">
            <HiOutlineArrowLeft /> Back to Home
          </Link>
        </div>
      </header>

      {/* Compact Card Container */}
      <div className={`reg-card ${visible ? "reg-visible" : ""}`}>
        {/* Compact Header */}
        <div className="reg-header">
          <div className="reg-badge">
            <HiOutlineSparkles /> Resident Registration
          </div>
          <h1 className="reg-title">Join Your Community</h1>
          <p className="reg-subtitle">
            {step === 1 && "Step 1 of 5 • Choose your society"}
            {step === 2 && "Step 2 of 5 • Personal & login details"}
            {step === 3 && "Step 3 of 5 • Household & vehicles"}
            {step === 4 && "Step 4 of 5 • Profile photo & KYC verification"}
            {step === 5 && "Step 5 of 5 • Select wing, floor & unit"}
          </p>
        </div>

        {/* 5-Step Compact Progress Stepper */}
        <div className="reg-steps-wizard">
          {[
            { num: 1, label: "Society" },
            { num: 2, label: "Account" },
            { num: 3, label: "Household" },
            { num: 4, label: "KYC" },
            { num: 5, label: "Unit" },
          ].map((s, idx) => (
            <div key={s.num} className="reg-step-node">
              <div
                className={`reg-step-dot ${
                  step === s.num ? "reg-active" : step > s.num ? "reg-done" : ""
                }`}
                onClick={() => s.num < step && setStep(s.num)}
                style={{ cursor: s.num < step ? "pointer" : "default" }}
              >
                {step > s.num ? <FiCheck size={12} /> : s.num}
              </div>
              <span className={`reg-step-label ${step === s.num ? "active" : ""}`}>
                {s.label}
              </span>
              {idx < 4 && (
                <div
                  className={`reg-step-line ${step > s.num ? "reg-done" : ""}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Container */}
        <form onSubmit={handleRegister}>
          {/* ═══════════════════════════════════════════════════════════
              STEP 1: SELECT SOCIETY
             ═══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="reg-fields animate-fadeIn">
              {/* Society Search Input */}
              <div className="reg-input-wrap reg-search-wrap">
                <MdSearch className="reg-icon-left" />
                <input
                  type="text"
                  placeholder="Search society by name or location…"
                  value={societySearch}
                  onChange={(e) => setSocietySearch(e.target.value)}
                  className="reg-input"
                />
                {societySearch && (
                  <button
                    type="button"
                    onClick={() => setSocietySearch("")}
                    className="reg-clear-btn"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Society Selection Cards Grid */}
              <div className="reg-society-grid">
                {filteredSocieties.length === 0 ? (
                  <div className="reg-empty-societies">
                    <MdApartment size={28} />
                    <p>No societies found matching "{societySearch}"</p>
                  </div>
                ) : (
                  filteredSocieties.map((soc) => {
                    const isSelected = String(formData.society_id) === String(soc.id);
                    return (
                      <div
                        key={soc.id}
                        onClick={() => handleSelectSociety(soc.id)}
                        className={`reg-society-card ${isSelected ? "selected" : ""}`}
                      >
                        <div className="reg-soc-card-icon">
                          <MdApartment size={20} />
                        </div>
                        <div className="reg-soc-card-info">
                          <h4 className="reg-soc-card-title">{soc.name}</h4>
                          {soc.address && (
                            <p className="reg-soc-card-addr">
                              <MdOutlineLocationOn size={12} /> {soc.address}
                            </p>
                          )}
                        </div>
                        <div className="reg-soc-card-check">
                          {isSelected ? (
                            <MdCheckCircle size={20} color="#38bdf8" />
                          ) : (
                            <div className="reg-radio-circle" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="reg-btn-row">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={!formData.society_id}
                  className="reg-btn-primary"
                >
                  Continue to Account Details <FiArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 2: EMAIL CHECK & ACCOUNT DETAILS
             ═══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="reg-fields animate-fadeIn">
              {/* Selected Society Mini Header */}
              {selectedSocietyObj && (
                <div className="reg-selected-chip">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
                    <HiOutlineBuildingOffice2 size={15} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Society: <strong>{selectedSocietyObj.name}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="reg-chip-change-btn"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Email Address with Check Button */}
              <div className="reg-field">
                <label className="reg-label">Email Address (Check Existing Account)</label>
                <div className="reg-email-row">
                  <div className="reg-input-wrap" style={{ flex: 1 }}>
                    <MdEmail className="reg-icon-left" />
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => touch("email")}
                      className={inputClass("email", isEmail(formData.email))}
                    />
                  </div>
                  <button
                    type="button"
                    className="reg-btn-check"
                    onClick={handleCheckEmail}
                    disabled={emailCheckState.status === "checking" || !formData.email}
                  >
                    {emailCheckState.status === "checking" ? (
                      <div className="reg-spinner" />
                    ) : (
                      <>
                        <HiOutlineShieldCheck size={15} /> Check
                      </>
                    )}
                  </button>
                </div>
                {touched.email && !isEmail(formData.email) && (
                  <span className="reg-err">Enter a valid email address.</span>
                )}

                {/* Email Check Status Messages */}
                {emailCheckState.status === "not_found" && (
                  <div className="reg-status-chip success">
                    <MdCheckCircle size={14} /> {emailCheckState.message}
                  </div>
                )}

                {emailCheckState.status === "already_member" && (
                  <div className="reg-status-chip error">
                    <div>{emailCheckState.message}</div>
                    <Link to="/login" className="reg-status-link">
                      Sign In →
                    </Link>
                  </div>
                )}

                {emailCheckState.status === "exists_other" && !useExistingAccount && (
                  <div className="reg-reuse-card animate-scaleIn">
                    <div className="reg-reuse-header">
                      <span className="reg-reuse-title">
                        <FiCheck size={14} /> Existing Account Found: {emailCheckState.user?.name}
                      </span>
                    </div>
                    <p className="reg-reuse-desc">
                      Verified profile found. Click below to reuse your personal details, saved password, household, and KYC documents.
                    </p>
                    <button
                      type="button"
                      className="reg-reuse-action-btn"
                      onClick={() => handleApplyExistingUser(emailCheckState.user)}
                    >
                      <HiOutlineShieldCheck size={15} /> Use Existing Account & Load Data
                    </button>
                  </div>
                )}
              </div>

              {/* Notice when existing account is applied */}
              {useExistingAccount && (
                <div className="reg-linked-banner animate-scaleIn">
                  <div className="reg-linked-content">
                    <div className="reg-linked-badge-icon">
                      <MdCheckCircle size={18} />
                    </div>
                    <div className="reg-linked-text">
                      <strong>Profile Linked: {formData.name}</strong>
                      <span>Saved password, household details & KYC synced.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="reg-unlink-btn"
                    onClick={handleUnlinkExistingAccount}
                    title="Unlink and enter different details"
                  >
                    Unlink
                  </button>
                </div>
              )}

              {/* Full Name */}
              <div className="reg-field">
                <label className="reg-label">Full Name</label>
                <div className="reg-input-wrap">
                  <FiUser className="reg-icon-left" />
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Johnathan Doe"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => touch("name")}
                    className={inputClass("name", getTitleError(formData.name, "Full name") === null)}
                  />
                </div>
                {touched.name && getTitleError(formData.name, "Full name") && (
                  <span className="reg-err">{getTitleError(formData.name, "Full name")}</span>
                )}
              </div>

              {/* Row: Contact Number & Password */}
              <div className="reg-row-2col">
                <div className="reg-field">
                  <label className="reg-label">Mobile Number</label>
                  <div className="reg-phone-row">
                    <div className="reg-input-wrap" style={{ width: "100%" }}>
                      <div className="reg-phone-prefix">🇮🇳 +91</div>
                      <input
                        type="tel"
                        name="mobile"
                        placeholder="9876543210"
                        value={formData.mobile}
                        onChange={handleChange}
                        onBlur={() => touch("mobile")}
                        maxLength={10}
                        className={`${inputClass("mobile", isMobile(formData.mobile))} reg-phone-input`}
                      />
                    </div>
                  </div>
                  {touched.mobile && getMobileError(formData.mobile, "Mobile number") && (
                    <span className="reg-err">{getMobileError(formData.mobile, "Mobile number")}</span>
                  )}
                </div>

                <div className="reg-field">
                  <div className="reg-label-row">
                    <label className="reg-label">Password</label>
                    {useExistingAccount && (
                      <span className="reg-loaded-pw-badge">
                        <FiCheck size={10} /> Saved Password Loaded
                      </span>
                    )}
                  </div>
                  <div className="reg-input-wrap">
                    <FiLock className="reg-icon-left" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder={useExistingAccount ? "Saved password" : "Create password"}
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setPwFocused(true)}
                      onBlur={() => {
                        setPwFocused(false);
                        touch("password");
                      }}
                      className={inputClass("password", isPwOk(formData.password))}
                    />
                    <button
                      type="button"
                      className="reg-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={16} /> : <AiOutlineEye size={16} />}
                    </button>
                  </div>

                  {useExistingAccount ? (
                    <span className="reg-loaded-pw-hint">
                      🔐 Saved password loaded automatically from your account.
                    </span>
                  ) : null}

                  {/* Password Strength Meter */}
                  {!useExistingAccount && formData.password.length > 0 && (
                    <div className="reg-strength-row">
                      <div className="reg-strength-bars">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="reg-strength-seg"
                            style={{
                              background: i <= strength ? STRENGTH_COLORS[strength] : undefined,
                            }}
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
              {!useExistingAccount &&
                (pwFocused || (touched.password && !isPwOk(formData.password))) && (
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
                <button type="button" onClick={() => goToStep(3)} className="reg-btn-primary">
                  Continue to Household <FiArrowRight size={15} />
                </button>
                <button type="button" onClick={() => setStep(1)} className="reg-btn-back">
                  <FiArrowLeft size={13} /> Back to Society Selection
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 3: HOUSEHOLD & VEHICLES
             ═══════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="reg-fields animate-fadeIn">
              {/* Occupants & Vehicles Premium Cards */}
              <div className="reg-row-2col">
                <div className="reg-counter-card">
                  <div className="reg-counter-header">
                    <div className="reg-counter-icon occupants">
                      <MdPeopleAlt size={18} />
                    </div>
                    <div className="reg-counter-text">
                      <span className="reg-counter-title">Occupants</span>
                      <span className="reg-counter-sub">Family members</span>
                    </div>
                  </div>
                  <div className="reg-stepper-control">
                    <button
                      type="button"
                      className="reg-step-btn"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          occupant_count: Math.max(1, Number(p.occupant_count || 1) - 1),
                        }))
                      }
                      title="Decrease occupants"
                    >
                      −
                    </button>
                    <span className="reg-stepper-val">{formData.occupant_count}</span>
                    <button
                      type="button"
                      className="reg-step-btn"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          occupant_count: Number(p.occupant_count || 1) + 1,
                        }))
                      }
                      title="Increase occupants"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="reg-counter-card">
                  <div className="reg-counter-header">
                    <div className="reg-counter-icon vehicles">
                      <MdDirectionsCar size={18} />
                    </div>
                    <div className="reg-counter-text">
                      <span className="reg-counter-title">Vehicles</span>
                      <span className="reg-counter-sub">Cars & 2-wheelers</span>
                    </div>
                  </div>
                  <div className="reg-stepper-control">
                    <button
                      type="button"
                      className="reg-step-btn"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          vehicle_count: Math.max(0, Number(p.vehicle_count || 0) - 1),
                        }))
                      }
                      title="Decrease vehicles"
                    >
                      −
                    </button>
                    <span className="reg-stepper-val">{formData.vehicle_count}</span>
                    <button
                      type="button"
                      className="reg-step-btn"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          vehicle_count: Number(p.vehicle_count || 0) + 1,
                        }))
                      }
                      title="Increase vehicles"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="reg-emergency-box">
                <div className="reg-emergency-box-header">
                  <div className="reg-emergency-box-title">
                    <MdOutlineContactPhone size={16} />
                    <span>Emergency Contact</span>
                  </div>
                  <span className="reg-pill-badge">Optional</span>
                </div>

                <div className="reg-row-2col">
                  <div className="reg-field">
                    <label className="reg-label">Contact Name</label>
                    <div className="reg-input-wrap">
                      <FiUser className="reg-icon-left" />
                      <input
                        type="text"
                        name="emergency_name"
                        placeholder="e.g. Spouse / Relative"
                        value={formData.emergency_name}
                        onChange={handleChange}
                        className="reg-input"
                      />
                    </div>
                  </div>

                  <div className="reg-field">
                    <label className="reg-label">Contact Phone</label>
                    <div className="reg-phone-row">
                      <div className="reg-input-wrap" style={{ width: "100%" }}>
                        <div className="reg-phone-prefix">🇮🇳 +91</div>
                        <input
                          type="tel"
                          maxLength={10}
                          name="emergency_phone"
                          placeholder="9876543210"
                          value={formData.emergency_phone}
                          onChange={handleChange}
                          className="reg-input reg-phone-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="reg-btn-row">
                <button type="button" onClick={() => goToStep(4)} className="reg-btn-primary">
                  Continue to KYC & Photos <FiArrowRight size={15} />
                </button>
                <button type="button" onClick={() => setStep(2)} className="reg-btn-back">
                  <FiArrowLeft size={13} /> Back to Account Details
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 4: PROFILE PHOTO & KYC (AADHAAR & PAN)
             ═══════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="reg-fields animate-fadeIn">
              {/* Profile Photo Uploader */}
              <div className="reg-photo-upload-section">
                <div
                  className="reg-avatar-picker"
                  onClick={() => profileInputRef.current?.click()}
                  title="Click to choose profile picture"
                >
                  {profilePicPreview ? (
                    <img
                      src={profilePicPreview}
                      alt="Profile Preview"
                      className="reg-avatar-img"
                    />
                  ) : (
                    <div className="reg-avatar-placeholder">
                      <FiUser size={28} />
                    </div>
                  )}
                  <div className="reg-avatar-overlay">
                    <MdCameraAlt size={18} />
                  </div>
                </div>
                <div className="reg-photo-info">
                  <label className="reg-label" style={{ padding: 0 }}>
                    Profile Photo
                  </label>
                  <p className="reg-photo-desc">
                    Clear face photo for visitor pass matching and resident ID.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="reg-upload-btn-secondary"
                      onClick={() => profileInputRef.current?.click()}
                    >
                      {profilePicPreview ? "Change Photo" : "Upload Photo"}
                    </button>
                    {profilePicPreview && (
                      <button
                        type="button"
                        className="reg-remove-btn"
                        onClick={() => {
                          setProfilePicPreview(null);
                          setFormData((p) => ({ ...p, profile_picture: "" }));
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={profileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleProfilePicChange}
                  />
                </div>
              </div>

              {/* Aadhaar Card Uploader */}
              <div className="reg-doc-upload-card">
                <div className="reg-doc-card-header">
                  <div className="reg-doc-title-row">
                    <div className="reg-doc-icon-badge">
                      <MdOutlineBadge size={16} />
                    </div>
                    <div>
                      <h4 className="reg-doc-name">Aadhaar Card</h4>
                      <p className="reg-doc-hint">National identity proof</p>
                    </div>
                  </div>
                  {aadharPreview && (
                    <span className="reg-doc-status-pill success">
                      <MdCheckCircle size={13} /> Attached
                    </span>
                  )}
                </div>

                <div
                  className={`reg-doc-dropzone ${aadharPreview ? "has-file" : ""}`}
                  onClick={() => aadharInputRef.current?.click()}
                >
                  {aadharPreview ? (
                    <div className="reg-doc-preview-content">
                      {aadharPreview.startsWith("data:image") || aadharPreview.startsWith("http") ? (
                        <img
                          src={aadharPreview}
                          alt="Aadhaar"
                          className="reg-doc-thumb"
                        />
                      ) : (
                        <div className="reg-doc-pdf-icon">PDF</div>
                      )}
                      <div className="reg-doc-preview-text">
                        <span className="reg-doc-filename">
                          {aadharName || "Aadhaar Card on File"}
                        </span>
                        <span className="reg-doc-change-text">Click to replace file</span>
                      </div>
                    </div>
                  ) : (
                    <div className="reg-doc-empty-content">
                      <MdOutlineBadge size={20} className="reg-doc-upload-icon" />
                      <span>Upload Aadhaar (PDF, JPG, PNG up to 8MB)</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={aadharInputRef}
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={handleAadharChange}
                />
              </div>

              {/* PAN Card Uploader */}
              <div className="reg-doc-upload-card">
                <div className="reg-doc-card-header">
                  <div className="reg-doc-title-row">
                    <div className="reg-doc-icon-badge">
                      <MdOutlineCreditCard size={16} />
                    </div>
                    <div>
                      <h4 className="reg-doc-name">PAN Card</h4>
                      <p className="reg-doc-hint">Tax identification proof</p>
                    </div>
                  </div>
                  {panPreview && (
                    <span className="reg-doc-status-pill success">
                      <MdCheckCircle size={13} /> Attached
                    </span>
                  )}
                </div>

                <div
                  className={`reg-doc-dropzone ${panPreview ? "has-file" : ""}`}
                  onClick={() => panInputRef.current?.click()}
                >
                  {panPreview ? (
                    <div className="reg-doc-preview-content">
                      {panPreview.startsWith("data:image") || panPreview.startsWith("http") ? (
                        <img
                          src={panPreview}
                          alt="PAN"
                          className="reg-doc-thumb"
                        />
                      ) : (
                        <div className="reg-doc-pdf-icon">PDF</div>
                      )}
                      <div className="reg-doc-preview-text">
                        <span className="reg-doc-filename">
                          {panName || "PAN Card on File"}
                        </span>
                        <span className="reg-doc-change-text">Click to replace file</span>
                      </div>
                    </div>
                  ) : (
                    <div className="reg-doc-empty-content">
                      <MdOutlineCreditCard size={20} className="reg-doc-upload-icon" />
                      <span>Upload PAN Card (PDF, JPG, PNG up to 8MB)</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={panInputRef}
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={handlePanChange}
                />
              </div>

              <div className="reg-btn-row">
                <button type="button" onClick={() => goToStep(5)} className="reg-btn-primary">
                  Continue to Unit Selection <FiArrowRight size={15} />
                </button>
                <button type="button" onClick={() => setStep(3)} className="reg-btn-back">
                  <FiArrowLeft size={13} /> Back to Household Details
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 5: WING, FLOOR & FLAT SELECTION + SUBMIT
             ═══════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="reg-fields animate-fadeIn">
              {/* Wing / Block Selection */}
              <div className="reg-field">
                <label className="reg-label">Select Wing / Block</label>
                <div className="reg-input-wrap reg-select-wrap">
                  <HiOutlineBuildingOffice2 className="reg-icon-left" />
                  <select
                    name="block_id"
                    value={formData.block_id}
                    onChange={handleBlockChange}
                    className="reg-input reg-select"
                    required
                  >
                    <option value="">Choose Wing / Block</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className="reg-select-arrow" />
                </div>
              </div>

              {/* Floor Selection */}
              <div className="reg-field">
                <label className="reg-label">Select Floor</label>
                <div className="reg-input-wrap reg-select-wrap">
                  <MdApartment className="reg-icon-left" />
                  <select
                    name="floor_id"
                    value={formData.floor_id}
                    onChange={handleFloorChange}
                    className="reg-input reg-select"
                    disabled={!formData.block_id}
                  >
                    <option value="">
                      {!formData.block_id
                        ? "Select wing first"
                        : floors.length > 0
                        ? "All Floors / Choose Floor"
                        : "Direct Flat Selection"}
                    </option>
                    {floors.map((fl) => (
                      <option key={fl.id} value={fl.id}>
                        Floor {fl.floor_number}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className="reg-select-arrow" />
                </div>
              </div>

              {/* Flat Selection */}
              <div className="reg-field">
                <label className="reg-label">Select Flat / Apartment Unit</label>
                <div className="reg-input-wrap reg-select-wrap">
                  <FiHome className="reg-icon-left" />
                  <select
                    name="flat_id"
                    value={formData.flat_id}
                    onChange={handleChange}
                    className="reg-input reg-select"
                    disabled={!formData.block_id}
                    required
                  >
                    <option value="">
                      {!formData.block_id
                        ? "Select wing first"
                        : flats.length > 0
                        ? "Choose your flat"
                        : "No available flats in this selection"}
                    </option>
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.flat_number} {f.flat_type ? `(${f.flat_type})` : ""}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className="reg-select-arrow" />
                </div>
              </div>

              {/* Registration Summary Card */}
              <div className="reg-summary-card">
                <div className="reg-summary-header">
                  <HiOutlineSparkles size={14} /> Registration Summary
                </div>
                <div className="reg-summary-grid">
                  <div>
                    <span className="reg-summary-label">Society:</span>
                    <span className="reg-summary-val">{selectedSocietyObj?.name || "—"}</span>
                  </div>
                  <div>
                    <span className="reg-summary-label">Resident:</span>
                    <span className="reg-summary-val">{formData.name || "—"}</span>
                  </div>
                  <div>
                    <span className="reg-summary-label">Unit:</span>
                    <span className="reg-summary-val">
                      {selectedBlockObj?.name || "Wing —"} •{" "}
                      {selectedFloorObj ? `Floor ${selectedFloorObj.floor_number} • ` : ""}
                      {selectedFlatObj ? `Flat ${selectedFlatObj.flat_number}` : "Flat —"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="reg-btn-row">
                <button
                  type="submit"
                  disabled={loading || !formData.society_id || !formData.flat_id}
                  className="reg-btn-primary"
                >
                  {loading ? (
                    <>
                      <div className="reg-spinner" /> Submitting…
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} /> Submit Registration for Approval
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setStep(4)} className="reg-btn-back">
                  <FiArrowLeft size={13} /> Back to Documents
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
