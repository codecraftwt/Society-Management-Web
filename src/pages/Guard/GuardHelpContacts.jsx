import { useState, useEffect } from "react";
import {
  MdPhone, MdEmail, MdExpandMore, MdExpandLess,
  MdSearch, MdClose, MdLocalPolice, MdLocalFireDepartment,
  MdSupportAgent, MdBusiness, MdHeadset, MdInfo,
  MdWarning, MdVerified,
} from "react-icons/md";
import { FaWhatsapp, FaAmbulance } from "react-icons/fa";
import API from "../../services/api";

/* ── Static data ── */
const emergencyContacts = [
  { id: 1, label: "Police",         number: "100",  icon: MdLocalPolice,         color: "blue",   desc: "Law enforcement emergency"  },
  { id: 2, label: "Fire",           number: "101",  icon: MdLocalFireDepartment, color: "red",    desc: "Fire department emergency"  },
  { id: 3, label: "Ambulance",      number: "108",  icon: FaAmbulance,           color: "green",  desc: "Medical emergency"          },
  { id: 4, label: "Women Helpline", number: "1091", icon: MdVerified,            color: "purple", desc: "Women safety helpline"      },
];

const faqs = [
  { id: 1, q: "How do I log a guest entry?",              a: "Go to Guest Entry from the sidebar. Fill in the visitor's name, host flat number, purpose, and vehicle details if applicable. Click Submit to log the entry and generate an OTP for verification." },
  { id: 2, q: "What should I do during an emergency?",    a: "Press the Emergency button on your dashboard immediately. This alerts all admins and residents. Simultaneously call the relevant emergency number (Police 100, Fire 101, Ambulance 108). Do not leave your post unless absolutely necessary." },
  { id: 3, q: "How do I verify a delivery agent?",        a: "Use the Delivery Entry section. Confirm the agent's ID, package details, and the resident's flat number. Call the resident if unsure. Only allow entry after resident confirmation." },
  { id: 4, q: "How are cab entries managed?",             a: "Go to Cab Entry and fill in the vehicle number, driver details, and the resident's flat. The resident should be notified automatically. Log exit time when the cab leaves." },
  { id: 5, q: "What is a Gate Pass and how do I use it?", a: "A Gate Pass is issued by a resident for expected visitors. You'll see a pre-approved pass with a code. Match the visitor's details with the pass code before allowing entry." },
  { id: 6, q: "How do I report a parking violation?",     a: "Go to the Parking section and log the vehicle number, location, and time of the violation. You can also add a photo note. The system will notify the admin for further action." },
  { id: 7, q: "What should I do if the system is down?",  a: "Maintain a manual register for all entries and exits. Note down visitor details, time, and flat number. Contact the IT support number or the society manager immediately. Do not halt gate operations." },
];

const guideSteps = [
  { icon: "1", title: "Guest Entry",         desc: "Log all visitors with ID proof and host confirmation before allowing entry."                  },
  { icon: "2", title: "Cab & Delivery",       desc: "Verify agent IDs and resident confirmation for all cabs and deliveries."                      },
  { icon: "3", title: "Emergency Protocol",   desc: "Use emergency button and contact relevant authorities immediately."                            },
  { icon: "4", title: "Gate Pass Check",      desc: "Match pre-approved gate passes before granting access to expected visitors."                  },
];

const avatarColors = ["blue", "amber", "green", "purple"];

