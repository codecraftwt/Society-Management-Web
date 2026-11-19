import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPortal } from "react-dom";
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
  MdPictureAsPdf,
  MdGavel,
} from "react-icons/md";
import PdfViewer from "../components/common/PdfViewer";
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
  HiOutlineShieldCheck,
  HiOutlineUsers,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineChevronDown,
  HiOutlineGlobeAlt,
  HiOutlineLockClosed as Hi2LockClosed,
  HiOutlineXMark,
} from "react-icons/hi2";
import { toast } from "react-toastify";
import ProfilePictureCropModal from "../components/common/ProfilePictureCropModal";
import Select from "../components/common/Select";
import { useLang } from "../context/LanguageContext";
import { getTitleError, getEmailError, getMobileError } from "../utils/validators";

import homeBannerImg from "../assets/Photos/Home/Home.png";
import loginVisualImg from "../assets/Photos/Home/login_right_side_img.png";
import compLogoImg from "../assets/Photos/Home/comp_logo.png";
import "./Register.css";
import "./Login.css";

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
  const { t, lang, changeLang, LANGUAGES } = useLang();
  // 5 Step Flow
  const [step, setStep] = useState(1);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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
  const [propertyType, setPropertyType] = useState("APARTMENT");

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
  const [profileCropFile, setProfileCropFile] = useState(null);
  const [showProfileCrop, setShowProfileCrop] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [aadharName, setAadharName] = useState("");
  const [panPreview, setPanPreview] = useState(null);
  const [panName, setPanName] = useState("");

  const profileInputRef = useRef(null);
  const aadharInputRef = useRef(null);
  const panInputRef = useRef(null);
  const formScrollRef = useRef(null);

  useEffect(() => {
    formScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [step]);

  // Email Check Status
  const [emailCheckState, setEmailCheckState] = useState({
    status: "idle",
    user: null,
    message: "",
  });
  const [useExistingAccount, setUseExistingAccount] = useState(false);

  // Society Rules & Regulations State
  const [societyRules, setSocietyRules] = useState([]);
  const [acceptedRuleVersionIds, setAcceptedRuleVersionIds] = useState([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfName, setPreviewPdfName] = useState("");
  const [registrationOtp, setRegistrationOtp] = useState("");
  const [registrationOtpSent, setRegistrationOtpSent] = useState(false);
  const [registrationEmailVerified, setRegistrationEmailVerified] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const registrationVerifiedRef = useRef(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [registrationOtpSeconds, setRegistrationOtpSeconds] = useState(120);
  const [registrationResendCooldown, setRegistrationResendCooldown] = useState(30);
  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (!registrationOtpSent || registrationEmailVerified) return undefined;
    const timer = window.setInterval(() => {
      setRegistrationOtpSeconds((value) => Math.max(0, value - 1));
      setRegistrationResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [registrationOtpSent, registrationEmailVerified]);

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
  const fetchSocietyRules = async (socId) => {
    const id = socId || formData.society_id;
    if (!id) return [];
    try {
      const res = await API.get(`/auth/registration-rules?society_id=${id}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setSocietyRules(list);
      return list;
    } catch (err) {
      console.warn("Failed to load registration rules:", err?.message);
      return [];
    }
  };

  const handleSelectSociety = async (societyId) => {
    setFormData((p) => ({
      ...p,
      society_id: societyId,
      block_id: "",
      floor_id: "",
      flat_id: "",
    }));
    setBlocks([]);
    setPropertyType("APARTMENT");
    setFloors([]);
    setFlats([]);

    try {
      const res = await API.get(`/public/societies/${societyId}/blocks`);
      setBlocks(res.data || []);

      // Fetch society rules & regulations for pre-registration review
      await fetchSocietyRules(societyId);
    } catch (err) {
      console.error("Failed to load blocks:", err);
    }
  };

  const handlePropertyTypeChange = (type) => {
    setPropertyType(type);
    setFormData((p) => ({ ...p, block_id: "", floor_id: "", flat_id: "" }));
    setFloors([]);
    setFlats([]);
  };

  const availableBlocks = useMemo(() => blocks.filter((block) => {
    if (!propertyType) return false;
    const rawType = String(block.property_type || block.propertyType || "APARTMENT").trim().toUpperCase().replace(/[ -]+/g, "_");
    const type = rawType === "ROW_HOUSES" || rawType === "VILLA" ? "ROW_HOUSE" : rawType;
    return propertyType === "ROW_HOUSE" ? type === "ROW_HOUSE" : type !== "ROW_HOUSE";
  }), [blocks, propertyType]);

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
      setRegistrationEmailVerified(false);
      setRegistrationOtpSent(false);
      setRegistrationOtp("");
    }
  };

  const sendRegistrationOtp = async () => {
    const email = formData.email.trim().toLowerCase();
    if (!isEmail(email)) {
      toast.error("Please enter a valid email address first.");
      setStep(2);
      return;
    }
    setOtpLoading(true);
    try {
      await API.post("/auth/send-registration-otp", {
        email,
        name: formData.name,
        phone: formData.mobile,
        society_id: formData.society_id || undefined,
      });
      setRegistrationOtpSent(true);
      setRegistrationOtpSeconds(120);
      setRegistrationResendCooldown(30);
      setRegistrationOtp("");
      toast.success("Verification OTP sent to your email.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to send verification OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const executeFinalRegistration = async (customAcceptedIds) => {
    setLoading(true);
    try {
      const finalVersionIds = customAcceptedIds !== undefined ? customAcceptedIds : acceptedRuleVersionIds;
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
        accepted_rule_version_ids: finalVersionIds,
      };

      await API.post("/auth/register", payload);
      toast.success("Registration submitted successfully!");
      setShowRulesModal(false);
      setRegistrationSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(msg);
      // If the error indicates missing/expired OTP, reset verification and prompt OTP modal
      if (
        msg.toLowerCase().includes("otp") ||
        msg.toLowerCase().includes("session expired")
      ) {
        setRegistrationEmailVerified(false);
        registrationVerifiedRef.current = false;
        setShowRulesModal(false);
        sendRegistrationOtp();
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistrationOtp = async () => {
    if (!/^\d{6}$/.test(registrationOtp.trim())) {
      toast.error("Enter the 6-digit OTP sent to your email.");
      return;
    }
    setOtpLoading(true);
    try {
      await API.post("/auth/verify-registration-otp", {
        email: formData.email.trim().toLowerCase(),
        otp: registrationOtp.trim(),
      });
      setRegistrationEmailVerified(true);
      registrationVerifiedRef.current = true;
      setRegistrationOtpSent(false);
      setRegistrationOtp("");
      toast.success("Email verified successfully!");

      // Check if society has rules & regulations
      let rules = societyRules;
      if (!rules || rules.length === 0) {
        rules = await fetchSocietyRules(formData.society_id);
      }

      if (rules && rules.length > 0) {
        // Automatically pre-check all rules for smooth UX
        const allVerIds = rules.map((r) => r.current_version?.id).filter(Boolean);
        setAcceptedRuleVersionIds(allVerIds);
        setShowRulesModal(true);
      } else {
        await executeFinalRegistration([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setOtpLoading(false);
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
    e.target.value = "";
    if (file.size >= 5 * 1024 * 1024) {
      toast.error("Profile picture size must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setProfileCropFile(file);
    setShowProfileCrop(true);
  };

  const handleProfileCropSave = async (file) => {
    try {
      const base64 = await fileToBase64(file);
      setProfilePicPreview(base64);
      setFormData((p) => ({ ...p, profile_picture: base64 }));
      setProfileCropFile(null);
    } catch (err) {
      toast.error("Failed to process profile picture");
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
      if (!formData.aadhar_card || !formData.pan_card) {
        toast.error("Aadhaar Card and PAN Card are required to continue.");
        return;
      }
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

    // 1. If email is not yet OTP-verified, send and open OTP verification dialog first
    if (!registrationEmailVerified && !registrationVerifiedRef.current) {
      if (!registrationOtpSent) {
        setLoading(true);
        try {
          await sendRegistrationOtp();
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // 2. Email is verified. Check if society has rules & regulations
    let rules = societyRules;
    if (!rules || rules.length === 0) {
      rules = await fetchSocietyRules(formData.society_id);
    }

    if (rules && rules.length > 0) {
      const allVerIds = rules.map((r) => r.current_version?.id).filter(Boolean);
      const allAccepted = allVerIds.every((id) => acceptedRuleVersionIds.includes(id));
      if (!allAccepted) {
        if (acceptedRuleVersionIds.length === 0) {
          setAcceptedRuleVersionIds(allVerIds);
        }
        setShowRulesModal(true);
        return;
      }
    }

    // 3. All clear: submit final registration
    await executeFinalRegistration();
  };

  const strength = pwStrength(formData.password);

  
  const renderFooterSignIn = () => (
    <div className="reg-footer">
      {t("regAlreadyHaveAccount") || "Already have an account?"}{' '}
      <button type="button" className="reg-footer-link" onClick={() => navigate("/login")}>
        {t("regSignIn") || "Sign in"}
      </button>
    </div>
  );

  const stepVisuals = [
    {
      titleMain: t("regSlide1TitleMain") || "Your New Community",
      titleAccent: t("regSlide1TitleAccent") || "Starts Here.",
      description: t("regSlide1Desc") || "Find your society and get started with a simple registration process.",
    },
    {
      titleMain: t("regSlide2TitleMain") || "Your Account,",
      titleAccent: t("regSlide2TitleAccent") || "Your Access",
      description: t("regSlide2Desc") || "Set up your details and securely connect your account.",
    },
    {
      titleMain: t("regSlide3TitleMain") || "Make It Feel",
      titleAccent: t("regSlide3TitleAccent") || "Like Home",
      description: t("regSlide3Desc") || "Add your household details and registered vehicles.",
    },
    {
      titleMain: t("regSlide4TitleMain") || "Verify Your",
      titleAccent: t("regSlide4TitleAccent") || "Identity",
      description: t("regSlide4Desc") || "Complete your profile and provide the required documents.",
    },
    {
      titleMain: t("regSlide5TitleMain") || "Choose",
      titleAccent: t("regSlide5TitleAccent") || "Your Place",
      description: t("regSlide5Desc") || "Select your wing, floor, and apartment to complete registration.",
    },
  ];
  const currentVisual = stepVisuals[step - 1];

  return (
    <div className="reg-root">
      {/* Ambient Glow */}
      <div className="reg-glow-orb orb-1" />
      <div className="reg-glow-orb orb-2" />

      {/* Existing full-page photo is retained for legacy styles and hidden by the split layout. */}
      <img src={homeBannerImg} alt="" className="reg-bg-photo" aria-hidden="true" />

      <main className="reg-layout">
        <aside className="reg-visual-panel" key={step}>
          <img className="reg-visual-image" src={loginVisualImg} alt="" />
          <div className="reg-visual-overlay" />
          <div className="login-hero-brand">
            <Link to="/" className="login-hero-brand-link" aria-label={t("homeBrandHomeLabel") || "Home"}>
              <img src={compLogoImg} alt={t("homeCompanyLogoAlt") || "Logo"} className="login-hero-logo-clean" />
              <div className="login-hero-brand-divider" aria-hidden="true" />
              <span className="login-hero-brand-copy">
                <strong>{t("homeBrandTitle") || "Society Management"}</strong>
                <small>{t("homeBrandSubtitle") || "SYSTEM"}</small>
              </span>
            </Link>
          </div>
          <div className="login-hero-copy">
            <div className="reg-visual-kicker">
              <HiOutlineDocumentText size={14} /> {t("regResidentOnboarding") || "RESIDENT ONBOARDING"}
            </div>
            <h1>
              {currentVisual.titleMain}
              <br />
              <span>{currentVisual.titleAccent}</span>
            </h1>
            <p className="login-hero-description">{currentVisual.description}</p>
          </div>

          <div className="login-feature-cards">
            <div className="login-feature-card">
              <div className="login-feature-card-icon">
                <HiOutlineUsers />
              </div>
              <div className="login-feature-card-text">
                <span className="login-feature-card-title">{t("authFeatManageResidents") || "Manage Residents"}</span>
                <span className="login-feature-card-sub">{t("authFeatManageResidentsSub") || "Resident & Household"}</span>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-card-icon">
                <HiOutlineShieldCheck />
              </div>
              <div className="login-feature-card-text">
                <span className="login-feature-card-title">{t("authFeatEnhanceSecurity") || "Enhance Security"}</span>
                <span className="login-feature-card-sub">{t("authFeatEnhanceSecuritySub") || "Gate & Visitor Pass"}</span>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-card-icon">
                <HiOutlineCreditCard />
              </div>
              <div className="login-feature-card-text">
                <span className="login-feature-card-title">{t("authFeatTrackPayments") || "Track Payments"}</span>
                <span className="login-feature-card-sub">{t("authFeatTrackPaymentsSub") || "Maintenance & Dues"}</span>
              </div>
            </div>
          </div>
        </aside>

      <section className={`reg-card ${visible ? "reg-visible" : ""}`}>
        <div className="reg-panel-top">
          <div className="reg-top-left-actions">
            <div className="reg-resident-reg-pill">
              « {t("regPill") || "RESIDENT REGISTRATION"}
            </div>
          </div>

          <div className="auth-lang-dropdown-wrap" ref={langRef}>
            <button
              type="button"
              className="auth-lang-pill"
              onClick={() => setLangOpen((p) => !p)}
              aria-label="Select language"
            >
              <span>{LANGUAGES?.find((l) => l.code === lang)?.label || "English"}</span>
              <HiOutlineChevronDown size={13} />
            </button>
            {langOpen && (
              <div className="auth-lang-menu">
                {(LANGUAGES || [{ code: "en", label: "English" }]).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`auth-lang-option ${lang === l.code ? "active" : ""}`}
                    onClick={() => {
                      changeLang(l.code);
                      setLangOpen(false);
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="reg-header-titles">
          <h1 className="reg-title">{t("regTitle") || "Join Your Community"}</h1>
          <p className="reg-subtitle">
            {step === 1 && (t("regStep1Sub") || "Step 1 of 5 • Choose your society")}
            {step === 2 && (t("regStep2Sub") || "Step 2 of 5 • Personal & login details")}
            {step === 3 && (t("regStep3Sub") || "Step 3 of 5 • Household & vehicles")}
            {step === 4 && (t("regStep4Sub") || "Step 4 of 5 • Profile photo & KYC verification")}
            {step === 5 && (t("regStep5Sub") || "Step 5 of 5 • Select wing, floor & unit")}
          </p>
        </div>

        {/* 5-Step Progress Stepper */}
        <div className="reg-steps-wizard">
          {[
            { num: 1, label: t("regStepSociety") || "SOCIETY" },
            { num: 2, label: t("regStepAccount") || "ACCOUNT" },
            { num: 3, label: t("regStepHousehold") || "HOUSEHOLD" },
            { num: 4, label: t("regStepKyc") || "KYC" },
            { num: 5, label: t("regStepUnit") || "UNIT" },
          ].map((s, idx) => {
            const isDone = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="reg-step-node">
                <div
                  className={`reg-step-dot ${
                    isActive ? "reg-active" : isDone ? "reg-done" : ""
                  }`}
                  onClick={() => isDone && setStep(s.num)}
                  style={{ cursor: isDone ? "pointer" : "default" }}
                >
                  {isDone ? <FiCheck size={13} strokeWidth={3} /> : s.num}
                </div>
                <span className={`reg-step-label ${isActive ? "active" : isDone ? "done" : ""}`}>
                  {s.label}
                </span>
                {idx < 4 && (
                  <div
                    className={`reg-step-line ${step > s.num ? "reg-done" : ""}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <form ref={formScrollRef} className="reg-form-scroll" onSubmit={handleRegister}>
          {/* ═══════════════════════════════════════════════════════════
              STEP 1: SELECT SOCIETY
             ═══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="reg-fields animate-fadeIn">
              {/* Society Search Input */}
              <div className="reg-search-wrap">
                <MdSearch className="reg-search-icon" size={20} />
                <input
                  type="text"
                  placeholder={t("regSearchSocietyPh") || "Search society by name or location..."}
                  value={societySearch}
                  onChange={(e) => setSocietySearch(e.target.value)}
                  className="reg-search-input"
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
                    <MdApartment size={32} />
                    <p>{t("regNoSocietiesFound") || "No societies found matching"} "{societySearch}"</p>
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
                        <div className={`reg-soc-card-icon ${isSelected ? "selected" : ""}`}>
                          <MdApartment size={22} />
                        </div>
                        <div className="reg-soc-card-info">
                          <h4 className="reg-soc-card-title">{soc.name}</h4>
                          {soc.address && (
                            <p className="reg-soc-card-addr">
                              {soc.address}
                            </p>
                          )}
                        </div>
                        <div className="reg-soc-card-check">
                          <div className={`reg-radio-circle ${isSelected ? "selected" : ""}`}>
                            {isSelected && <div className="reg-radio-dot" />}
                          </div>
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
                  <span>{t("regContinueToAccount") || "Continue to Account Details"}</span> <FiArrowRight size={16} />
                </button>
              </div>
              {renderFooterSignIn()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 2: EMAIL CHECK & ACCOUNT DETAILS
             ═══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="reg-fields animate-fadeIn">
              {/* Selected Society Mint Banner */}
              {selectedSocietyObj && (
                <div className="reg-selected-mint-banner">
                  <div className="reg-mint-info">
                    <div className="reg-mint-check">
                      <FiCheck size={12} strokeWidth={3} />
                    </div>
                    <span>
                      {t("regSocietyLabel") || "Society:"} <strong>{selectedSocietyObj.name}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="reg-mint-change-btn"
                  >
                    {t("regChange") || "Change"}
                  </button>
                </div>
              )}

              {/* Email Address with Check Button */}
              <div className="reg-field">
                <label className="reg-label">{t("regEmailLabel") || "Email Address"}</label>
                <div className="reg-email-row">
                  <div className="reg-input-wrap" style={{ flex: 1 }}>
                    <HiOutlineEnvelope className="reg-icon-left" size={18} />
                    <input
                      type="email"
                      name="email"
                      placeholder="u@example.com"
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
                        <FiCheck size={14} strokeWidth={3} /> {t("regCheck") || "Check"}
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
                        <FiCheck size={14} /> Profile found
                      </span>
                      <span className="reg-existing-name">{emailCheckState.user?.name}</span>
                    </div>
                    <button
                      type="button"
                      className="reg-reuse-action-btn"
                      onClick={() => handleApplyExistingUser(emailCheckState.user)}
                    >
                      <HiOutlineShieldCheck size={15} /> Use saved profile
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
                      <strong>Profile linked · {formData.name}</strong>
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
                <label className="reg-label">{t("regFullNameLabel") || "Full Name"}</label>
                <div className="reg-input-wrap">
                  <FiUser className="reg-icon-left" size={17} />
                  <input
                    type="text"
                    name="name"
                    placeholder={t("regFullNamePh") || "Enter your full name"}
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
                  <label className="reg-label">{t("regPhoneLabel") || "Phone Number"}</label>
                  <div className="reg-phone-wrapper">
                    <span className="reg-phone-badge" title="India (+91)">
                      <svg className="reg-phone-flag-svg" viewBox="0 0 24 16" width="20" height="14" aria-hidden="true">
                        <rect width="24" height="16" rx="2" fill="#FFFFFF" />
                        <rect width="24" height="5.33" fill="#FF9933" />
                        <rect y="10.67" width="24" height="5.33" fill="#138808" />
                        <circle cx="12" cy="8" r="2.2" fill="none" stroke="#000080" strokeWidth="0.8" />
                        <circle cx="12" cy="8" r="0.6" fill="#000080" />
                      </svg>
                      <span className="reg-phone-code">+91</span>
                    </span>
                    <input
                      type="tel"
                      name="mobile"
                      placeholder={t("regPhonePh") || "10-digit mobile number"}
                      value={formData.mobile}
                      onChange={handleChange}
                      onBlur={() => touch("mobile")}
                      maxLength={10}
                      className={`${inputClass("mobile", isMobile(formData.mobile))} reg-phone-field`}
                    />
                  </div>
                  {touched.mobile && getMobileError(formData.mobile, "Mobile number") && (
                    <span className="reg-err">{getMobileError(formData.mobile, "Mobile number")}</span>
                  )}
                </div>

                <div className="reg-field">
                  <div className="reg-label-row">
                    <label className="reg-label">{t("regPasswordLabel") || "Password"}</label>
                    {useExistingAccount && (
                      <span className="reg-loaded-pw-badge">
                        <FiCheck size={10} /> Saved Password Loaded
                      </span>
                    )}
                  </div>
                  <div className="reg-input-wrap">
                    <Hi2LockClosed className="reg-icon-left" size={17} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder={useExistingAccount ? "Saved password" : (t("regPasswordPh") || "Create a secure password")}
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
                      {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </button>
                  </div>

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
                    {PW_RULES.map((r) => {
                      const ruleLabel =
                        r.id === "len"
                          ? (t("regPwRuleLen") || r.label)
                          : r.id === "upper"
                          ? (t("regPwRuleUpper") || r.label)
                          : r.id === "lower"
                          ? (t("regPwRuleLower") || r.label)
                          : r.id === "digit"
                          ? (t("regPwRuleDigit") || r.label)
                          : (t("regPwRuleSpec") || r.label);
                      return (
                        <div
                          key={r.id}
                          className={`reg-pw-rule ${r.test(formData.password) ? "ok" : ""}`}
                        >
                          <div className="reg-pw-dot" />
                          {ruleLabel}
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="reg-btn-row">
                <button type="button" onClick={() => goToStep(3)} className="reg-btn-primary">
                  <span>{t("regContinueToHousehold") || "Continue to Household Details"}</span> <FiArrowRight size={16} />
                </button>
                <button type="button" onClick={() => setStep(1)} className="reg-btn-secondary">
                  <FiArrowLeft size={14} /> <span>{t("regBackToSociety") || "Back to Society Selection"}</span>
                </button>
              </div>
              {renderFooterSignIn()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 3: HOUSEHOLD & VEHICLES
             ═══════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="reg-fields animate-fadeIn">
              {/* Occupants & Vehicles Cards */}
              <div className="reg-row-2col">
                <div className="reg-counter-card">
                  <div className="reg-counter-header">
                    <div className="reg-counter-icon occupants">
                      <HiOutlineUsers size={20} />
                    </div>
                    <div className="reg-counter-text">
                      <span className="reg-counter-title">{t("regOccupantsLabel") || "Occupants"}</span>
                      <span className="reg-counter-sub">Family members</span>
                    </div>
                  </div>
                  <div className="reg-stepper-control">
                    <button
                      type="button"
                      className="reg-step-btn occupants"
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
                      className="reg-step-btn occupants"
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
                      <MdDirectionsCar size={20} />
                    </div>
                    <div className="reg-counter-text">
                      <span className="reg-counter-title">{t("regVehiclesLabel") || "Vehicles"}</span>
                      <span className="reg-counter-sub">Cars & 2-wheelers</span>
                    </div>
                  </div>
                  <div className="reg-stepper-control">
                    <button
                      type="button"
                      className="reg-step-btn vehicles"
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
                      className="reg-step-btn vehicles"
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
                    <MdOutlineContactPhone size={17} />
                    <span>{t("regEmergencyPhoneLabel") || "Emergency Contact Phone"}</span>
                  </div>
                  <span className="reg-optional-badge">Optional</span>
                </div>

                <div className="reg-row-2col">
                  <div className="reg-field">
                    <label className="reg-label">Contact Name</label>
                    <div className="reg-input-wrap">
                      <FiUser className="reg-icon-left" size={16} />
                      <input
                        type="text"
                        name="emergency_name"
                        placeholder="e.g. Spouse / Relative"
                        value={formData.emergency_name}
                        onChange={handleChange}
                        className="reg-custom-input"
                      />
                    </div>
                  </div>

                  <div className="reg-field">
                    <label className="reg-label">Contact Phone</label>
                    <div className="reg-phone-wrapper">
                      <span className="reg-phone-badge" title="India (+91)">
                        <svg className="reg-phone-flag-svg" viewBox="0 0 24 16" width="20" height="14" aria-hidden="true">
                          <rect width="24" height="16" rx="2" fill="#FFFFFF" />
                          <rect width="24" height="5.33" fill="#FF9933" />
                          <rect y="10.67" width="24" height="5.33" fill="#138808" />
                          <circle cx="12" cy="8" r="2.2" fill="none" stroke="#000080" strokeWidth="0.8" />
                          <circle cx="12" cy="8" r="0.6" fill="#000080" />
                        </svg>
                        <span className="reg-phone-code">+91</span>
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        name="emergency_phone"
                        placeholder="9876543210"
                        value={formData.emergency_phone}
                        onChange={handleChange}
                        className="reg-custom-input reg-phone-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="reg-btn-row">
                <button type="button" onClick={() => goToStep(4)} className="reg-btn-primary">
                  <span>{t("regContinueToKyc") || "Continue to KYC"}</span> <FiArrowRight size={16} />
                </button>
                <button type="button" onClick={() => setStep(2)} className="reg-btn-secondary">
                  <FiArrowLeft size={14} /> <span>{t("regBackToAccount") || "Back to Account"}</span>
                </button>
              </div>
              {renderFooterSignIn()}
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
                      <FiUser size={30} />
                    </div>
                  )}
                  <div className="reg-avatar-overlay">
                    <MdCameraAlt size={16} />
                  </div>
                </div>
                <div className="reg-photo-info">
                  <label className="reg-photo-title">{t("regProfilePhotoLabel") || "Profile Photo"}</label>
                  <p className="reg-photo-desc">
                    Clear face photo for visitor pass matching and resident ID.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className="reg-upload-pill-btn"
                      onClick={() => profileInputRef.current?.click()}
                    >
                      <MdCameraAlt size={15} />
                      <span>{profilePicPreview ? "Change Photo" : (t("regUploadDoc") || "Upload Photo")}</span>
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
                      <MdOutlineBadge size={17} />
                    </div>
                    <div>
                      <h4 className="reg-doc-name">{t("regAadhaarLabel") || "Aadhaar Card"}</h4>
                      <p className="reg-doc-hint">National identity proof</p>
                    </div>
                  </div>
                  {aadharPreview && (
                    <span className="reg-doc-status-pill success">
                      <FiCheck size={12} strokeWidth={3} /> {t("regUploaded") || "Attached"}
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
                      <HiOutlineDocumentText size={22} className="reg-doc-upload-icon" />
                      <span>{t("regUploadDoc") || "Upload Aadhaar"} (PDF, JPG, PNG up to 8MB)</span>
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
                      <MdOutlineCreditCard size={17} />
                    </div>
                    <div>
                      <h4 className="reg-doc-name">{t("regPanLabel") || "PAN Card"}</h4>
                      <p className="reg-doc-hint">Tax identification proof</p>
                    </div>
                  </div>
                  {panPreview && (
                    <span className="reg-doc-status-pill success">
                      <FiCheck size={12} strokeWidth={3} /> {t("regUploaded") || "Attached"}
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
                      <HiOutlineCreditCard size={22} className="reg-doc-upload-icon" />
                      <span>{t("regUploadDoc") || "Upload PAN Card"} (PDF, JPG, PNG up to 8MB)</span>
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
                  <span>{t("regContinueToUnit") || "Continue to Unit Selection"}</span> <FiArrowRight size={16} />
                </button>
                <button type="button" onClick={() => setStep(3)} className="reg-btn-secondary">
                  <FiArrowLeft size={14} /> <span>{t("regBackToHousehold") || "Back to Household Details"}</span>
                </button>
              </div>
              {renderFooterSignIn()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 5: WING, FLOOR & FLAT SELECTION + SUBMIT
             ═══════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="reg-fields animate-fadeIn">
              <div className="reg-field">
                <label className="reg-label">{t("regHomeTypeQuestion") || "What type of home are you selecting?"}</label>
                <div className="reg-property-choice">
                  <button type="button" className={propertyType === "APARTMENT" ? "selected" : ""} onClick={() => handlePropertyTypeChange("APARTMENT")}>🏢 {t("regFlatApartment") || "Flat / Apartment"}</button>
                  <button type="button" className={propertyType === "ROW_HOUSE" ? "selected" : ""} onClick={() => handlePropertyTypeChange("ROW_HOUSE")}>🏡 {t("regRowHouseVilla") || "Row House / Villa"}</button>
                </div>
              </div>

              {/* Wing / Block Selection */}
              <div className="reg-field">
                <label className="reg-label">{t("regSelectWing") || "Select Wing / Block"}</label>
                <div className="reg-input-wrap reg-select-wrap">
                  <Select
                    name="block_id"
                    value={formData.block_id}
                    onChange={handleBlockChange}
                    className="reg-input reg-select reg-custom-select"
                    options={[
                      { value: "", label: t("regChooseWingPlaceholder") || "Choose Wing / Block" },
                      ...availableBlocks.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                    placeholder={t("regChooseWingPlaceholder") || "Choose Wing / Block"}
                    required
                  />
                </div>
              </div>

              {/* Floor Selection */}
              {propertyType !== "ROW_HOUSE" && <div className="reg-field">
                <label className="reg-label">{t("regSelectFloor") || "Select Floor"}</label>
                <div className="reg-input-wrap reg-select-wrap">
                  <Select
                    name="floor_id"
                    value={formData.floor_id}
                    onChange={handleFloorChange}
                    className="reg-input reg-select reg-custom-select"
                    options={[
                      { value: "", label: !formData.block_id ? "Select wing first" : floors.length > 0 ? (t("regChooseFloorPlaceholder") || "All Floors / Choose Floor") : "Direct Flat Selection" },
                      ...floors.map((fl) => ({ value: fl.id, label: `Floor ${fl.floor_number}` })),
                    ]}
                    placeholder={!formData.block_id ? "Select wing first" : (t("regChooseFloorPlaceholder") || "Choose floor...")}
                    disabled={!formData.block_id}
                  />
                </div>
              </div>}

              {/* Flat Selection */}
              <div className="reg-field">
                <label className="reg-label">{propertyType === "ROW_HOUSE" ? (t("regRowHouseVilla") || "Select Row House / Villa") : (t("regSelectUnit") || "Select Flat / Apartment Unit")}</label>
                <div className="reg-input-wrap reg-select-wrap">
                  <Select
                    name="flat_id"
                    value={formData.flat_id}
                    onChange={handleChange}
                    className="reg-input reg-select reg-custom-select"
                    options={[
                      { value: "", label: !formData.block_id ? "Select wing first" : flats.length > 0 ? (t("regChooseFlatPlaceholder") || "Choose your flat") : "No available flats in this selection" },
                      ...flats.map((f) => ({ value: f.id, label: `${f.flat_number}${f.flat_type ? ` (${f.flat_type})` : ""}` })),
                    ]}
                    placeholder={!formData.block_id ? "Select wing first" : (t("regChooseFlatPlaceholder") || "Choose flat...")}
                    disabled={!formData.block_id}
                    required
                  />
                </div>
              </div>

              {/* Registration Summary Card matching reference screenshot */}
              <div className="reg-summary-card">
                <div className="reg-summary-header">
                  <HiOutlineSparkles size={16} /> <span>{t("regSummaryTitle") || "REGISTRATION SUMMARY"}</span>
                </div>
                <div className="reg-summary-grid">
                  <div className="reg-summary-row">
                    <span className="reg-summary-label">{t("regSummarySociety") || "Society:"}</span>
                    <span className="reg-summary-val">{selectedSocietyObj?.name || "—"}</span>
                  </div>
                  <div className="reg-summary-row">
                    <span className="reg-summary-label">{t("regSummaryResident") || "Resident:"}</span>
                    <span className="reg-summary-val">{formData.name || "—"}</span>
                  </div>
                  <div className="reg-summary-row">
                    <span className="reg-summary-label">{t("regSummaryUnit") || "Unit:"}</span>
                    <span className="reg-summary-val">
                      {selectedBlockObj?.name || "Wing —"}{" "}
                      {selectedFloorObj ? `• Floor ${selectedFloorObj.floor_number} ` : ""}
                      {selectedFlatObj ? `• Flat ${selectedFlatObj.flat_number}` : "• Flat —"}
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
                      <div className="reg-spinner" /> <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <FiCheck size={18} strokeWidth={3} /> <span>{t("regSubmitApproval") || "Submit Registration for Approval"}</span>
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setStep(4)} className="reg-btn-secondary">
                  <FiArrowLeft size={14} /> <span>{t("regBackToDocs") || "Back to Documents"}</span>
                </button>
              </div>
              {renderFooterSignIn()}
            </div>
          )}
        </form>

        {registrationOtpSent && !registrationEmailVerified && (
          <div className="otp-overlay otp-overlay--login" role="dialog" aria-modal="true" aria-label="Verify email">
            <div className="otp-modal-box otp-modal-box--login animate-scaleIn">
              <div className="otp-modal-inner">
                <div className="otp-modal-header">
                  <div className="otp-shield-icon">
                    <HiOutlineEnvelope size={24} />
                  </div>
                  <h2 className="otp-title">{t("regOtpTitle") || "Verify Your Email"}</h2>
                  <p className="otp-subtitle">{t("regOtpSubtitle") || "A 6-digit verification code was sent to"}</p>
                  <div className="otp-email-badge">
                    <HiOutlineEnvelope size={14} />
                    <span>{formData.email}</span>
                  </div>
                </div>
                <div
                  className="reg-otp-boxes"
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (!pasted) return;
                    setRegistrationOtp(pasted);
                    otpInputRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputRefs.current[i] = el; }}
                      className={`otp-input${registrationOtp[i] ? " filled" : ""}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={registrationOtp[i] || ""}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, "");
                        const next = registrationOtp.split("");
                        next[i] = digit;
                        setRegistrationOtp(next.join("").slice(0, 6));
                        if (digit && i < 5) otpInputRefs.current[i + 1]?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !registrationOtp[i] && i > 0) otpInputRefs.current[i - 1]?.focus();
                      }}
                      autoFocus={i === 0}
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", margin: "1.1rem 0" }}>
                  <div style={{ position: "relative", width: 54, height: 54 }}>
                    <svg className="otp-timer-track" width="54" height="54" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="27" cy="27" r="20" fill="none" strokeWidth="3" />
                      <circle
                        cx="27"
                        cy="27"
                        r="20"
                        fill="none"
                        stroke={registrationOtpSeconds > 30 ? "#2563eb" : "#ef4444"}
                        strokeWidth="3"
                        strokeDasharray={2 * Math.PI * 20}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - registrationOtpSeconds / 120)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="otp-timer-value" style={{ color: registrationOtpSeconds > 0 ? "#2563eb" : "#ef4444", fontWeight: 700, fontSize: "0.85rem" }}>
                        {`${String(Math.floor(registrationOtpSeconds / 60)).padStart(2, "0")}:${String(registrationOtpSeconds % 60).padStart(2, "0")}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="reg-otp-dots" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={registrationOtp.length > i ? "filled" : ""} />
                  ))}
                </div>
                <button
                  type="button"
                  className="otp-verify-submit-btn"
                  onClick={verifyRegistrationOtp}
                  disabled={otpLoading || registrationOtp.length !== 6}
                >
                  {otpLoading ? (
                    "Verifying…"
                  ) : (
                    <>
                      <FiCheck size={16} strokeWidth={3} /> {t("regOtpVerifyBtn") || "Verify Email"}
                    </>
                  )}
                </button>
                <div className="otp-modal-footer-links">
                  <button
                    type="button"
                    className="otp-resend-btn"
                    onClick={sendRegistrationOtp}
                    disabled={otpLoading || registrationResendCooldown > 0 || registrationOtpSeconds === 0}
                  >
                    {registrationResendCooldown > 0 ? `↻ ${t("regOtpResendIn") || "Resend in"} ${registrationResendCooldown}s` : `↻ ${t("regOtpResend") || "Resend OTP"}`}
                  </button>
                  <button
                    type="button"
                    className="otp-cancel-btn"
                    onClick={() => setRegistrationOtpSent(false)}
                  >
                    ✕ {t("regRulesCancel") || "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



        <ProfilePictureCropModal
          isOpen={showProfileCrop && Boolean(profileCropFile)}
          file={profileCropFile}
          onClose={() => {
            setShowProfileCrop(false);
            setProfileCropFile(null);
          }}
          onSave={handleProfileCropSave}
          onPickAnother={() => profileInputRef.current?.click()}
        />

        {registrationSubmitted && createPortal((
          <div
            className="policy-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reg-success-title"
          >
            <div
              className="policy-modal-card"
              style={{
                maxWidth: "520px",
                textAlign: "center",
                padding: "36px 32px 30px",
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                  border: "1.5px solid #a7f3d0",
                  color: "#059669",
                  boxShadow: "0 10px 25px -4px rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  margin: "0 auto 18px",
                }}
              >
                ✓
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontSize: "0.74rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 auto 10px" }}>
                <HiOutlineSparkles size={13} />
                <span>Pending Society Admin Approval</span>
              </div>

              <h2 id="reg-success-title" style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.025em" }}>
                Application Submitted!
              </h2>

              <p style={{ fontSize: "0.92rem", color: "#64748b", margin: "0 0 20px", lineHeight: 1.55 }}>
                Your account and policy acknowledgements have been submitted. Once verified by your society committee, you will receive an approval confirmation.
              </p>

              {/* Registration Info Summary Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 24,
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Society:</span>
                  <strong style={{ color: "#0f172a" }}>{selectedSocietyObj?.name || "Society"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Resident:</span>
                  <strong style={{ color: "#0f172a" }}>{formData.name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Unit:</span>
                  <strong style={{ color: "#2563eb" }}>
                    {selectedBlockObj?.name || "Wing"} • Flat {selectedFlatObj?.flat_number || "—"}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="policy-btn-submit"
                style={{ width: "100%", justifyContent: "center", padding: "12px 24px", fontSize: "1rem" }}
                onClick={() => navigate("/login")}
              >
                <span>Go to Login</span>
                <FiArrowRight size={17} />
              </button>
            </div>
          </div>
        ), document.body)}

                {/* Policy & Rules Document Review Modal */}
        {showRulesModal && createPortal((
          <div className="policy-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">
            <div className="policy-modal-card">
              <div className="policy-modal-accent-bar" />
              
              {/* Header */}
              <div className="policy-modal-header">
                <div className="policy-modal-header-left">
                  <div className="policy-modal-icon-wrap" aria-hidden="true">
                    <MdGavel />
                  </div>
                  <div>
                    <span className="policy-modal-eyebrow">
                      <HiOutlineShieldCheck size={13} /> Official Community Guidelines
                    </span>
                    <h2 id="policy-modal-title" className="policy-modal-title">
                      {t("regRulesModalTitle") || "Society Rules & Regulations"}
                    </h2>
                    <p className="policy-modal-subtitle">
                      {t("regRulesModalSubtitle", { society: selectedSocietyObj?.name || "your society" }) || `Please review the official bylaws of ${selectedSocietyObj?.name || "your society"}. You must acknowledge them before completing registration.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="policy-modal-close-btn"
                  onClick={() => setShowRulesModal(false)}
                  aria-label="Close modal"
                >
                  <HiOutlineXMark size={20} />
                </button>
              </div>

              {/* Sub-bar / Actions */}
              <div className="policy-modal-subbar">
                <span className="policy-modal-count-pill">
                  <HiOutlineDocumentText size={17} style={{ color: "#2563EB" }} />
                  <span>
                    {societyRules.length === 1
                      ? (t("regRulesOfficialAvailable", { count: 1 }) || "1 Official Policy Available")
                      : (t("regRulesOfficialAvailablePlural", { count: societyRules.length }) || `${societyRules.length} Official Policies Available`)}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const allIds = societyRules.map((r) => r.current_version?.id).filter(Boolean);
                    const isAllSelected = allIds.every((id) => acceptedRuleVersionIds.includes(id));
                    if (isAllSelected) {
                      setAcceptedRuleVersionIds([]);
                    } else {
                      setAcceptedRuleVersionIds(allIds);
                    }
                  }}
                  className={`policy-modal-selectall-btn ${
                    societyRules.length > 0 &&
                    societyRules.every((r) => acceptedRuleVersionIds.includes(r.current_version?.id))
                      ? "all-selected"
                      : ""
                  }`}
                >
                  {societyRules.length > 0 &&
                  societyRules.every((r) => acceptedRuleVersionIds.includes(r.current_version?.id)) ? (
                    <>
                      <FiCheck size={14} strokeWidth={3} />
                      <span>{t("regRulesAllSelected") || "All Policies Selected"}</span>
                    </>
                  ) : (
                    <>
                      <FiCheck size={14} strokeWidth={3} />
                      <span>{t("regRulesSelectAll") || "Select All & Mark as Read"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scrollable Rules List */}
              <div className="policy-modal-scroll">
                {societyRules.map((rule) => {
                  const verId = rule.current_version?.id;
                  const isChecked = acceptedRuleVersionIds.includes(verId);
                  return (
                    <div
                      key={rule.id}
                      className={`policy-card-item ${isChecked ? "checked" : ""}`}
                    >
                      <div className="policy-card-top">
                        <div className="policy-card-info">
                          <div className="policy-card-tags">
                            {rule.category && (
                              <span className="policy-tag-category">
                                {rule.category}
                              </span>
                            )}
                            {rule.is_mandatory && (
                              <span className="policy-tag-mandatory">
                                <Hi2LockClosed size={11} /> {t("regRulesMandatory") || "MANDATORY"}
                              </span>
                            )}
                          </div>
                          <h4 className="policy-card-title">{rule.title}</h4>
                          {rule.description && (
                            <p className="policy-card-desc">{rule.description}</p>
                          )}
                        </div>

                        {rule.current_version?.file_url && (
                          <button
                            type="button"
                            onClick={() => {
                              const docUrl = rule.current_version?.id
                                ? `${API.defaults.baseURL || "http://localhost:5000/api"}/auth/registration-rules/${rule.current_version.id}/document`
                                : rule.current_version.file_url;
                              setPreviewPdfUrl(docUrl);
                              setPreviewPdfName(
                                rule.current_version.document_name || `${rule.title}.pdf`
                              );
                            }}
                            className="policy-pdf-btn"
                            title="View official document"
                          >
                            <MdPictureAsPdf size={17} />
                            <span>{t("regRulesViewPdf") || "View Policy PDF"}</span>
                          </button>
                        )}
                      </div>

                      {/* Checkbox / Agreement row */}
                      <label
                        className={`policy-card-check-wrap ${isChecked ? "checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setAcceptedRuleVersionIds((prev) => prev.filter((id) => id !== verId));
                            } else {
                              setAcceptedRuleVersionIds((prev) => [...prev, verId]);
                            }
                          }}
                          className="policy-custom-checkbox"
                        />
                        <span>{t("regRulesAgreeCheckbox") || "I have read, understood, and agree to abide by this policy rule."}</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="policy-modal-footer">
                <div className="policy-modal-footer-audit">
                  <HiOutlineShieldCheck size={16} style={{ color: "#10B981" }} />
                  <span>{t("regRulesAuditNote") || "Compliance audit recorded on submission"}</span>
                </div>

                <div className="policy-modal-footer-actions">
                  <button
                    type="button"
                    className="policy-btn-cancel"
                    onClick={() => setShowRulesModal(false)}
                  >
                    {t("regRulesCancel") || "Cancel"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      loading ||
                      societyRules.some(
                        (r) => r.is_mandatory && !acceptedRuleVersionIds.includes(r.current_version?.id)
                      )
                    }
                    onClick={() => executeFinalRegistration(acceptedRuleVersionIds)}
                    className="policy-btn-submit"
                  >
                    {loading ? (
                      "Submitting…"
                    ) : (
                      <>
                        <FiCheck size={16} strokeWidth={3} />
                        <span>{t("regRulesSubmitBtn") || "Mark as Read & Submit Registration"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ), document.body)}

        {previewPdfUrl && (
          <PdfViewer
            url={previewPdfUrl}
            name={previewPdfName}
            onClose={() => setPreviewPdfUrl(null)}
          />
        )}


      </section>
      </main>
    </div>
  );
}

export default Register;
