  import { useEffect, useState, useRef, useCallback } from "react";
  import { useNavigate } from "react-router-dom";
  import API from "../../services/api";
  import { useLang } from "../../context/LanguageContext";
  import DatePicker from "react-datepicker";
  import "react-datepicker/dist/react-datepicker.css";
  import Modal from "../../components/Modal";
  import { QRCodeCanvas } from "qrcode.react";
  import html2canvas from "html2canvas";
  import { FaDownload, FaShareAlt, FaTimes, FaLock, FaBan } from "react-icons/fa";
  import {
    MdSearch, MdClose, MdFilterList,
    MdChevronLeft, MdChevronRight, MdWarning, MdBlock,
    MdPayment, MdRefresh, MdTimer,
  } from "react-icons/md";

  /* ─── Razorpay script loader ─── */
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src     = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload  = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  /* ─── Debounce ─── */
  function useDebounce(value, delay = 500) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
  }

  /* ─── Spinner ─── */
  function Spinner({ small = false }) {
    const s = small ? 13 : 20;
    return (
      <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    );
  }

  /* ─── Countdown timer for PAYMENT_PENDING bookings ─── */
  function PaymentCountdown({ expiresAt }) {
    const [secondsLeft, setSecondsLeft] = useState(() => {
      if (!expiresAt) return 0;
      return Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000));
    });

    useEffect(() => {
      if (secondsLeft <= 0) return;
      const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
      return () => clearInterval(id);
    }, [secondsLeft]);

    if (secondsLeft <= 0) return (
      <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
        <MdTimer size={12} /> Expired
      </span>
    );

    const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    const isUrgent = secondsLeft < 120;

    return (
      <span style={{
        fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3,
        color: isUrgent ? "#ef4444" : "#f59e0b",
      }}>
        <MdTimer size={12} /> {m}:{s}
      </span>
    );
  }

  /* ─── Pagination ─── */
  function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
      .reduce((acc, p, idx, arr) => {
        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
        acc.push(p);
        return acc;
      }, []);
    return (
      <div className="pagination-wrap">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
          <MdChevronLeft size={15} /> Prev
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
          Next <MdChevronRight size={15} />
        </button>
      </div>
    );
  }

  const LIMIT = 10;
  const STATUS_OPTIONS = ["ALL", "PAYMENT_PENDING", "PENDING", "APPROVED", "CANCELLED", "REJECTED"];

  const STATUS_STYLE = {
    PAYMENT_PENDING: { dot: "#8b5cf6", pill: "bg-purple-500/15 text-purple-400" },
    APPROVED:        { dot: "#22c55e", pill: "bg-green-500/15 text-green-400"   },
    PENDING:         { dot: "#f59e0b", pill: "bg-yellow-500/15 text-yellow-400" },
    CANCELLED:       { dot: "#ef4444", pill: "bg-red-500/15 text-red-400"       },
    REJECTED:        { dot: "#ef4444", pill: "bg-red-500/15 text-red-400"       },
  };

  function ClosureBanner({ amenity }) {
    if (amenity.is_active || !amenity.disabled_reason) return null;
    const isTemp = amenity.disable_type === "TEMPORARY";
    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 7,
        padding: "8px 10px", borderRadius: 8, margin: "10px 0 0",
        background: isTemp ? "rgba(245,158,11,0.1)" : "rgba(220,38,38,0.07)",
        border: `1px solid ${isTemp ? "rgba(245,158,11,0.25)" : "rgba(220,38,38,0.2)"}`,
        fontSize: 11, lineHeight: 1.5,
        color: isTemp ? "#92400e" : "#7f1d1d",
      }}>
        {isTemp
          ? <MdWarning size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          : <MdBlock   size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        }
        <span>
          {amenity.disabled_reason}
          {isTemp && amenity.disabled_until && (
            <span style={{ fontWeight: 600 }}> Reopens on {amenity.disabled_until}.</span>
          )}
          {!isTemp && (
            <span style={{ fontWeight: 600 }}> Booking is unavailable until further notice.</span>
          )}
        </span>
      </div>
    );
  }

  const amenityIcon = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("pool") || n.includes("swim"))      return "🏊";
    if (n.includes("gym")  || n.includes("fitness"))   return "🏋️";
    if (n.includes("tennis")|| n.includes("court"))    return "🎾";
    if (n.includes("club") || n.includes("lounge"))    return "🛋️";
    if (n.includes("park") || n.includes("garden"))    return "🌿";
    if (n.includes("hall") || n.includes("banquet"))   return "🎉";
    if (n.includes("theater")|| n.includes("cinema"))  return "🎬";
    if (n.includes("spa")  || n.includes("sauna"))     return "♨️";
    if (n.includes("library"))                         return "📚";
    if (n.includes("ground")|| n.includes("field"))    return "⚽";
    if (n.includes("auditorium"))                      return "🎭";
    return "✦";
  };

  /* ══════════════════════════════════════════════════════════
    Razorpay checkout handler
    Called both from initial booking AND from repay.
  ══════════════════════════════════════════════════════════ */
  async function openRazorpayCheckout({ razorpayOrder, onSuccess, onDismiss }) {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Payment gateway could not be loaded. Please check your internet connection.");
      return;
    }

    const options = {
      key:         razorpayOrder.key,
      amount:      razorpayOrder.amount,
      currency:    razorpayOrder.currency || "INR",
      name:        "Society Amenity Booking",
      description: razorpayOrder.description || "Amenity Booking",
      order_id:    razorpayOrder.id,
      prefill:     razorpayOrder.prefill || {},
      theme:       { color: "#6366f1" },
      modal: {
        ondismiss: () => {
          // User closed the checkout — slot stays PAYMENT_PENDING, cron will expire it
          if (onDismiss) onDismiss();
        },
      },
      handler: async (response) => {
        // Payment captured by Razorpay — now verify on our server
        if (onSuccess) onSuccess(response);
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      console.error("[Razorpay] payment.failed", response.error);
      if (onDismiss) onDismiss({ failed: true, error: response.error });
    });
    rzp.open();
  }

  /* ══════════════════════════════════════════════════════════
    MAIN COMPONENT
  ══════════════════════════════════════════════════════════ */
  export default function ResidentAmenity() {
    const navigate = useNavigate();
    const passRef  = useRef(null);
    const { t }    = useLang();

    /* ── Amenities ── */
    const [amenities,       setAmenities]       = useState([]);
    const [selectedAmenity, setSelectedAmenity] = useState(null);
    const [selectedDate,    setSelectedDate]    = useState(null);
    const [slots,           setSlots]           = useState([]);
    const [bookedDates,     setBookedDates]     = useState([]);
    const [showDateModal,   setShowDateModal]   = useState(false);
    const [slotsLoading,    setSlotsLoading]    = useState(false);
    const [bookingLoading,  setBookingLoading]  = useState(false);
    const [bookingError,    setBookingError]    = useState("");

    /* ── Payment status UI ── */
    const [paymentStatus, setPaymentStatus] = useState(null);
    // null | "processing" | "success" | "failed" | "dismissed"

    /* ── Bookings tab ── */
    const [myBookings,    setMyBookings]    = useState([]);
    const [amenityNames,  setAmenityNames]  = useState([]);
    const [counts,        setCounts]        = useState({
      ALL: 0, PAYMENT_PENDING: 0, PENDING: 0, APPROVED: 0, CANCELLED: 0, REJECTED: 0,
    });
    const [initialLoad,   setInitialLoad]   = useState(true);
    const [fetching,      setFetching]      = useState(false);
    const [repayingId,    setRepayingId]    = useState(null);

    /* ── Filters ── */
    const [bookingSearch,   setBookingSearch]   = useState("");
    const [statusFilter,    setStatusFilter]    = useState("ALL");
    const [amenityFilter,   setAmenityFilter]   = useState("ALL");
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const debouncedSearch = useDebounce(bookingSearch, 500);

    /* ── Pagination ── */
    const [page,       setPage]       = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    /* ── Pass modal ── */
    const [showPassModal,   setShowPassModal]   = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    /* ── Tab ── */
    const [tab, setTab] = useState("AMENITIES");

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    /* ── Helpers ── */
    const formatDateLocal = (date) =>
      date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");

    const formatBookingDate = (date, start_time) => {
      if (!start_time || start_time === "00:00:00") return date;
      return `${date} · ${start_time.slice(0, 5)}`;
    };

    const hasFilters        = statusFilter !== "ALL" || amenityFilter !== "ALL";
    const activeFilterCount = (statusFilter !== "ALL" ? 1 : 0) + (amenityFilter !== "ALL" ? 1 : 0);

    /* ── Load amenities ── */
    useEffect(() => {
      API.get("/amenities").then((res) => setAmenities(res.data.data || []));
    }, []);

    /* ── Load my bookings ── */
    const loadMyBookings = useCallback(async (
      pageNum, sFilter, currentSearch, aFilter, isInitial = false
    ) => {
      if (isInitial) setInitialLoad(true);
      else setFetching(true);
      try {
        const params = new URLSearchParams({
          page:   pageNum,
          limit:  LIMIT,
          filter: sFilter,
          ...(currentSearch                ? { search:      currentSearch } : {}),
          ...(aFilter && aFilter !== "ALL" ? { amenityName: aFilter       } : {}),
        });
        const res = await API.get(`/amenities/my-bookings?${params}`);
        setMyBookings(res.data.data || []);
        setCounts(res.data.counts  || {});
        setTotalPages(res.data.pagination.totalPages);
        setTotalItems(res.data.pagination.totalItems);
        setAmenityNames(res.data.amenityNames || []);
        setPage(pageNum);
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoad(false);
        setFetching(false);
      }
    }, []);

    useEffect(() => { loadMyBookings(1, "ALL", "", "ALL", true); }, []);

    useEffect(() => {
      if (initialLoad) return;
      loadMyBookings(1, statusFilter, debouncedSearch, amenityFilter);
    }, [debouncedSearch, statusFilter, amenityFilter]);

    const handlePageChange   = (p) => loadMyBookings(p, statusFilter, debouncedSearch, amenityFilter);
    const clearAllFilters    = () => { setStatusFilter("ALL"); setAmenityFilter("ALL"); setBookingSearch(""); };

    /* ── Availability ── */
    useEffect(() => {
      if (selectedAmenity && selectedDate) loadAvailability(selectedAmenity.id, selectedDate);
    }, [selectedDate]);

    const loadAvailability = async (id, date) => {
      setSlotsLoading(true);
      setSlots([]);
      try {
        const res = await API.get(`/amenities/${id}/availability?date=${formatDateLocal(date)}`);
        setSlots(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSlotsLoading(false);
      }
    };

    const loadBookedDates = async (id) => {
      const res = await API.get(`/amenities/${id}/booked-dates`);
      const converted = (res.data.data || []).map((d) => {
        const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt;
      });
      setBookedDates(converted);
    };

    const selectAmenity = async (a) => {
      setSelectedAmenity(a);
      setSelectedDate(null);
      setSlots([]);
      setBookingError("");
      setPaymentStatus(null);
      setShowDateModal(true);
      if (a.booking_type === "FULL_DAY") await loadBookedDates(a.id);
    };

    const filterFutureSlots = (slot) => {
      if (!selectedDate) return true;
      const now      = new Date();
      const selected = new Date(selectedDate);
      if (selected.toDateString() !== now.toDateString()) return true;
      if (!slot.start_time) return true;
      const [h, m] = slot.start_time.split(":");
      const slotTime = new Date(selected);
      slotTime.setHours(h); slotTime.setMinutes(m); slotTime.setSeconds(0);
      return slotTime > now;
    };

    /* ══════════════════════════════════════════════════
      BOOK SLOT
      FREE  → direct book, close modal
      PAID  → book → get Razorpay order → open checkout
    ══════════════════════════════════════════════════ */
    const bookSlot = async (startTime) => {
      if (bookingLoading) return;
      setBookingLoading(true);
      setBookingError("");
      setPaymentStatus(null);

      try {
        const res = await API.post("/amenities/book", {
          amenityId: selectedAmenity.id,
          date:      formatDateLocal(selectedDate),
          startTime: startTime || null,
        });

        if (!res.data.requiresPayment) {
          // FREE booking — done
          setShowDateModal(false);
          await loadMyBookings(1, statusFilter, debouncedSearch, amenityFilter);
          setTab("BOOKINGS");
          return;
        }

        /* PAID — open Razorpay */
        const { razorpayOrder, data: booking } = res.data;
        setBookingLoading(false);
        setPaymentStatus("processing");

        await openRazorpayCheckout({
          razorpayOrder,
          onDismiss: ({ failed } = {}) => {
            setPaymentStatus(failed ? "failed" : "dismissed");
            // Reload bookings so the PAYMENT_PENDING row appears with repay button
            loadMyBookings(1, statusFilter, debouncedSearch, amenityFilter);
            // Reload slots — the slot is still "held" so it shows unavailable
            if (selectedDate) loadAvailability(selectedAmenity.id, selectedDate);
          },
          onSuccess: async (response) => {
            setPaymentStatus("processing");
            try {
              await API.post("/amenities/verify-payment", {
                booking_id:           booking.id,
                razorpay_order_id:    response.razorpay_order_id,
                razorpay_payment_id:  response.razorpay_payment_id,
                razorpay_signature:   response.razorpay_signature,
              });
              setPaymentStatus("success");
              await loadMyBookings(1, statusFilter, debouncedSearch, amenityFilter);
              setTimeout(() => {
                setShowDateModal(false);
                setPaymentStatus(null);
                setTab("BOOKINGS");
              }, 1800);
            } catch (verifyErr) {
              console.error("[verifyPayment]", verifyErr);
              setPaymentStatus("failed");
              await loadMyBookings(1, statusFilter, debouncedSearch, amenityFilter);
            }
          },
        });
      } catch (err) {
        const msg = err.response?.data?.message || "Failed to create booking. Please try again.";
        setBookingError(msg);
        setPaymentStatus(null);
      } finally {
        setBookingLoading(false);
      }
    };

    /* ══════════════════════════════════════════════════
      REPAY  — for existing PAYMENT_PENDING bookings
    ══════════════════════════════════════════════════ */
    const handleRepay = async (booking) => {
      if (repayingId) return;
      setRepayingId(booking.id);
      try {
        const res = await API.post(`/amenities/${booking.id}/repay`);
        const { razorpayOrder } = res.data;

        await openRazorpayCheckout({
          razorpayOrder,
          onDismiss: () => {
            setRepayingId(null);
            loadMyBookings(page, statusFilter, debouncedSearch, amenityFilter);
          },
          onSuccess: async (response) => {
            try {
              await API.post("/amenities/verify-payment", {
                booking_id:          booking.id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              });
              await loadMyBookings(1, statusFilter, debouncedSearch, amenityFilter);
            } catch (e) {
              console.error("[repay verify]", e);
              alert("Payment captured but verification failed. Please contact support with booking #" + booking.id);
            } finally {
              setRepayingId(null);
            }
          },
        });
      } catch (err) {
        const msg = err.response?.data?.message || "Could not initiate repayment.";
        alert(msg);
        setRepayingId(null);
        await loadMyBookings(page, statusFilter, debouncedSearch, amenityFilter);
      }
    };

    /* ─── Cancel ─── */
    const cancelBooking = async (id) => {
      await API.put(`/amenities/${id}/cancel`);
      loadMyBookings(page, statusFilter, debouncedSearch, amenityFilter);
    };

    /* ─── Pass modal ─── */
    const openPass = (booking) => {
      // Don't open pass for PAYMENT_PENDING or CANCELLED/REJECTED
      if (booking.status === "PAYMENT_PENDING") return;
      setSelectedBooking(booking);
      setShowPassModal(true);
    };

    const capture = async () => {
      const canvas = await html2canvas(passRef.current, {
        scale: 3, backgroundColor: "#0f172a", useCORS: true, logging: false,
      });
      return canvas;
    };

    const downloadPass = async () => {
      const canvas = await capture();
      const link = document.createElement("a");
      link.download = `Amenity_Pass_${selectedBooking.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    const sharePass = async () => {
      try {
        const canvas = await capture();
        const blob   = await new Promise((resolve) => canvas.toBlob(resolve));
        const file   = new File([blob], `Amenity_Pass_${selectedBooking.id}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
        } else { downloadPass(); }
      } catch { downloadPass(); }
    };

    const statusClass = (status) => {
      if (status === "APPROVED")  return "status resolved";
      if (status === "PENDING")   return "status pending";
      if (status === "PAYMENT_PENDING") return "status pending";
      if (status === "REJECTED" || status === "CANCELLED") return "status failed";
      return "status";
    };

    const statusDisplayLabel = (status) => {
      switch (status) {
        case "PAYMENT_PENDING": return "Awaiting Payment";
        case "PENDING":         return "Awaiting Approval";
        case "APPROVED":        return "Confirmed";
        case "CANCELLED":       return "Cancelled";
        case "REJECTED":        return "Rejected";
        default:                return status;
      }
    };

    /* ─── Pass content (unchanged from original, kept intact) ─── */
    const renderPassContent = () => {
      if (!selectedBooking) return null;
      const { status } = selectedBooking;
      const passCardStyle = {
        width: "340px",
        background: "linear-gradient(160deg, rgba(255,255,255,0.045) 0%, #0f172a 35%)",
        padding: "18px 22px 14px", borderRadius: "20px", color: "white",
        textAlign: "center", border: "1px solid rgba(255,255,255,0.09)", position: "relative", overflow: "hidden",
      };
      const gridLabelStyle = { color: "#64748b" };
      const gridValueStyle = { textAlign: "right", color: "#f8fafc", fontWeight: "500" };
      const tearLine = (
        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", margin: "0 -22px 14px", position: "relative" }}>
          <span style={{ position: "absolute", left: "-7px", top: "-7px", width: "13px", height: "13px", borderRadius: "50%", background: "#0a0f1e", display: "block" }} />
          <span style={{ position: "absolute", right: "-7px", top: "-7px", width: "13px", height: "13px", borderRadius: "50%", background: "#0a0f1e", display: "block" }} />
        </div>
      );

      if (status === "PENDING") {
        return (
          <div className="ra-pass-wrapper">
            <div style={{ ...passCardStyle, borderTop: "2px solid #eab308" }}>
              <div style={{ letterSpacing: "0.18em", fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>{t("amenPassResident")}</div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "0.08em", margin: "0 0 6px" }}>{t("amenPassTitle")}</h2>
              <div style={{ width: "36px", height: "2px", background: "linear-gradient(90deg,#eab308,#f59e0b)", margin: "0 auto 14px" }} />
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(234,179,8,0.13)", border: "1px solid rgba(234,179,8,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <FaLock style={{ color: "#eab308", fontSize: "1.35rem" }} />
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", margin: "0 0 4px" }}>Awaiting Admin Approval</h3>
              <p style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.55", margin: "0 0 14px" }}>Your payment was received. The admin will approve your booking shortly.</p>
              {tearLine}
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "7px", fontSize: "12px", textAlign: "left", marginBottom: "10px" }}>
                <span style={gridLabelStyle}>Amenity</span><span style={gridValueStyle}>{selectedBooking.Amenity?.name}</span>
                <span style={gridLabelStyle}>Date</span><span style={gridValueStyle}>{selectedBooking.date}</span>
                <span style={gridLabelStyle}>Booking #</span><span style={gridValueStyle}>#{selectedBooking.id}</span>
                <span style={gridLabelStyle}>Status</span><span style={{ textAlign: "right", color: "#eab308", fontWeight: "700", fontSize: "11px" }}>Pending Approval</span>
              </div>
            </div>
            <div className="ra-pass-actions">
              <button className="ra-pass-btn ra-pass-btn--close" onClick={() => setShowPassModal(false)}><FaTimes /><span>{t("cancel")}</span></button>
            </div>
          </div>
        );
      }

      if (status === "CANCELLED" || status === "REJECTED") {
        return (
          <div className="ra-pass-wrapper">
            <div style={{ ...passCardStyle, borderTop: "2px solid #ef4444" }}>
              <div style={{ letterSpacing: "0.18em", fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>{t("amenPassResident")}</div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "0.08em", margin: "0 0 6px" }}>{t("amenPassTitle")}</h2>
              <div style={{ width: "36px", height: "2px", background: "linear-gradient(90deg,#ef4444,#f87171)", margin: "0 auto 14px" }} />
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <FaBan style={{ color: "#ef4444", fontSize: "1.35rem" }} />
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", margin: "0 0 4px" }}>Booking {status === "CANCELLED" ? "Cancelled" : "Rejected"}</h3>
              {tearLine}
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "7px", fontSize: "12px", textAlign: "left", marginBottom: "10px" }}>
                <span style={gridLabelStyle}>Amenity</span><span style={gridValueStyle}>{selectedBooking.Amenity?.name}</span>
                <span style={gridLabelStyle}>Date</span><span style={gridValueStyle}>{selectedBooking.date}</span>
                <span style={gridLabelStyle}>Booking #</span><span style={gridValueStyle}>#{selectedBooking.id}</span>
              </div>
            </div>
            <div className="ra-pass-actions">
              <button className="ra-pass-btn ra-pass-btn--close" onClick={() => setShowPassModal(false)}><FaTimes /><span>Close</span></button>
            </div>
          </div>
        );
      }

      // APPROVED — show QR pass
      return (
        <div className="ra-pass-wrapper">
          <div ref={passRef} style={{ ...passCardStyle, borderTop: "2px solid #3b82f6" }}>
            <div style={{ letterSpacing: "0.18em", fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>{t("amenPassResident")}</div>
            <h2 style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "0.08em", margin: "0" }}>{t("amenPassTitle")}</h2>
            <div style={{ width: "36px", height: "2px", background: "linear-gradient(90deg,#3b82f6,#6366f1)", margin: "7px auto" }} />
            <div style={{ display: "flex", justifyContent: "center", marginTop: "4px" }}>
              <div style={{ padding: "8px", background: "white", borderRadius: "10px", display: "inline-block" }}>
                <QRCodeCanvas value={JSON.stringify({ bookingId: selectedBooking.id })} size={140} bgColor="#ffffff" />
              </div>
            </div>
            <h3 style={{ marginTop: "8px", fontSize: "14px", fontWeight: "600" }}>{user?.name}</h3>
            <div style={{ marginTop: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", padding: "9px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "6px", fontSize: "12px", textAlign: "left" }}>
              <span style={gridLabelStyle}>Date</span><span style={gridValueStyle}>{selectedBooking.date}</span>
              <span style={gridLabelStyle}>Booking #</span><span style={gridValueStyle}>#{selectedBooking.id}</span>
              <span style={gridLabelStyle}>Status</span><span style={{ textAlign: "right", color: "#22c55e", fontWeight: "700" }}>Confirmed</span>
              <span style={gridLabelStyle}>Amenity</span><span style={gridValueStyle}>{selectedBooking.Amenity?.name}</span>
              <span style={gridLabelStyle}>Amount</span><span style={gridValueStyle}>₹{selectedBooking.Amenity?.rate_per_hour || 0}</span>
            </div>
            <div style={{ marginTop: "8px", fontSize: "9px", color: "#334155", letterSpacing: "0.1em" }}>{t("amenPassScanNote")}</div>
          </div>
          <div className="ra-pass-actions">
            <button className="ra-pass-btn ra-pass-btn--download" onClick={downloadPass}><FaDownload /><span>{t("amenPassDownload")}</span></button>
            <button className="ra-pass-btn ra-pass-btn--share" onClick={sharePass}><FaShareAlt /><span>{t("amenPassShare")}</span></button>
            <button className="ra-pass-btn ra-pass-btn--close" onClick={() => setShowPassModal(false)}><FaTimes /><span>{t("cancel")}</span></button>
          </div>
        </div>
      );
    };

    /* ══════════════════════════════════════════════════
      RENDER
    ══════════════════════════════════════════════════ */
    return (
      <div className="ra-root animate-fadeIn">

        {/* PAGE HEADER */}
        <div className="ra-er">
          <div className="ra-er-left">
            <span className="ra-er-icon">✦</span>
            <div>
              <h1 className="ra-title">{t("amenTitle")}</h1>
              <p className="ra-subtitle">{t("amenSubtitle")}</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="ra-tab-bar">
          <button type="button" onClick={() => setTab("AMENITIES")}
            className={`ra-tab ${tab === "AMENITIES" ? "ra-tab--active" : ""}`}>
            <span className="ra-tab-icon">◈</span>
            {t("amenTabFacilities")}
          </button>
          <button type="button" onClick={() => setTab("BOOKINGS")}
            className={`ra-tab ${tab === "BOOKINGS" ? "ra-tab--active" : ""}`}>
            <span className="ra-tab-icon">◉</span>
            {t("amenTabBookings")}
            {counts.ALL > 0 && (
              <span className={`ra-tab-badge ${tab === "BOOKINGS" ? "ra-tab-badge--active" : ""}`}>
                {counts.ALL}
              </span>
            )}
            {/* Separate badge for pending payment actions */}
            {counts.PAYMENT_PENDING > 0 && (
              <span style={{
                marginLeft: 4, background: "#8b5cf6", color: "#fff",
                borderRadius: 999, fontSize: 10, fontWeight: 800,
                padding: "1px 6px", lineHeight: "1.7",
              }}>
                {counts.PAYMENT_PENDING} 💳
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════
            AMENITIES TAB
        ══════════════════════════════ */}
        {tab === "AMENITIES" && (
          <div className="ra-grid">
            {amenities.map((a, idx) => {
              const isDisabled = !a.is_active;
              const isTemp     = a.disable_type === "TEMPORARY";
              return (
                <div key={a.id} className="ra-card" style={{
                  animationDelay: `${idx * 60}ms`,
                  opacity: isDisabled ? 0.72 : 1,
                  ...(isDisabled && isTemp  ? { borderTop: "2px solid #d97706" } : {}),
                  ...(isDisabled && !isTemp ? { borderTop: "2px solid #991b1b" } : {}),
                }}>
                  <div className="ra-card-accent" />
                  {isDisabled && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                      background: isTemp ? "rgba(245,158,11,0.12)" : "rgba(220,38,38,0.1)",
                      color:      isTemp ? "#92400e"               : "#7f1d1d",
                      border: `1px solid ${isTemp ? "rgba(245,158,11,0.28)" : "rgba(220,38,38,0.22)"}`,
                    }}>
                      {isTemp ? "Temp. closed" : "Closed"}
                    </div>
                  )}
                  <div className="ra-card-emoji" style={{ opacity: isDisabled ? 0.45 : 1 }}>
                    {amenityIcon(a.name)}
                  </div>
                  <div className="ra-card-body">
                    <h3 className="ra-card-name" style={{ opacity: isDisabled ? 0.65 : 1 }}>{a.name}</h3>
                    <div className="ra-card-meta">
                      <span className="ra-pill ra-pill--type">
                        {a.booking_type === "FULL_DAY" ? t("amenFullDay") : t("amenHourly")}
                      </span>
                      <span className={`ra-pill ${a.type === "FREE" ? "ra-pill--free" : "ra-pill--paid"}`}>
                        {a.type === "FREE" ? t("amenFree") : t("amenPaid")}
                      </span>
                    </div>
                    {a.type === "PAID" && (
                      <p className="ra-card-price">
                        <span className="ra-rupee">₹</span>{a.rate_per_hour}
                        <span className="ra-per">/{a.booking_type === "FULL_DAY" ? t("amenPerDay") : t("amenPerHr")}</span>
                      </p>
                    )}
                    <ClosureBanner amenity={a} />
                  </div>
                  {isDisabled ? (
                    <button type="button" disabled className="ra-book-btn"
                      style={{ opacity: 0.38, cursor: "not-allowed", background: "var(--card-inner-bg,rgba(0,0,0,0.04))" }}>
                      <span>Booking unavailable</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => selectAmenity(a)} className="ra-book-btn">
                      <span>{t("amenCheckAvailability")}</span>
                      <span className="ra-btn-arrow">→</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════
            BOOKINGS TAB
        ══════════════════════════════ */}
        {tab === "BOOKINGS" && (
          <div className="ra-bookings">

            {/* Pending-payment notice banner */}
            {counts.PAYMENT_PENDING > 0 && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px", borderRadius: 12, marginBottom: 12,
                background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
              }} className="animate-fadeIn">
                <MdPayment size={18} style={{ color: "#8b5cf6", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {counts.PAYMENT_PENDING} booking{counts.PAYMENT_PENDING > 1 ? "s" : ""} awaiting payment
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    Complete payment before the timer runs out, or use the Repay button below.
                  </div>
                </div>
              </div>
            )}

            {!initialLoad && counts.ALL > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MdSearch size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                    <input
                      className="input h-9 pl-8 pr-8 text-xs w-full"
                      placeholder="Search by amenity…"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      {fetching ? <Spinner small /> : bookingSearch ? (
                        <button onClick={() => setBookingSearch("")} className="text-secondary">
                          <MdClose size={13} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowFilterPanel((p) => !p)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border shrink-0"
                    style={showFilterPanel || hasFilters
                      ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.35)" }
                      : { background: "var(--bg-soft,rgba(0,0,0,0.04))", color: "var(--text-secondary)", borderColor: "var(--border-color)", border: "1px solid var(--border-color)" }
                    }>
                    <MdFilterList size={15} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="bg-blue-500 text-white rounded-full px-1.5 text-[10px] font-bold leading-4">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                {showFilterPanel && (
                  <div className="rounded-xl overflow-hidden animate-scaleIn"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary mb-2">Status</p>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s} type="button" onClick={() => setStatusFilter(s)}
                              className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold border"
                              style={statusFilter === s
                                ? s === "PAYMENT_PENDING"
                                  ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderColor: "rgba(139,92,246,0.35)" }
                                  : s === "ALL"
                                  ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.35)" }
                                  : s === "APPROVED"
                                  ? { background: "rgba(34,197,94,0.15)", color: "#4ade80", borderColor: "rgba(34,197,94,0.35)" }
                                  : s === "PENDING"
                                  ? { background: "rgba(234,179,8,0.15)", color: "#fbbf24", borderColor: "rgba(234,179,8,0.35)" }
                                  : { background: "rgba(239,68,68,0.15)", color: "#f87171", borderColor: "rgba(239,68,68,0.35)" }
                                : { background: "var(--bg-soft,rgba(0,0,0,0.04))", color: "var(--text-secondary)", borderColor: "var(--border-color)" }
                              }>
                              {s !== "ALL" && (
                                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ background: STATUS_STYLE[s]?.dot || "#888" }} />
                              )}
                              {statusDisplayLabel(s)}
                              <span className="opacity-50 text-[10px]">({counts[s] ?? 0})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ height: "1px", background: "var(--border-color)" }} />
                      {amenityNames.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary mb-2">Amenity</p>
                          <div className="flex flex-wrap gap-1.5">
                            {["ALL", ...amenityNames].map((name) => (
                              <button key={name} type="button" onClick={() => setAmenityFilter(name)}
                                className="flex items-center gap-1 h-7 px-3 rounded-full text-xs font-semibold border"
                                style={amenityFilter === name
                                  ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.35)" }
                                  : { background: "var(--bg-soft,rgba(0,0,0,0.04))", color: "var(--text-secondary)", borderColor: "var(--border-color)" }
                                }>
                                {name !== "ALL" && <span style={{ fontSize: 12 }}>{amenityIcon(name)}</span>}
                                {name === "ALL" ? "All" : name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <button type="button" onClick={clearAllFilters}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}>
                          Clear all
                        </button>
                        <button type="button" onClick={() => setShowFilterPanel(false)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {initialLoad && (
              <div className="flex flex-col items-center gap-3 py-10 text-secondary">
                <Spinner /><p className="text-sm">Loading…</p>
              </div>
            )}

            {!initialLoad && counts.ALL === 0 && (
              <div className="ra-empty">
                <span className="ra-empty-icon">◈</span>
                <p>{t("amenNoBookings")}</p>
              </div>
            )}

            {!initialLoad && counts.ALL > 0 && myBookings.length === 0 && !fetching && (
              <div className="ra-empty">
                <span className="ra-empty-icon">🔍</span>
                <p>No bookings match your filters</p>
                <button type="button" onClick={clearAllFilters}
                  style={{ color: "#60a5fa", background: "none", border: "none", cursor: "pointer", fontSize: 12, marginTop: 6 }}>
                  Clear filters
                </button>
              </div>
            )}

            {!initialLoad && myBookings.map((b, idx) => {
              const isPaymentPending = b.status === "PAYMENT_PENDING";
              const dotColor = STATUS_STYLE[b.status]?.dot || "#64748b";

              return (
                <div key={b.id}
                  onClick={() => !isPaymentPending && openPass(b)}
                  className="ra-booking-row"
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    cursor: isPaymentPending ? "default" : "pointer",
                    ...(isPaymentPending ? {
                      border: "1px solid rgba(139,92,246,0.3)",
                      background: "rgba(139,92,246,0.04)",
                    } : {}),
                  }}>
                  <div className="ra-booking-left">
                    <span className="ra-booking-dot" style={{ background: dotColor }} />
                    <div>
                      <p className="ra-booking-name">{b.Amenity?.name}</p>
                      <p className="ra-booking-date">{formatBookingDate(b.date, b.start_time)}</p>
                      {isPaymentPending && (
                        <PaymentCountdown expiresAt={b.payment_expires_at} />
                      )}
                    </div>
                  </div>

                  <div className="ra-booking-right">
                    {isPaymentPending ? (
                      /* ── PAYMENT_PENDING actions ── */
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                          background: "rgba(139,92,246,0.12)", color: "#a78bfa",
                          border: "1px solid rgba(139,92,246,0.28)",
                        }}>
                          Awaiting Payment
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRepay(b); }}
                            disabled={repayingId === b.id}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                              background: "rgba(139,92,246,0.12)", color: "#a78bfa",
                              border: "1.5px solid rgba(139,92,246,0.35)",
                              cursor: repayingId === b.id ? "not-allowed" : "pointer",
                              opacity: repayingId === b.id ? 0.6 : 1,
                            }}>
                            {repayingId === b.id
                              ? <Spinner small />
                              : <><MdRefresh size={13} /> Pay Now</>
                            }
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); cancelBooking(b.id); }}
                            style={{
                              padding: "6px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                              background: "transparent", color: "var(--text-secondary)",
                              border: "1px solid var(--glass-border)", cursor: "pointer",
                            }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── All other statuses ── */
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                        <span className={statusClass(b.status)} style={{ fontSize: 11 }}>
                          {statusDisplayLabel(b.status)}
                        </span>
                        {["PENDING", "APPROVED"].includes(b.status) && (
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); cancelBooking(b.id); }}
                            className="btn-danger ra-cancel-btn">
                            {t("amenCancelBooking")}
                          </button>
                        )}
                        {b.status === "APPROVED" && (
                          <span className="ra-chevron" style={{ fontSize: 18, color: "var(--text-secondary)" }}>›</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!initialLoad && myBookings.length > 0 && (
              <div className="flex flex-col items-center gap-2 mt-3">
                <p className="text-xs text-secondary">
                  Showing {myBookings.length} of {totalItems}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════
            DATE / SLOT MODAL
        ══════════════════════════════ */}
        {showDateModal && selectedAmenity && (
          <Modal isOpen={showDateModal} onClose={() => { setShowDateModal(false); setPaymentStatus(null); setBookingError(""); }}
            title={`${t("amenReserve")} · ${selectedAmenity.name}`}>
            <div className="ra-modal-inner">

              {/* Payment status feedback inside modal */}
              {paymentStatus === "processing" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }} className="animate-fadeIn">
                  <Spinner />
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Verifying payment…</p>
                </div>
              )}

              {paymentStatus === "success" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0", color: "#22c55e" }} className="animate-fadeIn">
                  <div style={{ fontSize: 40 }}>✅</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Booking Confirmed!</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Redirecting to your bookings…</p>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px",
                  borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  marginBottom: 14,
                }} className="animate-fadeIn">
                  <MdWarning size={15} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>Payment failed</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                      Your slot is held for a few more minutes. Go to My Bookings → Pay Now to retry.
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === "dismissed" && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px",
                  borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                  marginBottom: 14,
                }} className="animate-fadeIn">
                  <MdPayment size={15} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>Payment not completed</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                      Your slot is temporarily reserved. Use the Repay button in My Bookings before the timer runs out.
                    </div>
                  </div>
                </div>
              )}

              {bookingError && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px",
                  borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  marginBottom: 14,
                }}>
                  <MdWarning size={15} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: "#ef4444" }}>{bookingError}</span>
                </div>
              )}

              {!paymentStatus && (
                <>
                  <p className="ra-modal-label">{t("amenSelectDate")}</p>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(d) => setSelectedDate(d)}
                    minDate={new Date()}
                    excludeDates={selectedAmenity.booking_type === "FULL_DAY" ? bookedDates : []}
                    placeholderText={t("amenPickDate")}
                    className="input w-full"
                  />
                  {selectedDate && (
                    <div className="ra-slots-section">
                      <p className="ra-modal-label">
                        {selectedAmenity.booking_type === "FULL_DAY" ? t("amenFullDayBooking") : t("amenAvailableSlots")}
                      </p>
                      {slotsLoading ? (
                        <div className="ra-loading">
                          <span className="ra-spinner" /><span>{t("amenCheckingAvailability")}</span>
                        </div>
                      ) : (
                        <div className="ra-slots-grid">
                          {slots.filter(filterFutureSlots).map((s, i) => (
                            <button key={i} disabled={!s.available || bookingLoading}
                              onClick={() => bookSlot(s.start_time || null)}
                              className={`ra-slot ${s.available && !bookingLoading ? "ra-slot--available" : "ra-slot--taken"}`}>
                              {bookingLoading ? (
                                <Spinner small />
                              ) : selectedAmenity.booking_type === "FULL_DAY" ? (
                                t("amenBookFullDay")
                              ) : (
                                <>
                                  <span className="ra-slot-time">{s.start_time}</span>
                                  <span className="ra-slot-sep">–</span>
                                  <span className="ra-slot-time">{s.end_time}</span>
                                </>
                              )}
                              {!s.available && <span className="ra-slot-taken-label">{t("amenSlotBooked")}</span>}
                              {s.available && selectedAmenity.type === "PAID" && (
                                <span style={{ fontSize: 10, display: "block", marginTop: 2, opacity: 0.7 }}>
                                  ₹{selectedAmenity.rate_per_hour}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Modal>
        )}

        {/* PASS MODAL */}
        {showPassModal && selectedBooking && (
          <Modal isOpen={showPassModal} onClose={() => setShowPassModal(false)}>
            {renderPassContent()}
          </Modal>
        )}
      </div>
    );
  }