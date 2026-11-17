import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  MdAdd,
  MdRefresh,
  MdPictureAsPdf,
  MdHistory,
  MdAssignmentTurnedIn,
  MdEdit,
  MdSearch,
  MdCloudUpload,
  MdClose,
  MdCheckCircle,
  MdWarning,
  MdGavel,
  MdImage,
  MdAccessTime,
} from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import API from "../../services/api";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalBadge from "../../components/common/GlobalBadge";
import PdfViewer from "../../components/common/PdfViewer";
import Select from "../../components/common/Select";

const RULE_CATEGORIES = [
  "General",
  "Security & Gate",
  "Parking & Vehicles",
  "Amenities & Clubhouse",
  "Waste Management",
  "Pets Policy",
  "Noise & Peaceful Living",
  "Renovation & Moving",
  "Maintenance & Dues",
  "Other",
];


function getCategoryBadgeStyle(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("security") || cat.includes("gate")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/25",
      dot: "bg-amber-500",
      accent: "#f59e0b",
      accentSecondary: "#fbbf24",
    };
  }
  if (cat.includes("parking") || cat.includes("vehicle")) {
    return {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-500/25",
      dot: "bg-cyan-500",
      accent: "#06b6d4",
      accentSecondary: "#3b82f6",
    };
  }
  if (cat.includes("amenit") || cat.includes("clubhouse") || cat.includes("pool")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/25",
      dot: "bg-purple-500",
      accent: "#a855f7",
      accentSecondary: "#ec4899",
    };
  }
  if (cat.includes("maintenance") || cat.includes("due") || cat.includes("bill")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/25",
      dot: "bg-emerald-500",
      accent: "#10b981",
      accentSecondary: "#06b6d4",
    };
  }
  if (cat.includes("pet")) {
    return {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/25",
      dot: "bg-rose-500",
      accent: "#f43f5e",
      accentSecondary: "#fb7185",
    };
  }
  if (cat.includes("waste") || cat.includes("clean")) {
    return {
      bg: "bg-teal-500/10 dark:bg-teal-500/15",
      text: "text-teal-600 dark:text-teal-400",
      border: "border-teal-500/25",
      dot: "bg-teal-500",
      accent: "#14b8a6",
      accentSecondary: "#10b981",
    };
  }
  if (cat.includes("renovat") || cat.includes("moving")) {
    return {
      bg: "bg-orange-500/10 dark:bg-orange-500/15",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500/25",
      dot: "bg-orange-500",
      accent: "#ea580c",
      accentSecondary: "#f97316",
    };
  }
  if (cat.includes("noise") || cat.includes("peace")) {
    return {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/25",
      dot: "bg-indigo-500",
      accent: "#6366f1",
      accentSecondary: "#8b5cf6",
    };
  }
  return {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/25",
    dot: "bg-blue-500",
    accent: "#3b82f6",
    accentSecondary: "#6366f1",
  };
}

