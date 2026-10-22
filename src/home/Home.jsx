import { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  HiOutlineUser,
  HiOutlineCube,
  HiOutlineQrCode,
  HiOutlineCheck,
  HiOutlineKey,
  HiOutlineBell,
  HiOutlineCalendar,
  HiOutlineCheckBadge,
  HiOutlineWrenchScrewdriver
} from "react-icons/hi2";
import { FaYoutube, FaFacebookF, FaInstagram, FaLinkedinIn, FaCar } from "react-icons/fa";

/* Image imports from assets/Photos/Home */
import compLogoImg from "../assets/Photos/Home/comp_logo.png";
import homeBannerImg from "../assets/Photos/Home/society-hero-residence.jpg";
import featuresBgImg from "../assets/Photos/Home/Features.avif";
import howItWorksBgImg from "../assets/Photos/Home/HowItWorks.avif";
import userRolesBgImg from "../assets/Photos/Home/UserRoles.avif";
import adminImg from "../assets/Photos/Home/Admin.png";
import committeeImg from "../assets/Photos/Home/Commitee.jpg";
import residentImg from "../assets/Photos/Home/Resident.png";
import guardImg from "../assets/Photos/Home/Guard.png";
import securityGuardImg from "../assets/Photos/Home/Guard1.png";
import accountantImg from "../assets/Photos/Home/Accountant.png";

import ThemeToggle from "../components/common/ThemeToggle";
import LanguageSelector from "../components/common/LanguageSelector";
import { useLang } from "../context/LanguageContext";
import { AuthContext } from "../context/AuthContext";
import { getDashboardPath } from "../constants/app";
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

/* ==========================================================================
   HOME PAGE REACT COMPONENT
   ========================================================================== */