export default function GuardHelpContacts() {
  const [search,          setSearch]          = useState("");
  const [openFaq,         setOpenFaq]         = useState(null);
  const [activeTab,       setActiveTab]       = useState("contacts");
  const [societyContacts, setSocietyContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError,   setContactsError]   = useState("");

  /* ── Fetch ── */
  useEffect(() => {
    const fetchContacts = async () => {
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
          setContactsError("Could not load contacts.");
        }
      } catch (err) {
        console.error("Error fetching contacts:", err);
        setContactsError("Failed to fetch contacts. Please try again.");
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, []);

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "contacts", label: "Contacts"    },
    { key: "faq",      label: "FAQ"         },
    { key: "guide",    label: "Quick Guide" },
  ];

  return (
    <div className="gh-root page-root animate-fadeIn">

      {/* ── Page Header ── */}
      <div className="gh-page-er">
        <div className="gh-page-er-left">
          <div className="gh-page-icon-wrap">
            <MdHeadset size={22} />
          </div>
          <div>
            <h1 className="gh-page-title">Help & Contacts</h1>
            <p className="gh-page-subtitle">Emergency numbers, society contacts & guard guide</p>
          </div>
        </div>
      </div>

      {/* ── Emergency Banner ── */}
      <div className="gh-emerg-banner">
        <MdWarning size={18} className="gh-emerg-banner-icon" />
        <span className="gh-emerg-banner-text">
          In a life-threatening emergency, call <strong>112</strong> — National Emergency Number
        </span>
      </div>

      {/* ── Tab Strip ── */}
      <div className="gh-tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`gh-tab ${activeTab === t.key ? "gh-tab--active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ CONTACTS TAB ════════════════ */}
      {activeTab === "contacts" && (
        <div className="gh-tab-content">

          {/* Emergency Numbers */}
          <div className="gh-section-label">
            <MdLocalPolice size={14} />
            Emergency Numbers
          </div>
          <div className="gh-emerg-grid">
            {emergencyContacts.map((c) => (
              <div key={c.id} className={`gh-emerg-card gh-emerg-card--${c.color}`}>
                <div className="gh-emerg-icon-wrap">
                  <c.icon size={20} />
                </div>
                <div className="gh-emerg-info">
                  <p className="gh-emerg-label">{c.label}</p>
                  <p className="gh-emerg-number">{c.number}</p>
                  <p className="gh-emerg-desc">{c.desc}</p>
                </div>
                <a href={`tel:${c.number}`} className="gh-call-btn">
                  <MdPhone size={14} /> Call
                </a>
              </div>
            ))}
          </div>

          {/* Society Contacts */}
          <div className="gh-section-label" style={{ marginTop: "1.25rem" }}>
            <MdBusiness size={14} />
            Society Contacts
          </div>

          <div className="gh-contacts-list">
            {loadingContacts ? (
              /* skeleton */
              [1, 2, 3].map((i) => (
                <div key={i} className="gh-contact-card" style={{ opacity: 0.5 }}>
                  <div className="gh-avatar gh-avatar--blue" style={{ background: "transparent" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="rd-skeleton" style={{ height: 14, width: "55%", borderRadius: 6 }} />
                    <div className="rd-skeleton" style={{ height: 11, width: "35%", borderRadius: 6 }} />
                  </div>
                </div>
              ))
            ) : contactsError ? (
              <div className="gh-empty-state">
                <p style={{ margin: 0, fontSize: 13, color: "var(--stat-red-color)" }}>{contactsError}</p>
              </div>
            ) : societyContacts.length === 0 ? (
              <div className="gh-empty-state">
                <MdBusiness size={36} className="gh-empty-icon" />
                <p className="gh-empty-text">No society contacts found.</p>
              </div>
            ) : (
              societyContacts.map((c) => (
                <div key={c.id} className="gh-contact-card">
                  <div className={`gh-avatar gh-avatar--${c.colorKey}`}>
                    {c.avatar}
                  </div>
                  <div className="gh-contact-info">
                    <p className="gh-contact-name">{c.name}</p>
                    <p className="gh-contact-role">{c.role.replace(/_/g, " ")}</p>
                    <div className="gh-contact-actions">
                      <a href={`tel:${c.phone || ""}`} className="gh-action-btn gh-action-btn--phone">
                        <MdPhone size={12} />
                        <span>{c.phone || "N/A"}</span>
                      </a>
                      <a
                        href={`https://wa.me/${(c.phone || "").replace(/\D/g, "")}`}
                        className="gh-action-btn gh-action-btn--whatsapp"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FaWhatsapp size={12} />
                        <span className="gh-action-label-desktop">WhatsApp</span>
                      </a>
                      <a href={`mailto:${c.email || ""}`} className="gh-action-btn gh-action-btn--email">
                        <MdEmail size={12} />
                        <span className="gh-action-label-desktop">Email</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Support Card */}
          <div className="gh-support-card">
            <MdSupportAgent size={20} className="gh-support-icon" />
            <div>
              <p className="gh-support-title">Tech & App Support</p>
              <p className="gh-support-sub">Having trouble with the app? Contact our support team.</p>
            </div>
            <a href="mailto:support@society.com" className="gh-support-btn">
              <MdEmail size={14} /> support@society.com
            </a>
          </div>
        </div>
      )}

      {/* ════════════════ FAQ TAB ════════════════ */}
      {activeTab === "faq" && (
        <div className="gh-tab-content">

          {/* Search */}
          <div className="gh-faq-search-wrap" style={{ marginBottom: "0.85rem" }}>
            <MdSearch size={16} className="gh-faq-search-icon" />
            <input
              className="gh-faq-search-input"
              placeholder="Search FAQs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="gh-faq-search-clear"
                onClick={() => setSearch("")}
              >
                <MdClose size={13} />
              </button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="gh-empty-state">
              <MdSearch size={36} className="gh-empty-icon" />
              <p className="gh-empty-text">No FAQs match your search.</p>
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
                        ? <MdExpandLess size={20} className="gh-faq-chevron" />
                        : <MdExpandMore  size={20} className="gh-faq-chevron" />
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
            <MdInfo size={18} className="gh-guide-intro-icon" />
            <span>
              Follow these steps on every shift to ensure the safety and security of all residents.
            </span>
          </div>

          {/* Guide steps grid */}
          <div className="gh-guide-steps">
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

          {/* Shift checklist */}
          <div className="gh-shift-tips">
            <p className="gh-shift-tips-title">Shift Checklist</p>
            {[
              "Check visitor log at the start of shift",
              "Verify all incoming deliveries with residents",
              "Report any suspicious vehicles or persons immediately",
              "Hand over physical log book to next guard",
              "Test emergency communication devices",
            ].map((item, i) => (
              <div key={i} className="gh-checklist-item">
                <span className="gh-checklist-dot" />
                {item}
              </div>
            ))}
          </div>

          {/* Dos & Don'ts */}
          <div className="gh-dos-donts">
            <div className="gh-do-card">
              <p className="gh-do-title">✓ Do</p>
              {["Greet visitors politely", "Verify ID before entry", "Log all entries and exits", "Alert admin for any issue"].map((d, i) => (
                <div key={i} className="gh-do-item">
                  <span className="gh-do-dot" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <div className="gh-dont-card">
              <p className="gh-dont-title">✗ Don't</p>
              {["Allow unverified visitors", "Leave gate unattended", "Share access codes", "Confront threats alone"].map((d, i) => (
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