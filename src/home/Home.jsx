import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import {
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineChatBubbleLeftRight,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineLockClosed,
  HiOutlineCalculator,
  HiOutlineBuildingStorefront,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineMegaphone,
  HiOutlineCog6Tooth,
  HiOutlineFolder,
  HiOutlineClock,
  HiBars3,
  HiOutlineXMark,
  HiOutlineCube,
  HiOutlineQrCode,
  HiOutlineCheck,
  HiOutlineKey,
  HiOutlineBell,
  HiOutlineCalendar,
  HiOutlineCheckBadge,
  HiOutlineWrenchScrewdriver,
  HiOutlineDocumentText,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineHome
} from "react-icons/hi2";
import { FaWhatsapp, FaFacebookF, FaInstagram, FaXTwitter, FaYoutube, FaLinkedinIn, FaPhone, FaEnvelope, FaCar } from "react-icons/fa6";

/* Image imports from assets/Photos/Home */
import compLogoImg from "../assets/Photos/Home/comp_logo.png";
import homeBannerImg from "../assets/Photos/Home/society-hero-residence.png";
import featuresBgImg from "../assets/Photos/Home/Features.avif";
import howItWorksBgImg from "../assets/Photos/Home/HowItWorks.avif";
import userRolesBgImg from "../assets/Photos/Home/UserRoles.avif";
import adminImg from "../assets/Photos/Home/Admin.png";
import committeeImg from "../assets/Photos/Home/Commitee.jpg";
import residentImg from "../assets/Photos/Home/Resident.png";
import guardImg from "../assets/Photos/Home/Guard.png";
import securityGuardImg from "../assets/Photos/Home/Guard1.png";
import accountantImg from "../assets/Photos/Home/Accountant.png";
import societyHeroCampusImg from "../assets/Photos/Home/society-hero-campus.png";
import securityFeatureImg from "../assets/Photos/Home/features/security.png";
import sosFeatureImg from "../assets/Photos/Home/features/sos.png";
import maintenanceFeatureImg from "../assets/Photos/Home/features/Maintenance.png";
import complaintsFeatureImg from "../assets/Photos/Home/features/complaints.png";
import guardFeatureImg from "../assets/Photos/Home/features/Guard.png";
import guestApprovalFeatureImg from "../assets/Photos/Home/features/guest_approval.png";
import parkingFeatureImg from "../assets/Photos/Home/features/Parking.png";
import visitorLogFeatureImg from "../assets/Photos/Home/features/visitor log.png";
import financeFeatureImg from "../assets/Photos/Home/features/finance.png";

import LanguageSelector from "../components/common/LanguageSelector";
import { useLang } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import "./Home.css";

/* ==========================================================================
   SAFE IMAGE COMPONENT
   Gracefully renders elegant gradient placeholders if image paths do not
   exist physically on disk yet, preventing layout crashes or broken icons.
   ========================================================================== */
const SafeImage = ({ src, alt, className, fallbackGradient, fallbackIcon: Icon, ...props }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`home-image-placeholder ${className || ""}`}
        style={{
          background:
            fallbackGradient ||
            "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        {Icon ? (
          <Icon className="home-placeholder-icon" />
        ) : (
          <HiOutlineBuildingOffice2 className="home-placeholder-icon" />
        )}
        <span className="home-placeholder-text">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

const homeFeatureCards = [
  { image: securityFeatureImg, icon: HiOutlineShieldCheck, tone: "blue", titleKey: "homeFeatureCard1Title", descKey: "homeFeatureCard1Desc" },
  { image: sosFeatureImg, icon: HiOutlineBell, tone: "red", titleKey: "homeFeatureCard2Title", descKey: "homeFeatureCard2Desc" },
  { image: maintenanceFeatureImg, icon: HiOutlineWrenchScrewdriver, tone: "blue", titleKey: "homeFeatureCard3Title", descKey: "homeFeatureCard3Desc" },
  { image: complaintsFeatureImg, icon: HiOutlineChatBubbleLeftRight, tone: "violet", titleKey: "homeFeatureCard4Title", descKey: "homeFeatureCard4Desc" },
  { image: guardFeatureImg, icon: HiOutlineUserGroup, tone: "teal", titleKey: "homeFeatureCard5Title", descKey: "homeFeatureCard5Desc" },
  { image: guestApprovalFeatureImg, icon: HiOutlineCheckBadge, tone: "mint", titleKey: "homeFeatureCard6Title", descKey: "homeFeatureCard6Desc" },
  { image: parkingFeatureImg, icon: FaCar, tone: "blue", titleKey: "homeFeatureCard7Title", descKey: "homeFeatureCard7Desc" },
  { image: visitorLogFeatureImg, icon: HiOutlineFolder, tone: "violet", titleKey: "homeFeatureCard8Title", descKey: "homeFeatureCard8Desc" },
  { image: financeFeatureImg, icon: HiOutlineCalculator, tone: "mint", titleKey: "homeFeatureCard9Title", descKey: "homeFeatureCard9Desc" },
];