export default function AdminRules({ defaultSuperAdmin = false }) {
  const { user } = useContext(AuthContext);
  const activeRole = user?.activeRole || user?.role || "";
  const isSuperAdmin = activeRole === "SUPER_ADMIN" || defaultSuperAdmin;
  const isCommittee = activeRole === "COMMITTEE_MEMBER" || activeRole === "COMMITTEE";
  const canManage = !isCommittee && (isSuperAdmin || activeRole === "SOCIETY_ADMIN");

  // Society filter for Super Admin
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(
    isSuperAdmin ? localStorage.getItem("superadmin_society_filter") || "" : user?.society_id || ""
  );

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Active Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  // Selected Rule Data
  const [selectedRule, setSelectedRule] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState("");
  const [activePdfTitle, setActivePdfTitle] = useState("");
  const [acknowledgementsData, setAcknowledgementsData] = useState([]);
  const [ackLoading, setAckLoading] = useState(false);
  const [ackSearch, setAckSearch] = useState("");
  const [ackSummary, setAckSummary] = useState(null);
  const [ackFilterStatus, setAckFilterStatus] = useState("ALL");

  // Form States
  const allFilterCategories = React.useMemo(() => {
    const set = new Set(RULE_CATEGORIES);
    rules.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [rules]);

  const [formData, setFormData] = useState({
    title: "",
    category: "General",
    custom_category: "",
    description: "",
    is_mandatory: false,
    file: null,
    change_summary: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Super Admin: Fetch societies
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then((res) => {
          const d = res.data;
          const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.societies) ? d.societies : [];
          setSocietiesList(list);
          if (!filterSocietyId && list.length > 0) {
            setFilterSocietyId(list[0].id.toString());
          }
        })
        .catch((err) => console.error("Error loading societies:", err));
    }
  }, [isSuperAdmin]);

  // Fetch Rules
  const fetchRules = useCallback(async () => {
    const targetSociety = isSuperAdmin ? filterSocietyId : user?.society_id;
    if (!targetSociety || targetSociety === "ALL") {
      setRules([]);
      return;
    }

    try {
      setLoading(true);
      const res = await API.get(`/rules?society_id=${targetSociety}`);
      setRules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  }, [filterSocietyId, isSuperAdmin, user?.society_id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Handle Create Rule
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const resolvedCategory =
      formData.category === "Other" && formData.custom_category?.trim()
        ? formData.custom_category.trim()
        : formData.category;

    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!formData.file) {
      setFormError("A document file (PDF or Image) is required");
      return;
    }
    if (formData.category === "Other" && !formData.custom_category?.trim()) {
      setFormError("Please enter a custom category name");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError("");

      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("category", resolvedCategory);
      payload.append("description", formData.description.trim());
      payload.append("is_mandatory", formData.is_mandatory);
      payload.append("file", formData.file);
      if (isSuperAdmin && filterSocietyId) {
        payload.append("society_id", filterSocietyId);
      }

      await API.post("/rules", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCreateModalOpen(false);
      resetForm();
      fetchRules();
    } catch (err) {
      console.error("Create rule error:", err);
      setFormError(err.response?.data?.message || "Failed to create rule");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Rule Metadata
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const resolvedCategory =
      formData.category === "Other" && formData.custom_category?.trim()
        ? formData.custom_category.trim()
        : formData.category;

    if (!selectedRule || !formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    if (formData.category === "Other" && !formData.custom_category?.trim()) {
      setFormError("Please enter a custom category name");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError("");

      await API.put(`/rules/${selectedRule.id}`, {
        title: formData.title.trim(),
        category: resolvedCategory,
        description: formData.description.trim(),
      });

      setEditModalOpen(false);
      resetForm();
      fetchRules();
    } catch (err) {
      console.error("Edit rule error:", err);
      setFormError(err.response?.data?.message || "Failed to update rule");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Publish New Version
  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRule || !formData.file) {
      setFormError("A document file (PDF or Image) is required for the new version");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError("");

      const payload = new FormData();
      payload.append("file", formData.file);
      payload.append("change_summary", formData.change_summary.trim());
      payload.append("is_mandatory", formData.is_mandatory);

      await API.post(`/rules/${selectedRule.id}/versions`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPublishModalOpen(false);
      resetForm();
      fetchRules();
    } catch (err) {
      console.error("Publish version error:", err);
      setFormError(err.response?.data?.message || "Failed to publish version");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Acknowledgements Audit Modal
  const handleOpenAcknowledgements = async (rule) => {
    setSelectedRule(rule);
    setAckModalOpen(true);
    setAckLoading(true);
    setAckSearch("");
    setAckFilterStatus("ALL");
    try {
      const res = await API.get(`/rules/${rule.id}/acknowledgements`);
      const list = res.data?.records || res.data?.acknowledgements || [];
      setAcknowledgementsData(list);
      setAckSummary(res.data?.summary || null);
    } catch (err) {
      console.error("Failed to load acknowledgements:", err);
    } finally {
      setAckLoading(false);
    }
  };

  // Open Version History Modal
  const handleOpenHistory = async (rule) => {
    setSelectedRule(rule);
    setHistoryModalOpen(true);
    try {
      const res = await API.get(`/rules/${rule.id}`);
      setSelectedRule(res.data);
    } catch (err) {
      console.error("Failed to load full rule history:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "General",
      custom_category: "",
      description: "",
      is_mandatory: false,
      file: null,
      change_summary: "",
    });
    setFormError("");
    setSelectedRule(null);
  };

  // Filter Rules
  const filteredRules = rules.filter((r) => {
    if (!r.is_active) return false;
    if (selectedCategory !== "ALL" && r.category !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = (r.title || "").toLowerCase().includes(q);
      const matchCat = (r.category || "").toLowerCase().includes(q);
      const matchDesc = (r.description || "").toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--divider)] shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <MdGavel className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Society Rules & Regulations
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Manage society policies, upload versioned PDF documents, and monitor resident acknowledgements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Super Admin Society Filter */}
          {isSuperAdmin && societiesList.length > 0 && (
            <div className="min-w-[200px]">
              <Select
                value={filterSocietyId}
                onChange={(e) => {
                  setFilterSocietyId(e.target.value);
                  localStorage.setItem("superadmin_society_filter", e.target.value);
                }}
                options={societiesList.map((s) => ({ value: s.id.toString(), label: s.name }))}
                placeholder="Select Society"
              />
            </div>
          )}

          

          {canManage && (
            <GlobalButton
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
              variant="primary"
              icon={MdAdd}
              className="whitespace-nowrap shrink-0"
            >
              New Rule
            </GlobalButton>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[var(--card-bg)] p-4 sm:p-5 rounded-2xl border border-[var(--divider)] shadow-xs">
        {/* Search input container with guaranteed zero overlap */}
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 460 }}>
          <MdSearch
            size={18}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-secondary)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          <input
            type="text"
            placeholder="Search rules by title, category, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: 42,
              paddingRight: searchTerm ? 36 : 14,
              height: 40,
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
            }}
            className="input search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search"
            >
              <MdClose size={16} />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
            >
              <option value="ALL">All Categories</option>
              {allFilterCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-secondary)]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading rules & regulations...
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="p-12 text-center bg-[var(--card-bg)] rounded-2xl border border-[var(--divider)]">
          <MdGavel className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No rules found
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {canManage
              ? "Get started by clicking 'New Rule' to create policies and upload official PDF documents."
              : "No rules are currently published for this society."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => {
            const current = rule.current_version;
            const catStyle = getCategoryBadgeStyle(rule.category);
            const isImg = Boolean((current?.document_name || current?.file_url || "").match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i));

            return (
              <div
                key={rule.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-[var(--card-bg)] border border-[var(--divider)] p-5.5 shadow-xs hover:shadow-xl hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Modern top gradient accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${catStyle.accent}, ${catStyle.accentSecondary})`,
                  }}
                />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                      <span className={`w-2 h-2 rounded-full ${catStyle.dot} shadow-xs`} />
                      {rule.category || "General"}
                    </span>

                    {rule.is_mandatory ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Mandatory
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        Advisory
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-3.5 group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug">
                    {rule.title}
                  </h3>
                  {rule.description ? (
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      {rule.description}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]/50 italic mt-2">
                      No additional description provided.
                    </p>
                  )}

                  {/* Current Version & Document Info Inset */}
                  {current && (
                    <div className="mt-4 p-3.5 rounded-xl bg-[var(--card-inner-bg,var(--bg-main))] border border-[var(--divider)] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            v{current.version_number}
                          </span>
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                            Updated {new Date(current.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                          {isImg ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <MdImage className="text-xs" /> Image
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              <MdPictureAsPdf className="text-xs" /> PDF
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5 text-xs">
                        <span className="text-[11px] text-[var(--text-secondary)] shrink-0 font-medium">Document:</span>
                        <span className="truncate max-w-[210px] font-semibold text-[var(--text-primary)] text-[12px]" title={current.document_name}>
                          {current.document_name || (isImg ? "Rule Image Document" : "Rule Document.pdf")}
                        </span>
                      </div>

                      {current.change_summary && (
                        <div className="pt-2 border-t border-[var(--divider)]/50 text-[11px] text-gray-400 italic line-clamp-1">
                          "{current.change_summary}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Bottom Toolbar */}
                <div className="mt-5 pt-3.5 border-t border-[var(--divider)] space-y-2.5">
                  <div className="flex items-center gap-2">
                    {current?.file_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePdfUrl(current.file_url);
                          setActivePdfTitle(current.document_name || rule.title);
                          setPdfViewerOpen(true);
                        }}
                        className={`flex-1 py-2.5 px-3.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer ${
                          isImg
                            ? "bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
                            : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20"
                        }`}
                      >
                        {isImg ? <MdImage className="text-base" /> : <MdPictureAsPdf className="text-base" />}
                        {isImg ? "Preview Image" : "Preview PDF"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenHistory(rule)}
                      className="p-2.5 rounded-xl bg-[var(--card-inner-bg)] hover:bg-blue-500/10 border border-[var(--divider)] hover:border-blue-500/30 text-[var(--text-secondary)] hover:text-blue-500 transition-all cursor-pointer"
                      title="Version History"
                    >
                      <MdHistory className="text-lg" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAcknowledgements(rule)}
                      className="p-2.5 rounded-xl bg-[var(--card-inner-bg)] hover:bg-emerald-500/10 border border-[var(--divider)] hover:border-emerald-500/30 text-[var(--text-secondary)] hover:text-emerald-500 transition-all cursor-pointer"
                      title="View Acknowledgements Audit"
                    >
                      <MdAssignmentTurnedIn className="text-lg" />
                    </button>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const isPresetCat = RULE_CATEGORIES.includes(rule.category) && rule.category !== "Other";
                          setSelectedRule(rule);
                          setFormData({
                            title: rule.title,
                            category: isPresetCat ? rule.category : "Other",
                            custom_category: isPresetCat ? "" : rule.category,
                            description: rule.description || "",
                            is_mandatory: rule.is_mandatory,
                            file: null,
                            change_summary: "",
                          });
                          setEditModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[var(--card-inner-bg)] hover:bg-[var(--card-inner-bg-hover)] border border-[var(--divider)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MdEdit className="text-sm text-gray-400" />
                        Edit Details
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRule(rule);
                          setFormData({
                            title: rule.title,
                            category: rule.category,
                            custom_category: "",
                            description: "",
                            is_mandatory: rule.is_mandatory,
                            file: null,
                            change_summary: "",
                          });
                          setPublishModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MdCloudUpload className="text-sm" />
                        New Version
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE RULE MODAL */}
      <GlobalModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Society Rule"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Rule Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Swimming Pool & Clubhouse Safety Rules"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            >
              {RULE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {formData.category === "Other" && (
              <div className="mt-2.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Specify Custom Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elevators, Fire Safety, Balcony Decor..."
                  value={formData.custom_category || ""}
                  onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Description / Summary (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief overview of what this rule covers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Document (PDF or Image - Initial Version 1) *
            </label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif"
              required
              onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-500 cursor-pointer"
            />
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
              Supports PDF or Image documents (PNG, JPG, JPEG, WEBP, GIF) up to 10MB.
            </span>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  Mandatory Acknowledgement Required
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Residents will be prompted to acknowledge this rule upon login or registration.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-[var(--divider)] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--card-inner-bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <GlobalButton type="submit" variant="primary" disabled={formSubmitting}>
              {formSubmitting ? "Creating..." : "Create & Publish"}
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* EDIT RULE METADATA MODAL */}
      <GlobalModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Rule Details"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Rule Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            >
              {RULE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {formData.category === "Other" && (
              <div className="mt-2.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Specify Custom Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elevators, Fire Safety, Balcony Decor..."
                  value={formData.custom_category || ""}
                  onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Description / Summary
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-[var(--divider)] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--card-inner-bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <GlobalButton type="submit" variant="primary" disabled={formSubmitting}>
              {formSubmitting ? "Saving..." : "Save Changes"}
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* PUBLISH NEW VERSION MODAL */}
      <GlobalModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title={`Publish New Version for "${selectedRule?.title}"`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handlePublishSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
            Publishing a new version will archive the previous version and require residents to acknowledge the updated policy if marked mandatory.
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              New Version Document (PDF or Image) *
            </label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif"
              required
              onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-500 cursor-pointer"
            />
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
              Supports PDF or Image documents (PNG, JPG, JPEG, WEBP, GIF) up to 10MB.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Change Summary / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Updated pool timings and guest pass fees"
              value={formData.change_summary}
              onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  Require Mandatory Acknowledgement
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  All residents must accept this new version before performing portal actions.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-[var(--divider)] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPublishModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--card-inner-bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <GlobalButton type="submit" variant="primary" disabled={formSubmitting}>
              {formSubmitting ? "Publishing..." : "Publish Version"}
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* VERSION HISTORY MODAL */}
      <GlobalModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Version History — ${selectedRule?.title}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {(!selectedRule?.versions || selectedRule.versions.length === 0) ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-6">
              No historical versions recorded.
            </p>
          ) : (
            selectedRule.versions.map((ver) => (
              <div
                key={ver.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  ver.is_current
                    ? "bg-blue-500/5 border-blue-500/40"
                    : "bg-[var(--bg-main)] border-[var(--divider)]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      Version {ver.version_number}
                    </span>
                    {ver.is_current && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                        CURRENT
                      </span>
                    )}
                    {ver.is_mandatory && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        MANDATORY
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Published {new Date(ver.created_at).toLocaleDateString()}
                    {ver.publisher && ` by ${ver.publisher.name}`}
                  </p>
                  {ver.change_summary && (
                    <p className="text-xs text-gray-300 mt-1 italic">
                      "{ver.change_summary}"
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActivePdfUrl(ver.file_url);
                    setActivePdfTitle(`${selectedRule.title} (v${ver.version_number})`);
                    setPdfViewerOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  {Boolean((ver.document_name || ver.file_url || "").match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i)) ? (
                    <MdImage className="text-emerald-500" />
                  ) : (
                    <MdPictureAsPdf className="text-red-500" />
                  )}
                  {Boolean((ver.document_name || ver.file_url || "").match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i)) ? "View Image" : "View PDF"}
                </button>
              </div>
            ))
          )}
        </div>
      </GlobalModal>

      {/* ACKNOWLEDGEMENTS AUDIT REPORT MODAL */}
      <GlobalModal
        isOpen={ackModalOpen}
        onClose={() => setAckModalOpen(false)}
        title={`Resident Acknowledgements Audit — ${selectedRule?.title || ""}`}
        size="xxl"
        style={{ maxWidth: "1150px", width: "95vw" }}
      >
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {ackSummary?.total_eligible ?? acknowledgementsData.length}
              </div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                Total Eligible Residents
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-2xl font-bold text-emerald-500 flex items-center justify-center gap-1.5">
                <span>{ackSummary?.total_acknowledged ?? acknowledgementsData.filter((a) => a.status === "ACKNOWLEDGED").length}</span>
                {ackSummary?.acknowledgement_rate !== undefined && (
                  <span className="text-xs font-medium opacity-80">({ackSummary.acknowledgement_rate}%)</span>
                )}
              </div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                Acknowledged & Read
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-2xl font-bold text-amber-500">
                {ackSummary?.total_pending ?? acknowledgementsData.filter((a) => a.status === "PENDING").length}
              </div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                Pending Acceptance
              </div>
            </div>
          </div>

          {/* Controls: Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] self-start">
              {[
                { key: "ALL", label: `All (${acknowledgementsData.length})` },
                { key: "ACKNOWLEDGED", label: `Acknowledged (${acknowledgementsData.filter((a) => a.status === "ACKNOWLEDGED").length})` },
                { key: "PENDING", label: `Pending (${acknowledgementsData.filter((a) => a.status === "PENDING").length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAckFilterStatus(tab.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    ackFilterStatus === tab.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
              <input
                type="text"
                placeholder="Search resident, flat, phone..."
                value={ackSearch}
                onChange={(e) => setAckSearch(e.target.value)}
                style={{ paddingLeft: "34px", paddingRight: "14px" }}
                className="w-full py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="max-h-[55vh] overflow-y-auto border border-[var(--divider)] rounded-xl">
            {ackLoading ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading acknowledgements...
              </div>
            ) : acknowledgementsData.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                No eligible residents found for this society.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--divider)] text-[var(--text-secondary)] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="p-3">Resident</th>
                    <th className="p-3">Unit / Flat</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Acknowledged Time</th>
                    <th className="p-3">Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--divider)]">
                  {acknowledgementsData
                    .filter((a) => {
                      if (ackFilterStatus !== "ALL" && a.status !== ackFilterStatus) return false;
                      if (!ackSearch) return true;
                      const q = ackSearch.toLowerCase();
                      return (
                        (a.user_name || "").toLowerCase().includes(q) ||
                        (a.user_email || "").toLowerCase().includes(q) ||
                        (a.flat_number || "").toLowerCase().includes(q) ||
                        (a.phone || "").toLowerCase().includes(q)
                      );
                    })
                    .map((item, idx) => {
                      const isAck = item.status === "ACKNOWLEDGED";
                      return (
                        <tr key={item.id || item.user_id || idx} className="hover:bg-[var(--card-inner-bg-hover)] transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-[var(--text-primary)]">
                              {item.user_name || "Unknown Resident"}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {item.user_email || item.phone || "No contact info"}
                            </div>
                          </td>
                          <td className="p-3">
                            {item.flat_number ? (
                              <span className="font-semibold px-2 py-0.5 rounded-md bg-[var(--card-inner-bg)] border border-[var(--divider)] text-[var(--text-primary)]">
                                {item.flat_number}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                              {(item.resident_type && item.resident_type !== "RESIDENT")
                                ? item.resident_type
                                : (item.role === "RESIDENT" ? "OWNER" : (item.resident_type || item.role || "OWNER"))}
                            </span>
                          </td>
                          <td className="p-3">
                            {isAck ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                <MdCheckCircle className="text-xs" />
                                Acknowledged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                <MdWarning className="text-xs" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[var(--text-secondary)]">
                            {isAck && item.acknowledged_at ? (
                              <div>
                                <span className="font-medium text-[var(--text-primary)]">
                                  {new Date(item.acknowledged_at).toLocaleString([], {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {item.source && (
                                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                    {item.source}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-500/70 italic text-[11px]">
                                Awaiting acceptance
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isAck && item.version_number ? (
                              <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[11px] border border-blue-500/20">
                                v{item.version_number}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </GlobalModal>

      {/* PDF VIEWER POPUP MODAL */}
      {pdfViewerOpen && activePdfUrl && (
        <PdfViewer
          url={activePdfUrl}
          name={activePdfTitle}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}
    </div>
  );
}

