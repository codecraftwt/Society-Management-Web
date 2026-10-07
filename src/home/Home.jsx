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
  HiOutlineXMark
} from "react-icons/hi2";
import { FaYoutube, FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";

/* Image imports from assets/Photos/Home */
import homeBannerImg from "../assets/Photos/Home/society-hero-campus.png";
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
            {/* Brand Logo */}
            <Link to="/" className="home-brand-logo">
              <div className="home-brand-icon-box">
                <HiOutlineBuildingOffice2 />
              </div>
              <div className="home-brand-text">
                <div className="home-brand-title">{t("homeBrandTitle")}</div>
                <div className="home-brand-subtitle">{t("homeBrandSubtitle")}</div>
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

            {/* Nav Right Actions: Language -> Authentication -> Primary CTA -> Theme */}
            <div className="home-nav-actions">
              <LanguageSelector compact />
              {loggedIn ? (
                <button
                  onClick={goToApp}
                  className="home-btn-nav-cta"
                >
                  {t("homeDashboard")}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="home-btn-login"
                  >
                    {t("homeLogin")}
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="home-btn-nav-cta"
                  >
                    {t("homeGetStarted")}
                  </button>
                </>
              )}
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
            {loggedIn ? (
              <button
                onClick={() => { setMenuOpen(false); goToApp(); }}
                className="home-btn-nav-cta"
              >
                {t("homeDashboard")}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMenuOpen(false); navigate("/login"); }}
                  className="home-btn-login"
                >
                  {t("homeLogin")}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate("/login"); }}
                  className="home-btn-nav-cta"
                >
                  {t("homeGetStarted")}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* ==========================================================================
         2. HERO BANNER SECTION (Natural Direct Alignment + Open View of Campus)
         ========================================================================== */}
        <section className="home-hero-section">
          <div className="home-hero-bg-photo">
            <SafeImage
              src={homeBannerImg}
              alt={t("homeAltHero")}
              className="home-hero-full-img"
              fallbackIcon={HiOutlineBuildingOffice2}
              fallbackGradient="linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)"
            />
          </div>

          {/* Directional gradient mask */}
          <div className="home-hero-gradient-mask" aria-hidden="true" />

          <div className="home-container home-hero-container">
            <div className="home-hero-layout">
              {/* Left Side: Direct clean typography (no awkward enclosing box) */}
              <motion.div
                initial={{ opacity: 0, x: -25 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="home-hero-content-direct"
              >
                <div className="home-eyebrow-badge">
                  <HiOutlineSparkles className="home-eyebrow-icon" />
                  <span>{t("homeEyebrow")}</span>
                </div>

                <h1 className="home-hero-title">
                  <span className="home-grad-text--white">{t("homeHeroTitle1")}</span><br />
                  <span className="home-grad-text--blue">{t("homeHeroTitle2")}</span><br />
                  <span className="home-grad-text--cyan">{t("homeHeroTitle3")}</span>
                </h1>

                <p className="home-hero-subtitle">
                  {t("homeHeroSubtitle")}
                </p>

                <div className="home-hero-actions">
                  <button
                    onClick={goToApp}
                    className="home-btn-hero-primary"
                  >
                    {loggedIn ? t("homeDashboard") : t("homeGetStarted")}
                    <HiOutlineArrowRight className="home-hero-btn-arrow" />
                  </button>

                  <button
                    onClick={() => scrollToSection("features")}
                    className="home-btn-hero-secondary"
                  >
                    {t("homeExplore")}
                  </button>
                </div>

                {/* Micro-Trust Chips */}
                <div className="home-hero-chips">
                  <div className="home-hero-chip">
                    <HiOutlineCheckCircle className="home-hero-chip-icon" />
                    <span>{t("homeHeroChip1")}</span>
                  </div>
                  <div className="home-hero-chip">
                    <HiOutlineCheckCircle className="home-hero-chip-icon" />
                    <span>{t("homeHeroChip2")}</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Side: Interactive Floating Status Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="home-hero-floating-stat"
              >
                <div className="home-hero-stat-badge">
                  <span className="home-hero-stat-pulse" />
                  <div className="home-hero-stat-text">
                    <strong>{t("homeHeroStatTitle")}</strong>
                    <span>{t("homeHeroStatSubtitle")}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==========================================================================
         3. PILLARS / PLATFORM OVERVIEW SECTION (Multi-Language Supported)
         ========================================================================== */}
        <section className="home-pillars-section home-glass-section" id="features">
          <div className="home-glass-bg" aria-hidden="true">
            <img src={featuresBgImg} alt="" />
          </div>
          <div className="home-glass-frost" aria-hidden="true" />
          <div className="home-container">
            <div className="home-pillars-panel">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="home-section-header"
              >
                <span className="home-section-tag">{t("homeNavFeatures")}</span>
                <h2 className="home-section-title">
                  {t("homeSection1Title")}
                </h2>
              </motion.div>

              <div className="home-pillars-grid">
                {[
                  {
                    icon: HiOutlineUsers,
                    title: t("homePillar1Title"),
                    desc: t("homePillar1Desc"),
                    color: "#0284c7",
                    colorClass: "home-pillar-card--residents"
                  },
                  {
                    icon: HiOutlineCreditCard,
                    title: t("homePillar2Title"),
                    desc: t("homePillar2Desc"),
                    color: "#10b981",
                    colorClass: "home-pillar-card--accounting"
                  },
                  {
                    icon: HiOutlineShieldCheck,
                    title: t("homePillar3Title"),
                    desc: t("homePillar3Desc"),
                    color: "#0d9488",
                    colorClass: "home-pillar-card--security"
                  },
                  {
                    icon: HiOutlineChatBubbleLeftRight,
                    title: t("homePillar4Title"),
                    desc: t("homePillar4Desc"),
                    color: "#7c3aed",
                    colorClass: "home-pillar-card--complaints"
                  }
                ].map((pillar, idx) => {
                  const IconComp = pillar.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5, delay: 0.15 + idx * 0.08 }}
                      className={`home-pillar-card ${pillar.colorClass}`}
                      style={{ "--c": pillar.color, animationDelay: `${idx * 60}ms` }}
                    >
                      {/* Decorative Orb Blob */}
                      <span className="home-card-blob" aria-hidden="true" />
                      
                      <div className="home-pillar-content">
                        <div className="home-pillar-top-row">
                          <div className="home-pillar-icon-box">
                            <IconComp />
                          </div>
                        </div>

                        <div className="home-pillar-title-row">
                          <h3 className="home-pillar-title">{pillar.title}</h3>
                          <span className="home-card-arrow" aria-hidden="true">
                            <HiOutlineArrowRight />
                          </span>
                        </div>

                        <p className="home-pillar-desc">{pillar.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
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
