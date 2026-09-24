// src/components/guard/StepVisitorEntryModal.jsx

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { FieldError } from "../common/FieldError";
import {
  MdClose,
  MdArrowBack,
  MdArrowForward,
  MdCheckCircle,
  MdApartment,
  MdMeetingRoom,
  MdDirectionsCar,
  MdPhone,
  MdPerson,
  MdLocalTaxi,
  MdLocalShipping,
  MdHandyman,
  MdSearch,
  MdCheck,
  MdLocalParking,
  MdShield,
  MdAccessTime,
  MdDirectionsBike,
  MdBadge,
  MdVerifiedUser,
  MdKeyboardArrowDown,
} from "react-icons/md";
import {
  FaUserFriends,
  FaTools,
  FaTruck,
} from "react-icons/fa";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  getTitleError,
  getMobileError,
  getVehicleNumberError,
} from "../../utils/validators";

// ─── Brand & Service Presets ───
const CAB_BRANDS = [
  { id: "uber", name: "Uber", iconText: "UB", color: "#000000", bg: "#F8FAFC" },
  { id: "ola", name: "Ola", iconText: "OL", color: "#65A30D", bg: "#F7FEE7" },
  { id: "blusmart", name: "BluSmart", iconText: "BL", color: "#0284C7", bg: "#F0F9FF" },
  { id: "rapido", name: "Rapido", iconText: "RP", color: "#D97706", bg: "#FEFCE8" },
  { id: "other", name: "Other Taxi", iconText: "TX", color: "#475569", bg: "#F1F5F9" },
];

const DELIVERY_BRANDS = [
  { id: "swiggy", name: "Swiggy", iconText: "SW", color: "#EA580C", bg: "#FFF7ED" },
  { id: "zomato", name: "Zomato", iconText: "ZO", color: "#E11D48", bg: "#FFF1F2" },
  { id: "amazon", name: "Amazon", iconText: "AZ", color: "#D97706", bg: "#FFFBEB" },
  { id: "flipkart", name: "Flipkart", iconText: "FK", color: "#2563EB", bg: "#EFF6FF" },
  { id: "blinkit", name: "Blinkit", iconText: "BK", color: "#CA8A04", bg: "#FEFCE8" },
  { id: "zepto", name: "Zepto", iconText: "ZP", color: "#9333EA", bg: "#FAF5FF" },
  { id: "instamart", name: "Instamart", iconText: "IM", color: "#EA580C", bg: "#FFF7ED" },
  { id: "other", name: "Other Courier", iconText: "CR", color: "#0891B2", bg: "#ECFEFF" },
];

const SERVICE_SKILLS = [
  { id: "plumber", name: "Plumber", iconText: "PL", color: "#0284C7", bg: "#F0F9FF" },
  { id: "electrician", name: "Electrician", iconText: "EL", color: "#D97706", bg: "#FFFBEB" },
  { id: "carpenter", name: "Carpenter", iconText: "CP", color: "#92400E", bg: "#FEF3C7" },
  { id: "appliance", name: "AC & Repair", iconText: "AC", color: "#0891B2", bg: "#ECFEFF" },
  { id: "painter", name: "Painter", iconText: "PT", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "mechanic", name: "Mechanic", iconText: "MC", color: "#DC2626", bg: "#FEF2F2" },
  { id: "pest_control", name: "Pest Control", iconText: "PC", color: "#059669", bg: "#ECFDF5" },
  { id: "other", name: "Other Staff", iconText: "OT", color: "#475569", bg: "#F1F5F9" },
];

