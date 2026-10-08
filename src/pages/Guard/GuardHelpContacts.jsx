import { useState, useEffect, useCallback } from "react";
import {
  MdPhone, MdEmail, MdExpandMore, MdExpandLess,
  MdSearch, MdClose, MdLocalPolice, MdLocalFireDepartment,
  MdSupportAgent, MdBusiness, MdHeadset, MdInfo,
  MdWarning, MdVerified, MdOutlineHelpOutline,
} from "react-icons/md";
import { FaWhatsapp, FaAmbulance } from "react-icons/fa";
import API from "../../services/api";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import { useLang } from "../../context/LanguageContext";
import "./GuardHelpContacts.css";

const avatarColors = ["blue", "amber", "green", "purple"];

export default function GuardHelpContacts() {
  const { t } = useLang();
  const [search,          setSearch]          = useState("");
  const [openFaq,         setOpenFaq]         = useState(null);
  const [activeTab,       setActiveTab]       = useState("contacts");
  const [societyContacts, setSocietyContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError,   setContactsError]   = useState("");

  /* ── Localized data ── */
  const emergencyContacts = [
    { id: 1, label: t("ghEmgPolice", "Police"),               number: "100",  icon: MdLocalPolice,         color: "blue",   desc: t("ghEmgPoliceDesc", "Law enforcement emergency") },
    { id: 2, label: t("ghEmgFire", "Fire"),                   number: "101",  icon: MdLocalFireDepartment, color: "red",    desc: t("ghEmgFireDesc", "Fire department emergency") },
    { id: 3, label: t("ghEmgAmbulance", "Ambulance"),         number: "108",  icon: FaAmbulance,           color: "green",  desc: t("ghEmgAmbulanceDesc", "Medical emergency") },
    { id: 4, label: t("ghEmgWomen", "Women Helpline"),        number: "1091", icon: MdVerified,            color: "purple", desc: t("ghEmgWomenDesc", "Women safety helpline") },
  ];

  const faqs = [
    { id: 1, q: t("ghFaq1q", "How do I log a guest entry?"),              a: t("ghFaq1a", "Go to Guest Entry from the sidebar. Fill in the visitor's name, host flat number, purpose, and vehicle details if applicable. Click Submit to log the entry and generate an OTP for verification.") },
    { id: 2, q: t("ghFaq2q", "What should I do during an emergency?"),    a: t("ghFaq2a", "Press the Emergency button on your dashboard immediately. This alerts all admins and residents. Simultaneously call the relevant emergency number (Police 100, Fire 101, Ambulance 108). Do not leave your post unless absolutely necessary.") },
    { id: 3, q: t("ghFaq3q", "How do I verify a delivery agent?"),        a: t("ghFaq3a", "Use the Delivery Entry section. Confirm the agent's ID, package details, and the resident's flat number. Call the resident if unsure. Only allow entry after resident confirmation.") },
    { id: 4, q: t("ghFaq4q", "How are cab entries managed?"),             a: t("ghFaq4a", "Go to Cab Entry and fill in the vehicle number, driver details, and the resident's flat. The resident should be notified automatically. Log exit time when the cab leaves.") },
    { id: 5, q: t("ghFaq5q", "What is a Gate Pass and how do I use it?"), a: t("ghFaq5a", "A Gate Pass is issued by a resident for expected visitors. You'll see a pre-approved pass with a code. Match the visitor's details with the pass code before allowing entry.") },
    { id: 6, q: t("ghFaq6q", "How do I report a parking violation?"),     a: t("ghFaq6a", "Go to the Parking section and log the vehicle number, location, and time of the violation. You can also add a photo note. The system will notify the admin for further action.") },
    { id: 7, q: t("ghFaq7q", "What should I do if the system is down?"),  a: t("ghFaq7a", "Maintain a manual register for all entries and exits. Note down visitor details, time, and flat number. Contact the IT support number or the society manager immediately. Do not halt gate operations.") },
  ];

  const guideSteps = [
    { icon: "1", title: t("ghStep1Title", "Guest Entry"),               desc: t("ghStep1Desc", "Log all visitors with ID proof and host confirmation before allowing entry.") },
    { icon: "2", title: t("ghStep2Title", "Cab & Delivery"),            desc: t("ghStep2Desc", "Verify agent IDs and resident confirmation for all cabs and deliveries.") },
    { icon: "3", title: t("ghStep3Title", "Emergency Protocol"),        desc: t("ghStep3Desc", "Use emergency button and contact relevant authorities immediately.") },
    { icon: "4", title: t("ghStep4Title", "Gate Pass Check"),           desc: t("ghStep4Desc", "Match pre-approved gate passes before granting access to expected visitors.") },
  ];

  /* ── Fetch ── */
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      setContactsError("");
      const res = await API.get("/contacts");
      if (res.data.success) {
        const formatted = res.data.data.map((user, i) => ({
          id:       user.id,
          name:     user.name,
          role:     user.role || (user.roles?.[0] || "Member"),
          phone:    user.phone,
          email:    user.email,
          avatar:   user.name?.split(" ").map((n) => n[0]).join("").toUpperCase(),
          colorKey: avatarColors[i % avatarColors.length],
        }));
        setSocietyContacts(formatted);
      } else {
        setContactsError(t("ghContactsLoadFail", "Could not load contacts."));
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setContactsError(t("ghContactsLoadError", "Failed to fetch contacts. Please try again."));
    } finally {
      setLoadingContacts(false);
    }
  }, [t]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "contacts", label: t("ghTabContacts", "Emergency & Contacts") },
    { key: "faq",      label: t("ghTabFaq", "Help & FAQs")               },
    { key: "guide",    label: t("ghTabGuide", "Guard Quick Guide")       },
  ];

  return (
    <div className="gh-root page-root animate-fadeIn">

      {/* ── Page Header ── */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdHeadset size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("ghTitle", "Help & Contacts")}</h2>
            <p className="page-subtitle">{t("ghSubtitle", "Emergency numbers, society management contacts & operational guide")}</p>
          </div>
        </div>
      </div>

      {/* ── Emergency National Helpline Banner ── */}
      <div className="gh-emerg-banner">
        <div className="gh-emerg-banner-left">
          <div className="gh-emerg-banner-pulse">
            <MdWarning size={20} />
          </div>
          <span className="gh-emerg-banner-text">
            {t("ghEmergBannerPre", "In a life-threatening emergency, call")}{" "}
            <strong className="gh-emerg-highlight">112</strong>{" "}
            {t("ghEmergBannerPost", "— National Emergency Helpline")}
          </span>
        </div>
        <a href="tel:112" className="gh-emerg-dial-btn">
          <MdPhone size={15} />
          <span>{t("ghDial112", "Call 112")}</span>
        </a>
      </div>

      {/* ── Tab Strip ── */}
      <div className="my-1">
        <SlidingTabs
          className="ge-filter-tabs"
          value={activeTab}
          onChange={setActiveTab}
          fullWidth
          items={tabs.map(({ key, label }) => ({ id: key, label }))}
        />
      </div>

      {/* ════════════════ CONTACTS TAB ════════════════ */}
      {activeTab === "contacts" && (
        <div className="gh-tab-content">

          {/* Emergency Numbers */}
          <div>
            <div className="gh-section-label">
              <MdLocalPolice size={16} />
              <span>{t("ghSectionEmergency", "Immediate Emergency Services")}</span>
            </div>
            <div className="gh-emerg-grid mt-2">
              {emergencyContacts.map((c) => (
                <div key={c.id} className={`gh-emerg-card gh-emerg-card--${c.color}`}>
                  <div>
                    <div className="gh-emerg-icon-wrap">
                      <c.icon size={22} />
                    </div>
                    <div className="gh-emerg-info">
                      <p className="gh-emerg-label">{c.label}</p>
                      <p className="gh-emerg-number">{c.number}</p>
                      <p className="gh-emerg-desc">{c.desc}</p>
                    </div>
                  </div>
                  <a href={`tel:${c.number}`} className="gh-call-btn">
                    <MdPhone size={15} />
                    <span>{t("ghCall", "Call Now")}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Society Contacts */}
          <div>
            <div className="gh-section-label">
              <MdBusiness size={16} />
              <span>{t("ghSectionSociety", "Society Committee & Staff Contacts")}</span>
            </div>

            <div className="gh-contacts-list mt-2">
              {loadingContacts ? (
                /* skeleton */
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="gh-contact-card" style={{ opacity: 0.6 }}>
                    <div className="gh-avatar gh-avatar--blue" style={{ background: "transparent" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className="rd-skeleton" style={{ height: 14, width: "65%", borderRadius: 6 }} />
                      <div className="rd-skeleton" style={{ height: 11, width: "40%", borderRadius: 6 }} />
                      <div className="rd-skeleton" style={{ height: 24, width: "80%", borderRadius: 6, marginTop: 4 }} />
                    </div>
                  </div>
                ))
              ) : contactsError ? (
                <div className="gh-empty-state">
                  <p style={{ margin: 0, fontSize: 13, color: "var(--stat-red-color, #ef4444)" }}>{contactsError}</p>
                </div>
              ) : societyContacts.length === 0 ? (
                <div className="gh-empty-state">
                  <MdBusiness size={40} className="gh-empty-icon" />
                  <p className="gh-empty-text">{t("ghContactsEmpty", "No society contacts found.")}</p>
                </div>
              ) : (
                societyContacts.map((c) => (
                  <div key={c.id} className="gh-contact-card">
                    <div className={`gh-avatar gh-avatar--${c.colorKey}`}>
                      {c.avatar}
                    </div>
                    <div className="gh-contact-info">
                      <p className="gh-contact-name" title={c.name}>{c.name}</p>
                      <p className="gh-contact-role">{c.role.replace(/_/g, " ")}</p>
                      <div className="gh-contact-actions">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="gh-action-btn gh-action-btn--phone" title="Call">
                            <MdPhone size={13} />
                            <span>{c.phone}</span>
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                            className="gh-action-btn gh-action-btn--whatsapp"
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp"
                          >
                            <FaWhatsapp size={13} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="gh-action-btn gh-action-btn--email" title="Email">
                            <MdEmail size={13} />
                            <span>Email</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Support Card */}
          <div className="gh-support-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
                <MdSupportAgent size={24} />
              </div>
              <div>
                <p className="gh-support-title">{t("ghSupportTitle", "Tech & Application Support")}</p>
                <p className="gh-support-sub">{t("ghSupportSub", "Having trouble with the guard application or hardware? Contact technical support.")}</p>
              </div>
            </div>
            <a href="mailto:support@society.com" className="gh-support-btn">
              <MdEmail size={15} /> support@society.com
            </a>
          </div>
        </div>
      )}

      {/* ════════════════ FAQ TAB ════════════════ */}
      {activeTab === "faq" && (
        <div className="gh-tab-content">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div className="gh-section-label">
              <MdOutlineHelpOutline size={16} />
              <span>{t("ghFaqHeading", "Frequently Asked Guard Questions")}</span>
            </div>
            <div className="w-full sm:w-auto">
              <ExpandableSearch
                placeholder={t("ghSearchFaq", "Search FAQs, protocols, keywords…")}
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="gh-empty-state">
              <MdSearch size={40} className="gh-empty-icon" />
              <p className="gh-empty-text">{t("ghFaqNoMatch", "No FAQs match your search.")}</p>
            </div>
          ) : (
            <div className="gh-faq-list">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`gh-faq-item ${isOpen ? "gh-faq-item--open" : ""}`}
                  >
                    <button
                      className="gh-faq-question"
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    >
                      <span>{faq.q}</span>
                      {isOpen
                        ? <MdExpandLess size={22} className="gh-faq-chevron" />
                        : <MdExpandMore  size={22} className="gh-faq-chevron" />
                      }
                    </button>
                    {isOpen && (
                      <div className="gh-faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ QUICK GUIDE TAB ════════════════ */}
      {activeTab === "guide" && (
        <div className="gh-tab-content">

          {/* Intro banner */}
          <div className="gh-guide-intro">
            <MdInfo size={22} className="gh-guide-intro-icon" />
            <span>
              {t("ghGuideIntro", "Follow these standard operating security protocols on every shift to ensure the absolute safety and comfort of all residents and visitors.")}
            </span>
          </div>

          {/* Guide steps grid */}
          <div>
            <div className="gh-section-label">
              <span>{t("ghWorkflowSteps", "Core Shift Procedures")}</span>
            </div>
            <div className="gh-guide-steps mt-2">
              {guideSteps.map((step) => (
                <div key={step.icon} className="gh-guide-step">
                  <div className="gh-guide-step-num">{step.icon}</div>
                  <div>
                    <p className="gh-guide-step-title">{step.title}</p>
                    <p className="gh-guide-step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shift checklist */}
          <div className="gh-shift-tips">
            <p className="gh-shift-tips-title">
              <MdVerified size={18} className="text-indigo-500" />
              <span>{t("ghShiftChecklist", "Daily Shift Handover Checklist")}</span>
            </p>
            {[
              t("ghCheckItem1", "Check and reconcile visitor log at the start of shift"),
              t("ghCheckItem2", "Verify all incoming delivery packages with host residents"),
              t("ghCheckItem3", "Report any suspicious vehicles, parking violations, or unauthorized persons immediately"),
              t("ghCheckItem4", "Hand over physical key inventory and digital log book to the relieving guard"),
              t("ghCheckItem5", "Test emergency communication buttons and inter-gate walkie-talkies"),
            ].map((item, i) => (
              <div key={i} className="gh-checklist-item">
                <span className="gh-checklist-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Dos & Don'ts */}
          <div className="gh-dos-donts">
            <div className="gh-do-card">
              <p className="gh-do-title">✓ {t("ghCheckDo", "Guard Do's")}</p>
              {[
                t("ghDoItem1", "Greet visitors and residents politely and respectfully"),
                t("ghDoItem2", "Verify ID badge or pass before authorizing campus entry"),
                t("ghDoItem3", "Log exact entry and exit timestamps promptly"),
                t("ghDoItem4", "Escalate security anomalies or distress signals to Admin immediately"),
              ].map((d, i) => (
                <div key={i} className="gh-do-item">
                  <span className="gh-do-dot" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <div className="gh-dont-card">
              <p className="gh-dont-title">✗ {t("ghCheckDont", "Guard Don'ts")}</p>
              {[
                t("ghDontItem1", "Never allow unverified or suspicious persons through the gate"),
                t("ghDontItem2", "Never leave gate checkpoint unattended without authorized relief"),
                t("ghDontItem3", "Never share gate security codes or resident phone numbers"),
                t("ghDontItem4", "Never confront hostile threats alone — sound SOS alert immediately"),
              ].map((d, i) => (
                <div key={i} className="gh-dont-item">
                  <span className="gh-dont-dot" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}