/* ==========================================================================
   HOME PAGE REACT COMPONENT
   ========================================================================== */
const Home = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const loggedIn = Boolean(localStorage.getItem("token"));

  const goToApp = () => navigate("/login");
  const prefersReduced = useReducedMotion();

  // Sticky Under-Page Footer Reveal Coordinator (motion.dev Pattern)
  const footerRevealRef = useRef(null);
  const { scrollYProgress: footerProgress } = useScroll({
    target: footerRevealRef,
    offset: ["start end", "end end"]
  });
  const smoothFooterProgress = useSpring(footerProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001
  });
  const footerOpacity = useTransform(smoothFooterProgress, [0, 0.55, 1], [0.35, 0.8, 1]);
  const footerScale = useTransform(smoothFooterProgress, [0, 1], [0.965, 1]);
  const footerY = useTransform(smoothFooterProgress, [0, 1], [30, 0]);

  /* Live Continuous Roles Carousel State & Handlers */
  const rolesTrackRef = useRef(null);
  const offsetRef = useRef(0);
  const targetOffsetRef = useRef(0);
  const isRolesPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Live continuous RAF scroll loop (smooth 60/120fps continuous motion)
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isRolesPausedRef.current && !isDraggingRef.current) {
        // Continuous speed: 75px per second (increased for responsive, lively drift)
        targetOffsetRef.current += 75 * dt;
      }

      if (rolesTrackRef.current) {
        // Smooth lerp towards target offset
        const lerpFactor = isDraggingRef.current ? 1 : Math.min(1, dt * 10);
        offsetRef.current += (targetOffsetRef.current - offsetRef.current) * lerpFactor;

        // Infinite wrap at half-width (seamless duplicate list)
        const halfWidth = rolesTrackRef.current.scrollWidth / 2;
        if (halfWidth > 0) {
          if (targetOffsetRef.current >= halfWidth && offsetRef.current >= halfWidth) {
            targetOffsetRef.current -= halfWidth;
            offsetRef.current -= halfWidth;
          } else if (targetOffsetRef.current < 0 && offsetRef.current < 0) {
            targetOffsetRef.current += halfWidth;
            offsetRef.current += halfWidth;
          }
        }

        rolesTrackRef.current.style.transform = `translate3d(-${offsetRef.current.toFixed(2)}px, 0, 0)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Pause continuous scroll when page is in background
  useEffect(() => {
    const handleVisibility = () => {
      isRolesPausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const nudgeRole = useCallback((direction) => {
    const cardStep = 370 + 22; // card width + gap
    if (direction === "next") {
      targetOffsetRef.current += cardStep;
    } else {
      targetOffsetRef.current -= cardStep;
    }
  }, []);

  const handleRolesMouseDown = (e) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX;
    dragStartOffsetRef.current = targetOffsetRef.current;
  };

  const handleRolesMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const diff = e.pageX - dragStartXRef.current;
    if (Math.abs(diff) > 5) {
      hasDraggedRef.current = true;
    }
    targetOffsetRef.current = dragStartOffsetRef.current - diff;
  };

  const handleRolesMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleRolesTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      dragStartXRef.current = e.touches[0].pageX;
      dragStartOffsetRef.current = targetOffsetRef.current;
    }
  };

  const handleRolesTouchMove = (e) => {
    if (!isDraggingRef.current || !e.touches || !e.touches[0]) return;
    const diff = e.touches[0].pageX - dragStartXRef.current;
    if (Math.abs(diff) > 5) {
      hasDraggedRef.current = true;
    }
    targetOffsetRef.current = dragStartOffsetRef.current - diff;
  };

  useEffect(() => {
    document.documentElement.classList.add("home-page-scroll");
    return () => document.documentElement.classList.remove("home-page-scroll");
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const scrollPos = window.scrollY + 140;
      const sections = ["roles", "how-it-works", "features"];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(id);
          return;
        }
      }
      setActiveSection("home");
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash) {
        const id = window.location.hash.replace("#", "");
        setTimeout(() => scrollToSection(id), 150);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = document.querySelector(".home-navbar");
    const navHeight = nav ? nav.getBoundingClientRect().height : 80;
    const isGlass = element.classList.contains("home-glass-section");
    const offset = isGlass ? 0 : navHeight;
    const top = window.scrollY + element.getBoundingClientRect().top - offset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  const handleMobileNav = (id) => {
    setMenuOpen(false);
    window.setTimeout(() => scrollToSection(id), 80);
  };

  const navItems = [
    { id: "home", label: t("homeNavHome") || "Home" },
    { id: "features", label: t("homeNavFeatures") || "Features" },
    { id: "how-it-works", label: t("homeNavHowItWorks") || "How It Works" },
    { id: "roles", label: t("homeNavUserRoles") || "User Roles" },
  ];

  const handleNavClick = (id) => {
    setActiveSection(id);
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      scrollToSection(id);
    }
  };

  /* Slide transition variant settings matching executive PPT presentation decks */
  const slideVariants = {
    hidden: { opacity: 0, y: 90, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <div className="home-page">
      {/* ==========================================================================
         1. NAVBAR
         ========================================================================== */}
      <header className={`home-navbar ${isDark ? "home-navbar--dark" : "home-navbar--light"} ${scrolled ? "home-navbar--scrolled" : ""} ${menuOpen ? "home-navbar--menu-open" : ""}`} role="banner">
        <div className="home-topbar">
          <div className="home-container home-topbar-inner">
            <div className="home-contact-items">
              <a href="tel:+919000000001" className="home-contact-item"><FaPhone aria-hidden="true" /><span>+91 90000 00001</span></a>
              <span className="home-contact-separator" aria-hidden="true" />
              <a href="mailto:codecraftwt@gmail.com" className="home-contact-item"><FaEnvelope aria-hidden="true" /><span>codecraftwt@gmail.com</span></a>
            </div>
            <div className="home-social-items" aria-label="Connect with Us">
              <span className="home-connect-label">Connect with Us</span>
              <div className="home-social-icons">
                <a href="https://wa.me/919000000001" target="_blank" rel="noopener noreferrer" className="home-social-icon-btn" aria-label="WhatsApp">
                  <FaWhatsapp />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="home-social-icon-btn" aria-label="Facebook">
                  <FaFacebookF />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="home-social-icon-btn" aria-label="X (Twitter)">
                  <FaXTwitter />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="home-social-icon-btn" aria-label="Instagram">
                  <FaInstagram />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="home-mainbar">
          <div className="home-container">
            <div className="home-navbar-inner">
              {/* Dual Brand Identity: Company Logo + Product Branding */}
              <Link to="/" className="home-brand-logo" aria-label={t("homeBrandHomeLabel")}>
                <img
                  src={compLogoImg}
                  alt={t("homeCompanyLogoAlt")}
                  className="home-brand-comp-logo"
                />
                <div className="home-brand-divider" aria-hidden="true" />
                <div className="home-brand-text">
                  <div className="home-brand-title">{t("homeBrandTitle") || "Society Management"}</div>
                  <div className="home-brand-subtitle">{t("homeBrandSubtitle") || "SYSTEM"}</div>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="home-nav-links-wrap" aria-label="Primary navigation">
                <ul className="home-nav-links">
                  {navItems.map((item) => (
                    <li key={item.id} className="home-nav-item">
                      <button
                        type="button"
                        className={`home-nav-link ${activeSection === item.id ? "home-nav-link--active" : ""}`}
                        onClick={() => handleNavClick(item.id)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Nav Right Actions: Language -> Dashboard CTA */}
              <div className="home-nav-actions">
                <LanguageSelector compact />
                <button
                  type="button"
                  onClick={goToApp}
                  className="home-btn-nav-cta"
                  aria-label={t("homeLogin")}
                >
                  <span>{t("homeLogin")}</span>
                  <HiOutlineArrowRight className="home-nav-btn-arrow" />
                </button>
              </div>

              {/* Mobile Burger */}
              <button
                type="button"
                className="home-mobile-burger"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={t("homeToggleMenu")}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <HiOutlineXMark /> : <HiBars3 />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`home-mobile-menu ${menuOpen ? "active" : ""}`} role="dialog" aria-modal="true">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`home-mobile-link ${activeSection === item.id ? "home-mobile-link--active" : ""}`}
              onClick={() => {
                setMenuOpen(false);
                if (item.id === "home") {
                  setActiveSection("home");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  setActiveSection(item.id);
                  handleMobileNav(item.id);
                }
              }}
            >
              {item.label}
            </button>
          ))}

          <div className="home-mobile-divider" />

          <div className="home-mobile-prefs">
            <LanguageSelector compact />
          </div>

          <div className="home-mobile-actions">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); goToApp(); }}
              className="home-btn-nav-cta"
              aria-label={t("homeLogin")}
            >
              <span>{t("homeLogin")}</span>
              <HiOutlineArrowRight className="home-nav-btn-arrow" />
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="home-main-content">
        {/* ==========================================================================
         2. HERO SECTION — Full-Height Cinematic Photographic Banner
         ========================================================================== */}
        <section
          className={`home-hero-banner ${isDark ? "home-hero--dark" : "home-hero--light"}`}
          aria-label="Hero Overview"
        >
          {/* Authentic residential society background image */}
          <div className="home-hero-bg-layer" aria-hidden="true">
            <img
              src={homeBannerImg}
              alt=""
              className="home-hero-bg-image"
              loading="eager"
            />
          </div>

              <div className="home-container home-hero-content-wrap">
                <div className="home-hero-content">
                  {/* Eyebrow Label with Elastic Spring Drop-In Animation */}
                  <motion.div
                    initial={{ opacity: 0, y: -24, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.65, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                    className="home-hero-eyebrow"
                  >
                    <span className="home-hero-eyebrow-dot" aria-hidden="true" />
                    <span>{t("homeLandingEyebrow") || "SMARTER COMMUNITY LIVING"}</span>
                  </motion.div>

                  {/* Main Headline with Kinetic Left-to-Right Horizontal Slide Reveal */}
                  <h1 className="home-hero-heading">
                    <motion.span
                      className="home-hero-heading-line1"
                      initial={{ opacity: 0, x: -45, filter: "blur(6px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.8, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {t("homeLandingTitle1") || "Your Society."}
                    </motion.span>
                    <motion.span
                      className="home-hero-heading-line2"
                      initial={{ opacity: 0, x: -45, filter: "blur(6px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.85, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {t("homeLandingTitle2") || "Managed Smarter."}
                    </motion.span>
                  </h1>

                  {/* Supporting Description with Kinetic Slide-In */}
                  <motion.p
                    initial={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.75, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
                    className="home-hero-description"
                  >
                    {t("homeLandingDescription") || "Everything your community needs to run smoothly. Manage residents, maintenance, payments, security, parking and everyday operations from one intelligent platform."}
                  </motion.p>

                  {/* Action Buttons with Staggered Spring Elasticity */}
                  <div className="home-hero-cta-group">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.88, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: 0.72, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={{ scale: 1.04, translateY: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={goToApp}
                      className="home-btn-hero-primary"
                      aria-label={t("homeExploreDashboard") || "Explore Dashboard"}
                    >
                      <span>{t("homeExploreDashboard") || "Explore Dashboard"}</span>
                      <HiOutlineArrowRight className="home-btn-arrow-icon" aria-hidden="true" />
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, scale: 0.88, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: 0.84, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={{ scale: 1.04, translateY: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => scrollToSection("features")}
                      className="home-btn-hero-secondary"
                      aria-label={t("homeExploreFeatures") || "Explore Features"}
                    >
                      <span>{t("homeExploreFeatures") || "Explore Features"}</span>
                      <HiOutlineArrowRight className="home-btn-arrow-icon" aria-hidden="true" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </section>

        {/* ==========================================================================
         3. FEATURES SHOWCASE
         ========================================================================== */}
        <section
          id="features"
          className="home-features-section"
        >
          {/* Ambient Background Atmosphere */}
          <div className="home-features-bg-effects" aria-hidden="true">
            <div className="home-features-bg-grid" />
            <div className="home-features-glow-left" />
            <div className="home-features-glow-right" />
          </div>

          <div className="home-container home-features-container">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="home-features-header"
            >
              <div className="home-features-eyebrow">
                <HiOutlineShieldCheck className="home-features-eyebrow-icon" />
                <span>POWERFUL FEATURES</span>
              </div>
              <h2 className="home-features-title">
                Everything Your Community <span>Needs.</span>
              </h2>
              <p className="home-features-subtitle">
                Everything you need to manage your society, all in one place.
              </p>
            </motion.div>

            {/* Premium 3x3 photographic feature grid */}
            <div className="home-features-grid">
              {homeFeatureCards.map(({ image, icon: Icon, tone, titleKey, descKey }, index) => {
                const title = t(titleKey);
                return (
                  <motion.article
                    key={title}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className={`home-feature-card home-feature-card--${tone}`}
                  >
                    <div className="home-feature-card-image-wrap">
                      <img src={image} alt={title} className="home-feature-card-image" />
                    </div>
                    <div className="home-feature-card-content">
                      <div className="home-feature-card-icon-wrap"><Icon aria-hidden="true" /></div>
                      <h3 className="home-feature-card-title">{title}</h3>
                      <p className="home-feature-card-desc">{t(descKey)}</p>
                    </div>
                  </motion.article>
                );
              })}
            </div>

          </div>
        </section>

        {/* ==========================================================================
         4. A SMARTER COMMUNITY / HOW IT WORKS SHOWCASE
         ========================================================================== */}
        <section
          id="how-it-works"
          className="home-smarter-section"
        >
          {/* Decorative background accents */}
          <div className="home-smarter-bg-accents" aria-hidden="true">
            <div className="home-smarter-dots" />
            <div className="home-smarter-accent-top-left" />
            <div className="home-smarter-accent-mint" />
            <div className="home-smarter-accent-peach" />
          </div>

          <div className="home-smarter-container">
            <div className="home-smarter-layout">
              {/* Left Column: Two Image Composition with Scroll-Driven Parallax Sliding */}
              <div className="home-smarter-visual">
                <div className="home-smarter-composition">
                  {/* Big Banner Image */}
                  <motion.div
                    initial={{ opacity: 0, x: -55 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.015 }}
                    className="home-smarter-big-img-box"
                  >
                    <SafeImage
                      src={homeBannerImg}
                      alt={t("homeAltHero") || "Residential Community"}
                      className="home-smarter-big-img"
                      fallbackIcon={HiOutlineBuildingOffice2}
                    />
                  </motion.div>

                  {/* Small Guard Image */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.02 }}
                    className="home-smarter-small-img-box"
                  >
                    <SafeImage
                      src={guardImg}
                      alt={t("homeAltAdmin") || "Society Security Guard"}
                      className="home-smarter-small-img"
                      fallbackIcon={HiOutlineUsers}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Right Column: Content slider gently from right to left */}
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="home-smarter-content"
              >
                {/* Pill Badge: Our Society */}
                <div className="home-smarter-badge">
                  <HiOutlineBuildingOffice2 className="home-smarter-badge-icon" aria-hidden="true" />
                  <span>{t("homeOurSocietyBadge") || "Our Society"}</span>
                </div>

                {/* Heading */}
                <h2 className="home-smarter-title">
                  {t("homeSmarterCommunityTitle1") || "A Smarter Community"}
                  <span className="home-smarter-break">
                    {t("homeSmarterCommunityForA") || "for a"}{" "}
                    <span className="home-smarter-blue-text">
                      {t("homeSmarterCommunityTitle2") || "Better Living"}
                      <svg
                        className="home-smarter-curve-svg"
                        viewBox="0 0 160 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M 3 9.5 C 45 2.5, 115 2.5, 157 8"
                          stroke="#2563EB"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </span>
                </h2>

                {/* Short Description */}
                <p className="home-smarter-desc">
                  {t("homeSmarterCommunitySubtitle") ||
                    "Modern society management with safety, transparency and convenience — all in one place."}
                </p>

                {/* 6 Neatly Aligned Features */}
                <div className="home-smarter-features-grid">
                  {[
                    {
                      icon: HiOutlineShieldCheck,
                      type: "mint",
                      labelKey: "homeFeatureEnhancedSecurity",
                      defaultText: "Enhanced Security"
                    },
                    {
                      icon: FaCar,
                      type: "neutral",
                      labelKey: "homeFeatureSmartParking",
                      defaultText: "Smart Parking"
                    },
                    {
                      icon: HiOutlineUserGroup,
                      type: "mint-soft",
                      labelKey: "homeFeatureCommunityEngagement",
                      defaultText: "Community Engagement"
                    },
                    {
                      icon: HiOutlineBell,
                      type: "cream",
                      labelKey: "homeFeatureInstantNotifications",
                      defaultText: "Instant Notifications"
                    },
                    {
                      icon: HiOutlineWrenchScrewdriver,
                      type: "blue",
                      labelKey: "homeFeatureEasyMaintenance",
                      defaultText: "Easy Maintenance"
                    },
                    {
                      icon: HiOutlineDocumentText,
                      type: "cream-alt",
                      labelKey: "homeFeatureTransparentManagement",
                      defaultText: "Transparent Management"
                    }
                  ].map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.85, delay: 0.35 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="home-smarter-feature-item"
                      >
                        <div className={`home-smarter-icon-box home-smarter-icon--${feat.type}`}>
                          <FeatIcon aria-hidden="true" />
                        </div>
                        <div className="home-smarter-feature-text">
                          <span>{t(feat.labelKey) || feat.defaultText}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Primary Pill Button */}
                <div className="home-smarter-action">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="home-smarter-cta-btn"
                  >
                    <span>{t("homeBeAPartBtn") || "Be a Part of Our Society"}</span>
                    <HiOutlineArrowRight className="home-smarter-cta-arrow" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==========================================================================
         6. ROLE SECTION (PROFESSIONAL SAAS HORIZONTAL CAROUSEL)
         ========================================================================== */}
        <section
          id="roles"
          className="home-roles-section"
        >
          <div className="home-container">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4 }}
              className="home-section-header home-roles-header"
            >
              <h2 className="home-section-title">
                {t("homeSection3Title")}
              </h2>
            </motion.div>

            {/* Horizontal Carousel with Flanking Arrows & Live Continuous Drift */}
            <div
              className="home-roles-carousel-wrapper"
              onMouseEnter={() => {
                isRolesPausedRef.current = true;
              }}
              onMouseLeave={() => {
                isRolesPausedRef.current = false;
                handleRolesMouseUpOrLeave();
              }}
            >
              {/* Prev Navigation Arrow */}
              <button
                type="button"
                className="home-roles-nav-btn home-roles-nav-btn--prev"
                onClick={() => nudgeRole("prev")}
                aria-label="Previous role"
              >
                <HiOutlineChevronLeft />
              </button>

              {/* Live Continuous Streaming Track */}
              <div
                ref={rolesTrackRef}
                className="home-roles-track"
                onMouseDown={handleRolesMouseDown}
                onMouseMove={handleRolesMouseMove}
                onMouseUp={handleRolesMouseUpOrLeave}
                onTouchStart={(e) => {
                  isRolesPausedRef.current = true;
                  handleRolesTouchStart(e);
                }}
                onTouchMove={handleRolesTouchMove}
                onTouchEnd={() => {
                  isRolesPausedRef.current = false;
                  handleRolesMouseUpOrLeave();
                }}
              >
                {(() => {
                  const baseRoles = [
                    {
                      img: adminImg,
                      icon: HiOutlineBriefcase,
                      title: t("homeRole1Title"),
                      desc: t("homeRole1Desc"),
                      accent: "blue"
                    },
                    {
                      img: committeeImg,
                      icon: HiOutlineUserGroup,
                      title: t("homeRole2Title"),
                      desc: t("homeRole2Desc"),
                      accent: "purple"
                    },
                    {
                      img: residentImg,
                      icon: HiOutlineHome,
                      title: t("homeRole3Title"),
                      desc: t("homeRole3Desc"),
                      accent: "orange"
                    },
                    {
                      img: securityGuardImg,
                      icon: HiOutlineLockClosed,
                      title: t("homeRole4Title"),
                      desc: t("homeRole4Desc"),
                      accent: "teal"
                    },
                    {
                      img: accountantImg,
                      icon: HiOutlineCalculator,
                      title: t("homeRole5Title"),
                      desc: t("homeRole5Desc"),
                      accent: "indigo"
                    },
                    {
                      img: societyHeroCampusImg,
                      icon: HiOutlineBuildingStorefront,
                      title: t("homeRole6Title"),
                      desc: t("homeRole6Desc"),
                      accent: "emerald"
                    }
                  ];
                  // Duplicate for continuous infinite flow
                  return [...baseRoles, ...baseRoles].map((role, rIdx) => {
                    const RoleIcon = role.icon;
                    return (
                      <div
                        key={rIdx}
                        className={`home-role-card-pro home-role-card-pro--${role.accent}`}
                        onClick={() => {
                          if (!hasDraggedRef.current) {
                            goToApp();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goToApp();
                          }
                        }}
                      >
                        {/* Top Role Media */}
                        <div className="home-role-card-media">
                          <SafeImage
                            src={role.img}
                            alt={role.title}
                            className="home-role-card-img"
                            fallbackIcon={RoleIcon}
                          />
                        </div>

                        {/* Card Content */}
                        <div className="home-role-card-body">
                          <div className="home-role-card-header">
                            <h3 className="home-role-card-title">{role.title}</h3>
                            <span className="home-role-card-icon-chip">
                              <RoleIcon className="home-role-card-icon" aria-hidden="true" />
                            </span>
                          </div>
                          <p className="home-role-card-desc">{role.desc}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Next Navigation Arrow */}
              <button
                type="button"
                className="home-roles-nav-btn home-roles-nav-btn--next"
                onClick={() => nudgeRole("next")}
                aria-label="Next role"
              >
                <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        </section>

        {/* ==========================================================================
         7. CALL TO ACTION (CTA) BANNER (PREMIUM ENTERPRISE SAAS SHOWCASE)
         ========================================================================== */}
        <section
          className="home-cta-section"
        >
          <div className="home-container">
            <div className="home-cta-banner">
              <SafeImage
                src={homeBannerImg}
                alt={t("homeAltCta")}
                className="home-cta-bg-image"
                fallbackIcon={HiOutlineBuildingOffice2}
              />

              <div className="home-cta-content">
                <div className="home-cta-badge">
                  <HiOutlineSparkles className="home-cta-sparkle-icon" />
                  <span>{t("homeCtaBadge")}</span>
                </div>

                <h2 className="home-cta-title">
                  {t("homeCtaTitle1")} <br />
                  <span className="home-cta-title-accent">{t("homeCtaTitle2")}</span>
                </h2>

                <p className="home-cta-subtitle">
                  {t("homeCtaSubtitle")}
                </p>

                <div className="home-cta-features-strip">
                  <div className="home-cta-feature-chip">
                    <HiOutlineCheckCircle className="home-cta-chip-icon" />
                    <span>{t("homeCtaPill1")}</span>
                  </div>
                  <div className="home-cta-feature-chip">
                    <HiOutlineCheckCircle className="home-cta-chip-icon" />
                    <span>{t("homeCtaPill2")}</span>
                  </div>
                  <div className="home-cta-feature-chip">
                    <HiOutlineCheckCircle className="home-cta-chip-icon" />
                    <span>{t("homeCtaPill3")}</span>
                  </div>
                </div>

                <div className="home-cta-buttons">
                  <button
                    onClick={goToApp}
                    className="home-cta-btn-primary"
                  >
                    <span>{loggedIn ? t("homeDashboard") : t("homeGetStartedNow")}</span>
                    <HiOutlineArrowRight className="home-cta-arrow" />
                  </button>

                  <button
                    onClick={() => scrollToSection("features")}
                    className="home-cta-btn-glass"
                  >
                    <span>{t("homeExplore")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================================================
         8. FOOTER SECTION — Sticky Under-Page Reveal (motion.dev Pattern)
         ========================================================================== */}
      <div ref={footerRevealRef} className="home-footer-reveal-container">
        <motion.footer
          style={{
            opacity: prefersReduced ? 1 : footerOpacity,
            scale: prefersReduced ? 1 : footerScale,
            y: prefersReduced ? 0 : footerY
          }}
          className="home-footer"
        >
          <div className="home-footer-bg" aria-hidden="true">
            <img src={homeBannerImg} alt="" />
          </div>
          <div className="home-footer-frost" aria-hidden="true" />
          <div className="home-container">
            <div className="home-footer-grid">
              {/* Col 1: Company Info */}
              <div className="home-footer-brand">
                <Link to="/" className="home-footer-logo">
                  <div className="home-brand-icon-box" style={{ width: 36, height: 36, fontSize: "1.1rem" }}>
                    <HiOutlineBuildingOffice2 />
                  </div>
                  <span>{t("homeFooterBrand")}</span>
                </Link>
                <p className="home-footer-desc">
                  {t("homeHeroSubtitle")}
                </p>
              </div>

              {/* Col 2: Product */}
              <div>
                <h4 className="home-footer-col-title">{t("homeFooterProduct")}</h4>
                <ul className="home-footer-links">
                  <li><span className="home-footer-link" onClick={() => scrollToSection("features")}>{t("homeNavFeatures")}</span></li>
                  <li><Link to="/login" className="home-footer-link">{t("homeFooterResidentPortal")}</Link></li>
                  <li><Link to="/login" className="home-footer-link">{t("homeFooterAdminDashboard")}</Link></li>
                  <li><Link to="/login" className="home-footer-link">{t("homeFooterSecurityApp")}</Link></li>
                  <li><Link to="/login" className="home-footer-link">{t("homeFooterAccountantPortal")}</Link></li>
                </ul>
              </div>

              {/* Col 3: Company */}
              <div>
                <h4 className="home-footer-col-title">{t("homeFooterCompany")}</h4>
                <ul className="home-footer-links">
                  <li><span className="home-footer-link" onClick={() => scrollToSection("roles")}>{t("homeFooterAboutUs")}</span></li>
                  <li><span className="home-footer-link" onClick={() => scrollToSection("how-it-works")}>{t("homeNavHowItWorks")}</span></li>
                  <li><Link to="/login" className="home-footer-link">{t("homeFooterCareers")}</Link></li>
                  <li><Link to="/login" className="home-footer-link">{t("homeFooterContactUs")}</Link></li>
                </ul>
              </div>

              {/* Col 4: Legal */}
              <div>
                <h4 className="home-footer-col-title">{t("homeFooterLegal")}</h4>
                <ul className="home-footer-links">
                  <li><Link to="/privacy-policy" className="home-footer-link">{t("homeFooterPrivacy")}</Link></li>
                  <li><Link to="/terms-of-service" className="home-footer-link">{t("homeFooterTerms")}</Link></li>
                  <li><Link to="/security-policy" className="home-footer-link">{t("homeFooterSecurityPolicy")}</Link></li>
                  <li><Link to="/cookie-policy" className="home-footer-link">{t("homeFooterCookie")}</Link></li>
                </ul>
              </div>
            </div>

            {/* Footer Bottom Bar */}
            <div className="home-footer-bottom">
              <span>© {new Date().getFullYear()} {t("homeFooterBrand")}. {t("homeFooterRights")}.</span>
              <div className="home-social-links">
                <a href="#youtube" className="home-social-icon" aria-label="YouTube"><FaYoutube /></a>
                <a href="#facebook" className="home-social-icon" aria-label="Facebook"><FaFacebookF /></a>
                <a href="#instagram" className="home-social-icon" aria-label="Instagram"><FaInstagram /></a>
                <a href="#linkedin" className="home-social-icon" aria-label="LinkedIn"><FaLinkedinIn /></a>
              </div>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Home;