export default function StepVisitorEntryModal({
  isOpen,
  onClose,
  purpose = "GUEST",
  onSuccess,
}) {
  const { t } = useLang();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Form State ──
  const [visitorName, setVisitorName] = useState("");
  const [mobile, setMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [otherBrandName, setOtherBrandName] = useState("");
  const [assignedSlot, setAssignedSlot] = useState("");

  // Validation errors state
  const [errors, setErrors] = useState({});

  // ── Block / Flat Data ──
  const [allFlats, setAllFlats] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // ── Selection State ──
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [flatSearch, setFlatSearch] = useState("");

  // Load flats and slots on open
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setVisitorName("");
      setMobile("");
      setVehicleNumber("");
      setVehicleType("CAR");
      setSelectedBrand("");
      setOtherBrandName("");
      setAssignedSlot("");
      setSelectedBlock(null);
      setSelectedFloorId(null);
      setSelectedFlat(null);
      setFlatSearch("");
      setErrors({});
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [flatsRes, slotsRes] = await Promise.allSettled([
          API.get("/flats/assigned?limit=1000"),
          API.get("/parking-slots/available"),
        ]);

        if (flatsRes.status === "fulfilled") {
          const list = Array.isArray(flatsRes.value.data)
            ? flatsRes.value.data
            : flatsRes.value.data?.data || [];
          setAllFlats(list);
        }

        if (slotsRes.status === "fulfilled") {
          const sList = Array.isArray(slotsRes.value.data)
            ? slotsRes.value.data
            : slotsRes.value.data?.data || [];
          setParkingSlots(sList);
        }
      } catch (err) {
        console.error("Error loading flats/slots:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Derived unique Blocks
  const blocks = useMemo(() => {
    const map = new Map();
    allFlats.forEach((f) => {
      const block = f.Floor?.Block || f.Block;
      if (block && block.id) {
        if (!map.has(block.id)) {
          map.set(block.id, {
            id: block.id,
            name: block.name,
            property_type: block.property_type,
            floors: new Set(),
            flats: [],
          });
        }
        const b = map.get(block.id);
        if (f.Floor?.id) b.floors.add(f.Floor.id);
        b.flats.push(f);
      }
    });

    return Array.from(map.values()).map((b) => ({
      ...b,
      totalFloors: b.floors.size || 1,
      totalFlats: b.flats.length,
    }));
  }, [allFlats]);

  // Derived floors for selected Block
  const floors = useMemo(() => {
    if (!selectedBlock) return [];
    const floorMap = new Map();
    allFlats
      .filter((f) => (f.Floor?.Block?.id || f.Block?.id) === selectedBlock.id)
      .forEach((f) => {
        if (f.Floor && f.Floor.id) {
          floorMap.set(f.Floor.id, {
            id: f.Floor.id,
            floor_number: f.Floor.floor_number,
          });
        }
      });
    return Array.from(floorMap.values()).sort(
      (a, b) => a.floor_number - b.floor_number
    );
  }, [selectedBlock, allFlats]);

  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  // Filtered flats for selected Block & Floor
  const filteredFlats = useMemo(() => {
    if (!selectedBlock) return [];
    let list = allFlats.filter(
      (f) => (f.Floor?.Block?.id || f.Block?.id) === selectedBlock.id
    );

    if (selectedFloorId && floors.length > 0) {
      list = list.filter((f) => f.Floor?.id === selectedFloorId);
    }

    if (flatSearch.trim()) {
      const q = flatSearch.toLowerCase().trim();
      list = list.filter((f) => (f.flat_number || "").toLowerCase().includes(q));
    }

    return list;
  }, [selectedBlock, selectedFloorId, floors, flatSearch, allFlats]);

  // Category Configuration
  const categoryConfig = useMemo(() => {
    switch (purpose.toUpperCase()) {
      case "CAB":
        return {
          title: "Cab Visitor Pass",
          subtitle: "Register driver & commercial cab entry",
          sectionTitle: "Cab & Driver Details",
          sectionSubtitle: "Enter the driver and trip details to generate pass.",
          icon: MdLocalTaxi,
          color: "#2563EB",
          brands: CAB_BRANDS,
          namePlaceholder: "Driver Full Name",
          requireBrand: true,
          brandTitle: "Cab Provider / Aggregator",
          code: "CAB",
        };
      case "DELIVERY":
        return {
          title: "Delivery Visitor Pass",
          subtitle: "Register food, courier & parcel drop-off",
          sectionTitle: "Delivery Agent Details",
          sectionSubtitle: "Enter the delivery agent info to create a gate pass.",
          icon: MdLocalShipping,
          color: "#2563EB",
          brands: DELIVERY_BRANDS,
          namePlaceholder: "Delivery Agent Name",
          requireBrand: true,
          brandTitle: "Delivery Service / Company",
          code: "DLV",
        };
      case "SERVICE":
        return {
          title: "Service Visitor Pass",
          subtitle: "Register technician, staff & maintenance visits",
          sectionTitle: "Service Technician Details",
          sectionSubtitle: "Enter technician information to authorize entry.",
          icon: MdHandyman,
          color: "#2563EB",
          brands: SERVICE_SKILLS,
          namePlaceholder: "Technician / Staff Name",
          requireBrand: true,
          brandTitle: "Service Category",
          code: "SRV",
        };
      default:
        return {
          title: "Guest Visitor Pass",
          subtitle: "Register friends, family or guest visits",
          sectionTitle: "Visitor Details",
          sectionSubtitle: "Enter the guest information to create a visitor pass.",
          icon: FaUserFriends,
          color: "#2563EB",
          brands: [],
          namePlaceholder: "Visitor Full Name",
          requireBrand: false,
          brandTitle: "",
          code: "GST",
        };
    }
  }, [purpose]);

  // ── Step Validation ──
  const validateStep1 = () => {
    const errs = {};
    if (categoryConfig.requireBrand && !selectedBrand) {
      errs.brand = "Please select a provider/category.";
    }
    const nameErr = getTitleError(visitorName, "Visitor name");
    if (nameErr) errs.name = nameErr;

    if (mobile.trim()) {
      const mobileErr = getMobileError(mobile);
      if (mobileErr) errs.mobile = mobileErr;
    }

    if (vehicleNumber.trim()) {
      const vehicleErr = getVehicleNumberError(vehicleNumber);
      if (vehicleErr) errs.vehicle = vehicleErr;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isStep1Valid = useMemo(() => {
    if (categoryConfig.requireBrand && !selectedBrand) return false;
    if (!visitorName.trim() || visitorName.trim().length < 2) return false;
    if (mobile.trim() && getMobileError(mobile)) return false;
    if (vehicleNumber.trim() && getVehicleNumberError(vehicleNumber)) return false;
    return true;
  }, [visitorName, mobile, vehicleNumber, selectedBrand, categoryConfig]);

  const handleNextFromStep1 = () => {
    if (!validateStep1()) {
      toast.warn("Please check the form for errors.");
      return;
    }
    setCurrentStep(2);
  };

  const handleSelectBlock = (block) => {
    setSelectedBlock(block);
    setSelectedFloorId(null);
    setSelectedFlat(null);
    setCurrentStep(3);
  };

  const handleSelectFlat = (flat) => {
    setSelectedFlat(flat);
    setCurrentStep(4);
  };

  // Formatted Full Visitor Name
  const formattedVisitorName = useMemo(() => {
    if (categoryConfig.requireBrand) {
      const brandData = categoryConfig.brands.find((b) => b.id === selectedBrand);
      const brandName =
        selectedBrand === "other"
          ? otherBrandName.trim() || "Service"
          : brandData?.name || "";
      return brandName ? `${brandName} - ${visitorName.trim()}` : visitorName.trim();
    }
    return visitorName.trim();
  }, [selectedBrand, otherBrandName, visitorName, categoryConfig]);

  // ── Submit Visitor Entry ──
  const handleSubmitEntry = async () => {
    if (!selectedFlat?.id) {
      toast.error("Flat selection is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        visitor_name: formattedVisitorName,
        purpose: purpose.toUpperCase(),
        flat_id: selectedFlat.id,
        mobile: mobile.trim() || "0000000000",
        vehicle_number: vehicleNumber ? vehicleNumber.toUpperCase().trim() : "",
        vehicle_type: vehicleType,
        assigned_slot: assignedSlot || undefined,
      };

      const res = await API.post("/visitors", payload);
      toast.success(
        res.data?.message || `${categoryConfig.title} Approved & Created!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating visitor entry:", err);
      toast.error(
        err.response?.data?.message || "Failed to allow visitor entry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { num: "01", label: "Info", stepIndex: 1 },
    { num: "02", label: "Building", stepIndex: 2 },
    { num: "03", label: "Flat", stepIndex: 3 },
    { num: "04", label: "Confirm", stepIndex: 4 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-xl bg-card border border-glass-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        style={{
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.35), 0 0 25px rgba(37, 99, 235, 0.08)",
        }}
      >
        {/* ── 1. MODERN HEADER ── */}
        <div className="px-6 py-4.5 sm:px-7 sm:py-5 flex items-center justify-between border-b border-glass-border bg-card relative shrink-0">
          <div className="flex items-center gap-3.5">
            {/* 44-48px Rounded Squircle Blue Container */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <categoryConfig.icon size={22} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">
                  {categoryConfig.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  STEP {currentStep} OF 4
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">
                {categoryConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Redesigned Close Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-glass-border hover:bg-card-inner-bg text-secondary hover:text-primary transition-all flex items-center justify-center shadow-xs active:scale-95 shrink-0"
            title="Close"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* ── 2. CONNECTED MODERN STEPPER ── */}
        <div className="px-7 py-3.5 bg-card-inner-bg/80 border-b border-glass-border shrink-0">
          <div className="relative flex items-center justify-between">
            {/* Background Thin Connecting Line */}
            <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 h-0.5 bg-glass-border/80 -z-0" />

            {/* Active Filled Progress Line */}
            <div
              className="absolute left-5 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 -z-0 transition-all duration-300 ease-out"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                maxWidth: "calc(100% - 40px)",
              }}
            />

            {/* Stepper Nodes */}
            {steps.map((s) => {
              const isDone = s.stepIndex < currentStep;
              const isCurrent = s.stepIndex === currentStep;

              return (
                <div
                  key={s.num}
                  onClick={() => {
                    if (isDone) setCurrentStep(s.stepIndex);
                  }}
                  className={`flex flex-col items-center relative z-10 ${
                    isDone ? "cursor-pointer" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                        : isDone
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-card border-2 border-glass-border text-secondary"
                    }`}
                  >
                    {isDone ? <MdCheck size={16} /> : <span>{s.num}</span>}
                  </div>
                  <span
                    className={`text-[10px] mt-1 tracking-tight ${
                      isCurrent
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : isDone
                        ? "text-primary font-semibold"
                        : "text-secondary font-medium"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 3. MODAL CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ================= STEP 1: VISITOR / PROVIDER DETAILS ================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Form Section Header */}
              <div className="pb-1">
                <h4 className="text-sm font-bold text-primary">
                  {categoryConfig.sectionTitle}
                </h4>
                <p className="text-xs text-secondary mt-0.5">
                  {categoryConfig.sectionSubtitle}
                </p>
              </div>

              {/* Brand Presets (For Cab, Delivery, Service) */}
              {categoryConfig.requireBrand && categoryConfig.brands.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    {categoryConfig.brandTitle} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {categoryConfig.brands.map((b) => {
                      const isSel = selectedBrand === b.id;
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => {
                            setSelectedBrand(b.id);
                            if (errors.brand) setErrors((prev) => ({ ...prev, brand: null }));
                          }}
                          className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                            isSel
                              ? "border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-xs"
                              : "border-glass-border hover:border-gray-300 dark:hover:border-gray-600 bg-card text-primary"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
                            style={{
                              backgroundColor: isSel ? "#2563EB" : "rgba(100, 116, 139, 0.15)",
                              color: isSel ? "#FFFFFF" : "var(--text-primary)",
                            }}
                          >
                            {b.iconText}
                          </span>
                          <span className="truncate">{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.brand && (
                    <FieldError error={errors.brand} className="text-[11px]" id={`${categoryConfig.code}-brand-error`} />
                  )}

                  {selectedBrand === "other" && (
                    <div className="mt-2.5 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="Enter custom brand or company name..."
                        value={otherBrandName}
                        onChange={(e) => setOtherBrandName(e.target.value)}
                        className="w-full h-11 px-3.5 text-xs font-medium rounded-xl bg-card-inner-bg border border-glass-border focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-primary outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Visitor Full Name Input */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  {categoryConfig.namePlaceholder} <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center h-12 rounded-xl bg-card-inner-bg border transition-all overflow-hidden ${
                    errors.name
                      ? "border-red-500 ring-1 ring-red-500/30"
                      : "border-glass-border focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20"
                  }`}
                >
                  <div className="pl-3.5 pr-2.5 text-secondary flex items-center justify-center shrink-0">
                    <MdPerson size={20} className="text-secondary/70" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={visitorName}
                    onChange={(e) => {
                      setVisitorName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                    }}
                    className="w-full h-full pr-3 bg-transparent text-sm font-medium text-primary placeholder:text-secondary/50 outline-none border-0"
                  />
                </div>
                {errors.name && (
                  <FieldError error={errors.name} className="text-[11px]" id={`${categoryConfig.code}-name-error`} />
                )}
              </div>

              {/* Contact Mobile & Vehicle Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Contact Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    Contact Mobile
                  </label>
                  <div
                    className={`flex items-center h-12 rounded-xl bg-card-inner-bg border transition-all overflow-hidden ${
                      errors.mobile
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-glass-border focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20"
                    }`}
                  >
                    <div className="pl-3.5 pr-2.5 text-secondary flex items-center justify-center shrink-0">
                      <MdPhone size={18} className="text-secondary/70" />
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/\D/g, ""));
                        if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: null }));
                      }}
                      className="w-full h-full pr-3 bg-transparent text-sm font-mono text-primary placeholder:text-secondary/50 outline-none border-0"
                    />
                  </div>
                  {errors.mobile && (
                    <FieldError error={errors.mobile} className="text-[11px]" id={`${categoryConfig.code}-mobile-error`} />
                  )}
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    Vehicle Number (Optional)
                  </label>
                  <div
                    className={`flex items-center h-12 rounded-xl bg-card-inner-bg border transition-all overflow-hidden ${
                      errors.vehicle
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-glass-border focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20"
                    }`}
                  >
                    <div className="pl-3.5 pr-2.5 text-secondary flex items-center justify-center shrink-0">
                      <MdDirectionsCar size={18} className="text-secondary/70" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. MH 12 AB 1234"
                      value={vehicleNumber}
                      onChange={(e) => {
                        setVehicleNumber(e.target.value.toUpperCase());
                        if (errors.vehicle) setErrors((prev) => ({ ...prev, vehicle: null }));
                      }}
                      className="w-full h-full pr-3 bg-transparent text-sm font-mono uppercase font-bold text-primary placeholder:text-secondary/50 outline-none border-0"
                    />
                  </div>
                  {errors.vehicle && (
                    <FieldError error={errors.vehicle} className="text-[11px]" id={`${categoryConfig.code}-vehicle-error`} />
                  )}
                </div>
              </div>

              {/* Vehicle Type & Parking Slot (For Guest) */}
              {purpose.toUpperCase() === "GUEST" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Vehicle Type Segmented Control */}
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Vehicle Type
                    </label>
                    <div className="flex h-12 p-1 rounded-xl bg-card-inner-bg border border-glass-border">
                      {[
                        { type: "CAR", label: "Car", icon: MdDirectionsCar },
                        { type: "BIKE", label: "Bike", icon: MdDirectionsBike },
                      ].map((vt) => {
                        const isVtSel = vehicleType === vt.type;
                        return (
                          <button
                            type="button"
                            key={vt.type}
                            onClick={() => setVehicleType(vt.type)}
                            className={`flex-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isVtSel
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-secondary hover:text-primary"
                            }`}
                          >
                            <vt.icon size={16} />
                            <span>{vt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parking Slot Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Assign Visitor Slot
                    </label>
                    <div className="relative flex items-center h-12 rounded-xl bg-card-inner-bg border border-glass-border focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <div className="pl-3.5 pr-2 text-secondary flex items-center justify-center shrink-0">
                        <MdLocalParking size={18} className="text-secondary/70" />
                      </div>
                      <select
                        value={assignedSlot}
                        onChange={(e) => setAssignedSlot(e.target.value)}
                        className="w-full h-full pr-8 bg-transparent text-xs font-bold text-primary outline-none border-0 appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-card text-primary">
                          No Parking Slot
                        </option>
                        {parkingSlots.map((s) => (
                          <option key={s.id || s.slot_number} value={s.slot_number} className="bg-card text-primary">
                            Slot {s.slot_number} ({s.vehicle_type || "Any"})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 pointer-events-none text-secondary">
                        <MdKeyboardArrowDown size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: SELECT BUILDING / BLOCK ================= */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h4 className="text-sm font-bold text-primary">
                    Select Destination Building / Block
                  </h4>
                  <p className="text-xs text-secondary mt-0.5">
                    Choose the society block the visitor is arriving for
                  </p>
                </div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  {blocks.length} Blocks
                </span>
              </div>

              {loadingData ? (
                <div className="py-12 text-center text-secondary space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium">Loading society blocks...</p>
                </div>
              ) : blocks.length === 0 ? (
                <div className="py-10 text-center text-secondary text-xs">
                  No buildings or assigned flats found in this society.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto pr-1">
                  {blocks.map((b) => {
                    const isSelected = selectedBlock?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBlock(b)}
                        className={`group p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-500/10 shadow-xs"
                            : "border-glass-border hover:border-blue-500/50 bg-card hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <MdApartment size={20} />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-primary group-hover:text-blue-600 transition-colors">
                              {b.name}
                            </h5>
                            <p className="text-[11px] text-secondary font-medium mt-0.5">
                              {b.totalFloors} Floors • {b.totalFlats} Flats
                            </p>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-card-inner-bg border border-glass-border flex items-center justify-center text-secondary group-hover:text-blue-600 transition-all">
                          <MdArrowForward size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: SELECT FLAT ================= */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-glass-border">
                <div>
                  <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <span>Flats in {selectedBlock?.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {filteredFlats.length} Units
                    </span>
                  </h4>
                  <p className="text-xs text-secondary mt-0.5">
                    Click flat number to proceed
                  </p>
                </div>

                {/* Flat Search */}
                <div className="flex items-center rounded-xl bg-card-inner-bg border border-glass-border focus-within:border-blue-600 px-2.5 py-1 w-full sm:w-44">
                  <MdSearch size={16} className="text-secondary shrink-0 mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search flat..."
                    value={flatSearch}
                    onChange={(e) => setFlatSearch(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-primary outline-none border-0"
                  />
                </div>
              </div>

              {/* Floor Tabs */}
              {floors.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {floors.map((fl) => (
                    <button
                      key={fl.id}
                      type="button"
                      onClick={() => setSelectedFloorId(fl.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedFloorId === fl.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-card-inner-bg border border-glass-border text-secondary hover:text-primary"
                      }`}
                    >
                      Floor {fl.floor_number}
                    </button>
                  ))}
                </div>
              )}

              {/* Flats Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[38vh] overflow-y-auto pr-1">
                {filteredFlats.map((flat) => {
                  const isSel = selectedFlat?.id === flat.id;
                  const residentName = flat.User?.name || "Resident";
                  return (
                    <button
                      type="button"
                      key={flat.id}
                      onClick={() => handleSelectFlat(flat)}
                      className={`p-2.5 rounded-2xl border text-center transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isSel
                          ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                          : "border-glass-border bg-card-inner-bg text-primary hover:border-blue-500/50"
                      }`}
                    >
                      <MdMeetingRoom size={18} className={isSel ? "text-white" : "text-blue-600"} />
                      <span className="text-xs font-bold tracking-tight">
                        {flat.flat_number}
                      </span>
                      <span
                        className={`text-[9px] font-medium truncate max-w-full block ${
                          isSel ? "text-white/90" : "text-secondary"
                        }`}
                      >
                        {residentName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 4: REVIEW & CONFIRM ================= */}
          {currentStep === 4 && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* Ready Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MdCheckCircle size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Verify &amp; Authorize Gate Pass
                  </h4>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Review visitor destination details and confirm entry
                  </p>
                </div>
              </div>

              {/* Digital Pass Card */}
              <div className="p-4 rounded-2xl bg-card-inner-bg border border-glass-border space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2.5 border-b border-glass-border">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                      Visitor / Driver
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formattedVisitorName}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                    {purpose.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2.5 border-b border-glass-border">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                      Destination Flat
                    </span>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 mt-0.5">
                      <MdMeetingRoom className="text-blue-600" />
                      {selectedBlock?.name} • Flat {selectedFlat?.flat_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                      Contact Mobile
                    </span>
                    <span className="text-xs font-mono font-bold text-primary flex items-center gap-1 mt-0.5">
                      <MdPhone className="text-blue-600" />
                      {mobile || "Not Provided"}
                    </span>
                  </div>
                </div>

                {vehicleNumber && (
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                        Vehicle
                      </span>
                      <span className="text-xs font-mono font-bold text-primary uppercase mt-0.5 block">
                        {vehicleNumber} ({vehicleType})
                      </span>
                    </div>
                    {assignedSlot && (
                      <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                        Slot: {assignedSlot}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 4. FOOTER CONTROLS ── */}
        <div className="px-6 py-4 bg-card border-t border-glass-border flex items-center justify-between gap-3 shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((p) => p - 1)}
              className="h-11 px-5 rounded-full text-xs font-bold border border-glass-border text-secondary hover:text-primary transition flex items-center gap-1.5 hover:bg-card-inner-bg active:scale-98"
            >
              <MdArrowBack size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-full text-xs font-bold text-secondary hover:text-primary hover:bg-card-inner-bg transition active:scale-98"
            >
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="h-11 px-7 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-98"
              >
                <span>Continue</span>
                <MdArrowForward size={16} />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitEntry}
                className="h-11 px-7 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-98"
              >
                {submitting ? (
                  "Recording..."
                ) : (
                  <>
                    <MdCheckCircle size={18} /> CONFIRM &amp; ALLOW ENTRY
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