const Home = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loggedIn = Boolean(user && localStorage.getItem("token"));
  const dashboardPath = getDashboardPath(user);

  const goToApp = () => navigate(loggedIn ? dashboardPath : "/login");

  useEffect(() => {
    document.documentElement.classList.add("home-page-scroll");
    return () => document.documentElement.classList.remove("home-page-scroll");
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      <nav className={`home-navbar ${scrolled ? "home-navbar--scrolled" : "home-navbar--over-hero"} ${menuOpen ? "home-navbar--menu-open" : ""}`}>
        <div className="home-container">
          <div className="home-navbar-inner">
            {/* Dual Brand Identity: Company Logo + Product Branding */}
            <Link to="/" className="home-brand-logo" aria-label="Society Management Home">
              <img
                src={compLogoImg}
                alt="WK Company Logo"
                className="home-brand-comp-logo"
              />
              <div className="home-brand-divider" aria-hidden="true" />
              <div className="home-brand-text">
                <div className="home-brand-title">{t("homeBrandTitle") || "Society Management"}</div>
                <div className="home-brand-subtitle">{t("homeBrandSubtitle") || "SYSTEM"}</div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <ul className="home-nav-links">
              <li className="home-nav-item">
                <span className="home-nav-link" onClick={() => scrollToSection("features")}>
                  {t("homeNavFeatures")}
                </span>
              </li>
              <li className="home-nav-item">
                <span className="home-nav-link" onClick={() => scrollToSection("how-it-works")}>
                  {t("homeNavHowItWorks")}
                </span>
              </li>
              <li className="home-nav-item">
                <span className="home-nav-link" onClick={() => scrollToSection("roles")}>
                  {t("homeNavUserRoles")}
                </span>
              </li>
            </ul>

            {/* Nav Right Actions: Language -> Dashboard CTA -> Theme */}
            <div className="home-nav-actions">
              <LanguageSelector compact />
              <button
                onClick={goToApp}
                className="home-btn-nav-cta"
                aria-label="Dashboard"
              >
                <span>{loggedIn ? t("homeDashboard") : "Dashboard"}</span>
                <HiOutlineArrowRight className="home-nav-btn-arrow" />
              </button>
              <div className="home-nav-theme-toggle">
                <ThemeToggle />
              </div>
            </div>

            {/* Mobile Burger */}
            <button
              className="home-mobile-burger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <HiOutlineXMark /> : <HiBars3 />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`home-mobile-menu ${menuOpen ? "active" : ""}`}>
          <span className="home-mobile-link" onClick={() => handleMobileNav("features")}>
            {t("homeNavFeatures")}
          </span>
          <span className="home-mobile-link" onClick={() => handleMobileNav("how-it-works")}>
            {t("homeNavHowItWorks")}
          </span>
          <span className="home-mobile-link" onClick={() => handleMobileNav("roles")}>
            {t("homeNavUserRoles")}
          </span>

          <div className="home-mobile-divider" />

          <div className="home-mobile-prefs">
            <div className="home-nav-theme-toggle">
              <ThemeToggle />
            </div>
            <LanguageSelector compact />
          </div>

          <div className="home-mobile-actions">
            <button
              onClick={() => { setMenuOpen(false); goToApp(); }}
              className="home-btn-nav-cta"
            >
              <span>{loggedIn ? t("homeDashboard") : "Dashboard"}</span>
              <HiOutlineArrowRight className="home-nav-btn-arrow" />
            </button>
            {!loggedIn && (
              <button
                onClick={() => { setMenuOpen(false); navigate("/login"); }}
                className="home-btn-login"
              >
                {t("homeLogin")}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* ==========================================================================
         2. HERO SECTION — Two-Column Layout Matching Premium Design Reference
         ========================================================================== */}
        <section className="home-hero-section">
          {/* Ambient Background Atmosphere & Subtle Architectural Grid */}
          <div className="home-hero-bg-effects" aria-hidden="true">
            <div className="home-hero-bg-grid" />
            <div className="home-hero-glow-left" />
            <div className="home-hero-glow-right" />
            <div className="home-hero-glow-center" />
          </div>

          <div className="home-container home-hero-container">
            <div className="home-hero-grid">
              {/* Left Column: Slide-in from LEFT with staggered child reveals */}
              <motion.div
                initial={{ opacity: 0, x: -70 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="home-hero-left"
              >
                {/* 1. Eyebrow Pill */}
                <motion.div
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="home-hero-eyebrow"
                >
                  <HiOutlineBuildingOffice2 className="home-hero-eyebrow-icon" />
                  <span>SMARTER COMMUNITY LIVING</span>
                </motion.div>

                {/* 2. Main Editorial Headline */}
                <motion.h1
                  initial={{ opacity: 0, x: -45 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="home-hero-heading"
                >
                  <span className="home-hero-heading-solid">Your Society.</span>
                  <br />
                  <span className="home-hero-heading-gradient">Simplified.</span>
                </motion.h1>

                {/* 3. Supporting Description */}
                <motion.p
                  initial={{ opacity: 0, x: -35 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="home-hero-description"
                >
                  One connected platform to manage residents, properties, parking, security, maintenance, finances and everyday community operations.
                </motion.p>

                {/* 4. Primary & Secondary CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, x: -25, y: 15 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="home-hero-cta-group"
                >
                  <button
                    onClick={goToApp}
                    className="home-btn-hero-primary"
                  >
                    <span>Explore Dashboard</span>
                    <HiOutlineArrowRight className="home-btn-arrow-icon" />
                  </button>

                  <button
                    onClick={() => scrollToSection("features")}
                    className="home-btn-hero-secondary"
                  >
                    <span>Explore Features</span>
                    <HiOutlineArrowRight className="home-btn-arrow-icon" />
                  </button>
                </motion.div>

                {/* 5. Unified Information Area: Roles & Benefit Highlights */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="home-hero-info-section"
                >
                  {/* Community-Role Indicator */}
                  <div className="home-hero-roles-bar">
                    <div className="home-hero-roles-icons">
                      <div className="home-hero-role-item" title="Residents">
                        <div className="home-hero-role-circle">
                          <HiOutlineUser />
                        </div>
                        <span className="home-hero-role-name">Residents</span>
                      </div>

                      <div className="home-hero-role-item" title="Security">
                        <div className="home-hero-role-circle">
                          <HiOutlineShieldCheck />
                        </div>
                        <span className="home-hero-role-name">Security</span>
                      </div>

                      <div className="home-hero-role-item" title="Committee">
                        <div className="home-hero-role-circle">
                          <HiOutlineUserGroup />
                        </div>
                        <span className="home-hero-role-name">Committee</span>
                      </div>

                      <div className="home-hero-role-item" title="Admin">
                        <div className="home-hero-role-circle">
                          <HiOutlineCog6Tooth />
                        </div>
                        <span className="home-hero-role-name">Admin</span>
                      </div>
                    </div>

                    <div className="home-hero-roles-divider" aria-hidden="true" />

                    <div className="home-hero-roles-info">
                      <div className="home-hero-roles-title">Built for every community role</div>
                      <div className="home-hero-roles-subtitle">One simple, connected platform.</div>
                    </div>
                  </div>

                  {/* Compact Benefit Strip */}
                  <div className="home-hero-feature-strip">
                    <div className="home-feature-strip-cell">
                      <div className="home-feature-strip-icon-box">
                        <HiOutlineShieldCheck />
                      </div>
                      <div className="home-feature-strip-details">
                        <div className="home-feature-strip-title">Smart Gate Security</div>
                        <div className="home-feature-strip-desc">Safer communities</div>
                      </div>
                    </div>

                    <div className="home-feature-strip-sep" aria-hidden="true" />

                    <div className="home-feature-strip-cell">
                      <div className="home-feature-strip-icon-box">
                        <span className="home-currency-symbol">₹</span>
                      </div>
                      <div className="home-feature-strip-details">
                        <div className="home-feature-strip-title">Finance &amp; Maintenance</div>
                        <div className="home-feature-strip-desc">Stay in control</div>
                      </div>
                    </div>

                    <div className="home-feature-strip-sep" aria-hidden="true" />

                    <div className="home-feature-strip-cell">
                      <div className="home-feature-strip-icon-box">
                        <HiOutlineUsers />
                      </div>
                      <div className="home-feature-strip-details">
                        <div className="home-feature-strip-title">Resident Experience</div>
                        <div className="home-feature-strip-desc">A better tomorrow</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column: Slide-in from RIGHT with Scale & Elevation */}
              <motion.div
                initial={{ opacity: 0, x: 80, scale: 0.93 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="home-hero-right"
              >
                {/* Visual Wrap with Ambient Glow Halo */}
                <div className="home-hero-photo-wrap">
                  <div className="home-hero-photo-glow" aria-hidden="true" />

                  {/* Main Photograph Frame */}
                  <div className="home-hero-photo-frame">
                    <SafeImage
                      src={homeBannerImg}
                      alt="Contemporary Luxury Residential Community"
                      className="home-hero-photo"
                      fallbackIcon={HiOutlineBuildingOffice2}
                      fallbackGradient="linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)"
                    />

                    {/* Top-Left Pill on Image */}
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      className="home-hero-img-badge"
                    >
                      <div className="home-hero-img-badge-icon">
                        <HiOutlineBuildingOffice2 />
                      </div>
                      <span>COMMUNITY AT A GLANCE</span>
                    </motion.div>
                  </div>

                  {/* Floating Overlay: Platform Status */}
                  <motion.div
                    initial={{ opacity: 0, y: 25, x: 20, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="home-floating-card-status"
                  >
                    <span className="home-status-indicator-dot" />
                    <div className="home-status-meta">
                      <div className="home-status-title">Smart Society Platform</div>
                      <div className="home-status-subtitle">Security and operations, connected 24/7</div>
                    </div>
                    <HiOutlineArrowRight className="home-status-arrow" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==========================================================================
         3. FEATURES SHOWCASE — Premium, Minimal & Modern Asymmetrical Bento Grid
         ========================================================================== */}
        <section className="home-features-section" id="features">
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
                <HiOutlineSparkles className="home-features-eyebrow-icon" />
                <span>{t("homeFeaturesEyebrow") || "WHAT MAKES US DIFFERENT"}</span>
              </div>
              <h2 className="home-features-title">
                {t("homeFeaturesTitle") || "Everything Your Community Needs."}
              </h2>
              <p className="home-features-subtitle">
                {t("homeFeaturesSubtitle") || "Simplify everyday operations, bring transparency to management, and create a better living experience — all in one connected platform."}
              </p>
            </motion.div>

            {/* Clean 3x2 Feature Grid — Modern, Stylish, High-End */}
            <div className="home-features-grid">
              {/* Card 01 */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="home-feature-card home-feature-card--blue"
              >
                <div className="home-feature-card-header">
                  <div className="home-feature-card-icon-wrap">
                    <HiOutlineBuildingOffice2 />
                  </div>
                  <span className="home-feature-tag">PORTAL</span>
                </div>
                <h3 className="home-feature-card-title">Your Community, Your Portal</h3>
                <p className="home-feature-card-desc">
                  A dedicated digital home for your society, with secure access and organized community information.
                </p>
                <div className="home-feature-card-footer">
                  <span className="home-feature-chip">
                    <HiOutlineCheckCircle className="home-feature-chip-icon" /> Verified Society Gateway
                  </span>
                  <HiOutlineArrowRight className="home-feature-arrow" />
                </div>
              </motion.div>

              {/* Card 02 */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="home-feature-card home-feature-card--teal"
              >
                <div className="home-feature-card-header">
                  <div className="home-feature-card-icon-wrap">
                    <HiOutlineCog6Tooth />
                  </div>
                  <span className="home-feature-tag">AUTOMATION</span>
                </div>
                <h3 className="home-feature-card-title">Smarter Everyday Operations</h3>
                <p className="home-feature-card-desc">
                  Simplify billing, reminders, maintenance workflows, and repetitive administrative tasks.
                </p>
                <div className="home-feature-card-footer">
                  <span className="home-feature-chip">
                    <HiOutlineCheckCircle className="home-feature-chip-icon" /> Zero Manual Overhead
                  </span>
                  <HiOutlineArrowRight className="home-feature-arrow" />
                </div>
              </motion.div>

              {/* Card 03 */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="home-feature-card home-feature-card--violet"
              >
                <div className="home-feature-card-header">
                  <div className="home-feature-card-icon-wrap">
                    <HiOutlineMegaphone />
                  </div>
                  <span className="home-feature-tag">NOTICES</span>
                </div>
                <h3 className="home-feature-card-title">Connected Community</h3>
                <p className="home-feature-card-desc">
                  Share notices, announcements, events, and updates that keep everyone informed.
                </p>
                <div className="home-feature-card-footer">
                  <span className="home-feature-chip">
                    <HiOutlineCheckCircle className="home-feature-chip-icon" /> Instant Member Broadcast
                  </span>
                  <HiOutlineArrowRight className="home-feature-arrow" />
                </div>
              </motion.div>

              {/* Card 04 */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="home-feature-card home-feature-card--cyan"
              >
                <div className="home-feature-card-header">
                  <div className="home-feature-card-icon-wrap">
                    <HiOutlineShieldCheck />
                  </div>
                  <span className="home-feature-tag">SECURITY</span>
                </div>
                <h3 className="home-feature-card-title">Access with Confidence</h3>
                <p className="home-feature-card-desc">
                  Give residents, administrators, committee members, accountants, and staff the right level of access.
                </p>
                <div className="home-feature-card-footer">
                  <span className="home-feature-chip">
                    <HiOutlineCheckCircle className="home-feature-chip-icon" /> Role-Based Permissions
                  </span>
                  <HiOutlineArrowRight className="home-feature-arrow" />
                </div>
              </motion.div>

              {/* Card 05 */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="home-feature-card home-feature-card--mint"
              >
                <div className="home-feature-card-header">
                  <div className="home-feature-card-icon-wrap">
                    <HiOutlineCreditCard />
                  </div>
                  <span className="home-feature-tag">PAYMENTS</span>
                </div>
                <h3 className="home-feature-card-title">Seamless Maintenance Payments</h3>
                <p className="home-feature-card-desc">
                  Manage maintenance dues, online payments, receipts, and reminders in one convenient place.
                </p>
                <div className="home-feature-card-footer">
                  <span className="home-feature-chip">
                    <HiOutlineCheckCircle className="home-feature-chip-icon" /> Direct Bank Settlement
                  </span>
                  <HiOutlineArrowRight className="home-feature-arrow" />
                </div>
              </motion.div>

              {/* Card 06 */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="home-feature-card home-feature-card--amber"
              >
                <div className="home-feature-card-header">
                  <div className="home-feature-card-icon-wrap">
                    <HiOutlineSparkles />
                  </div>
                  <span className="home-feature-tag">SERVICES</span>
                </div>
                <h3 className="home-feature-card-title">A Better Resident Experience</h3>
                <p className="home-feature-card-desc">
                  Make everyday living easier with complaint requests, amenity bookings, and convenient resident services.
                </p>
                <div className="home-feature-card-footer">
                  <span className="home-feature-chip">
                    <HiOutlineCheckCircle className="home-feature-chip-icon" /> 1-Tap Service Requests
                  </span>
                  <HiOutlineArrowRight className="home-feature-arrow" />
                </div>
              </motion.div>
            </div>

            {/* Pill Banner under grid matching reference image */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="home-features-pill-row"
            >
              <div className="home-features-pill-banner">
                <span className="home-features-pill-icon-wrap">
                  <HiOutlineSparkles className="home-features-pill-icon" />
                </span>
                <span className="home-features-pill-text">
                  One connected platform for properties, people, security, and everyday operations
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ==========================================================================
         4. EFFICIENT ADMINISTRATION SHOWCASE (Multi-Language Supported)
         ========================================================================== */}
        <section className="home-admin-section home-glass-section" id="how-it-works">
          <div className="home-glass-bg" aria-hidden="true">
            <img src={howItWorksBgImg} alt="" />
          </div>
          <div className="home-glass-frost" aria-hidden="true" />
          <div className="home-container">
            <div className="home-admin-grid">
              {/* Left Visual */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="home-admin-visual"
              >
                <div className="home-admin-image-box">
                  <span className="home-admin-image-glow" aria-hidden="true" />
                  <SafeImage
                    src={guardImg}
                    alt={t("homeAltAdmin")}
                    className="home-admin-img"
                    fallbackIcon={HiOutlineUsers}
                  />
                  <div className="home-admin-image-overlay-badge">
                    <span className="home-admin-pulse-dot" />
                    <span>{t("homeBrandTitle")}</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Features — Modern 2x4 Capability Tiles */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="home-admin-right-pane"
              >
                <span className="home-section-tag">{t("homeNavHowItWorks")}</span>
                <h2 className="home-section-title" style={{ textAlign: "left" }}>
                  {t("homeSection2Title")}
                </h2>
                <p className="home-section-subtitle" style={{ textAlign: "left", marginBottom: "1.75rem" }}>
                  {t("homeSection2Subtitle")}
                </p>

                <div className="home-admin-capabilities-grid">
                  {[
                    {
                      icon: HiOutlineMegaphone,
                      title: t("homeAdminF1"),
                      desc: t("homeAdminF1Desc"),
                      color: "#0284c7"
                    },
                    {
                      icon: HiOutlineCog6Tooth,
                      title: t("homeAdminF2"),
                      desc: t("homeAdminF2Desc"),
                      color: "#7c3aed"
                    },
                    {
                      icon: HiOutlineBuildingOffice2,
                      title: t("homeAdminF3"),
                      desc: t("homeAdminF3Desc"),
                      color: "#0d9488"
                    },
                    {
                      icon: HiOutlineCreditCard,
                      title: t("homeAdminF4"),
                      desc: t("homeAdminF4Desc"),
                      color: "#10b981"
                    },
                    {
                      icon: HiOutlineBuildingStorefront,
                      title: t("homeAdminF5"),
                      desc: t("homeAdminF5Desc"),
                      color: "#ea580c"
                    },
                    {
                      icon: HiOutlineClock,
                      title: t("homeAdminF6"),
                      desc: t("homeAdminF6Desc"),
                      color: "#e11d48"
                    },
                    {
                      icon: HiOutlineFolder,
                      title: t("homeAdminF7"),
                      desc: t("homeAdminF7Desc"),
                      color: "#4f46e5"
                    },
                    {
                      icon: HiOutlineChatBubbleLeftRight,
                      title: t("homeAdminF8"),
                      desc: t("homeAdminF8Desc"),
                      color: "#db2777"
                    }
                  ].map((cap, cIdx) => {
                    const CapIcon = cap.icon;
                    return (
                      <motion.div
                        key={cIdx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.35, delay: 0.1 + cIdx * 0.04 }}
                        className="home-admin-cap-card"
                        style={{ "--c": cap.color, animationDelay: `${cIdx * 50}ms` }}
                      >
                        <span className="home-card-blob" aria-hidden="true" />
                        <div className="home-admin-cap-icon-box">
                          <CapIcon />
                        </div>
                        <div className="home-admin-cap-info">
                          <div className="home-admin-cap-title-row">
                            <h4 className="home-admin-cap-title">{cap.title}</h4>
                            <span className="home-card-arrow" aria-hidden="true">
                              <HiOutlineArrowRight />
                            </span>
                          </div>
                          <p className="home-admin-cap-desc">{cap.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==========================================================================
         6. ROLE SECTION
         ========================================================================== */}
        <section className="home-roles-section home-glass-section" id="roles">
          <div className="home-glass-bg" aria-hidden="true">
            <img src={userRolesBgImg} alt="" />
          </div>
          <div className="home-glass-frost" aria-hidden="true" />
          <div className="home-container">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="home-section-header"
            >
              <span className="home-section-tag">{t("homeRolesTag")}</span>
              <h2 className="home-section-title">
                {t("homeSection3Title")}
              </h2>
              <p className="home-section-subtitle">
                {t("homeSection3Subtitle")}
              </p>
            </motion.div>

            <div className="home-roles-grid">
              {[
                {
                  img: adminImg,
                  icon: HiOutlineBriefcase,
                  title: t("homeRole1Title"),
                  desc: t("homeRole1Desc"),
                  color: "#0d9488",
                  colorClass: "home-role-card--admin"
                },
                {
                  img: committeeImg,
                  icon: HiOutlineUserGroup,
                  title: t("homeRole2Title"),
                  desc: t("homeRole2Desc"),
                  color: "#7c3aed",
                  colorClass: "home-role-card--committee"
                },
                {
                  img: residentImg,
                  icon: HiOutlineUsers,
                  title: t("homeRole3Title"),
                  desc: t("homeRole3Desc"),
                  color: "#0284c7",
                  colorClass: "home-role-card--resident"
                },
                {
                  img: securityGuardImg,
                  icon: HiOutlineLockClosed,
                  title: t("homeRole4Title"),
                  desc: t("homeRole4Desc"),
                  color: "#ea580c",
                  colorClass: "home-role-card--guard"
                },
                {
                  img: accountantImg,
                  icon: HiOutlineCalculator,
                  title: t("homeRole5Title"),
                  desc: t("homeRole5Desc"),
                  color: "#4f46e5",
                  colorClass: "home-role-card--accountant"
                },
                {
                  img: adminImg,
                  icon: HiOutlineBuildingStorefront,
                  title: t("homeRole6Title"),
                  desc: t("homeRole6Desc"),
                  color: "#059669",
                  colorClass: "home-role-card--facility"
                }
              ].map((role, rIdx) => {
                const RoleIcon = role.icon;
                return (
                  <motion.div
                    key={rIdx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: rIdx * 0.08 }}
                    className={`home-role-card ${role.colorClass}`}
                    style={{ "--c": role.color, animationDelay: `${rIdx * 60}ms` }}
                  >
                    {/* Decorative Orb Blob */}
                    <span className="home-card-blob" aria-hidden="true" />

                    {/* Left Side Info */}
                    <div className="home-role-content-left">
                      <div className="home-role-head">
                        <div className="home-role-badge"><RoleIcon /></div>
                        <h3 className="home-role-title">{role.title}</h3>
                        <span className="home-card-arrow" aria-hidden="true">
                          <HiOutlineArrowRight />
                        </span>
                      </div>
                      <p className="home-role-desc">{role.desc}</p>
                    </div>

                    {/* Right Side Image */}
                    <div className="home-role-image-right">
                      <SafeImage
                        src={role.img}
                        alt={role.title}
                        className="home-role-img"
                        fallbackIcon={RoleIcon}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==========================================================================
         7. CALL TO ACTION (CTA) BANNER (PPT SLIDE 5 - MODERN LUXURY REDESIGN)
         ========================================================================== */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={slideVariants}
          className="home-cta-section"
        >
          <div className="home-container">
            <div className="home-cta-banner">
              {/* Ambient Glow Orbs */}
              <div className="home-cta-glow-orb orb-1"></div>
              <div className="home-cta-glow-orb orb-2"></div>

              <SafeImage
                src={homeBannerImg}
                alt={t("homeAltCta")}
                className="home-cta-bg-image"
                fallbackIcon={HiOutlineBuildingOffice2}
              />

              <div className="home-cta-content">
                <div className="home-cta-badge">
                  <HiOutlineSparkles className="home-cta-sparkle-icon" /> {t("homeCtaBadge")}
                </div>

                <h2 className="home-cta-title">
                  {t("homeCtaTitle1")}<br />{t("homeCtaTitle2")}
                </h2>

                <p className="home-cta-subtitle">
                  {t("homeCtaSubtitle")}
                </p>

                <div className="home-cta-pills">
                  <span className="home-cta-pill"><HiOutlineCheckCircle /> {t("homeCtaPill1")}</span>
                  <span className="home-cta-pill"><HiOutlineCheckCircle /> {t("homeCtaPill2")}</span>
                  <span className="home-cta-pill"><HiOutlineCheckCircle /> {t("homeCtaPill3")}</span>
                </div>

                <div className="home-cta-buttons">
                  <button
                    onClick={goToApp}
                    className="home-cta-btn-primary"
                  >
                    {loggedIn ? t("homeDashboard") : t("homeGetStartedNow")} <HiOutlineArrowRight className="home-cta-arrow" />
                  </button>

                  <button
                    onClick={() => scrollToSection("features")}
                    className="home-cta-btn-glass"
                  >
                    {t("homeExplore")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ==========================================================================
         8. FOOTER SECTION
         ========================================================================== */}
      <footer className="home-footer">
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
      </footer>
    </div>
  );
};

export default Home;
