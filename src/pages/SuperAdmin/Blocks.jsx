import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import {
  MdDelete,
  MdLayers,
  MdHomeWork,
  MdArrowBack,
  MdAdd,
  MdDomain,
  MdApartment,
  MdStraighten,
  MdCheckCircle,
  MdSpeed,
  MdDoneAll,
  MdTune,
  MdSquareFoot,
  MdLaunch,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import Select from "../../components/common/Select";
import { toast } from "react-toastify";
import FieldError from "../../components/common/FieldError";
import { getTitleError, getNumberError, getPositiveAmountError } from "../../utils/validators";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalModal from "../../components/common/GlobalModal";
import { AreaAssignModal } from "../Admin/ManageProperty";

/* Tone map keyed by API values (APARTMENT / ROW_HOUSE / COMMERCIAL)
   with legacy label fallbacks ("Apartments" / "Row Houses"). */
const PROPERTY_TONES = {
  APARTMENT:    { c: "#2FC27E", bg: "rgba(47, 194, 126, 0.13)",  bd: "rgba(47, 194, 126, 0.28)" },
  ROW_HOUSE:    { c: "#9F87D7", bg: "rgba(159, 135, 215, 0.13)", bd: "rgba(159, 135, 215, 0.28)" },
  COMMERCIAL:   { c: "#60A5FA", bg: "rgba(96, 165, 250, 0.13)",  bd: "rgba(96, 165, 250, 0.28)" },
  Apartments:   { c: "#2FC27E", bg: "rgba(47, 194, 126, 0.13)",  bd: "rgba(47, 194, 126, 0.28)" },
  "Row Houses": { c: "#9F87D7", bg: "rgba(159, 135, 215, 0.13)", bd: "rgba(159, 135, 215, 0.28)" },
  Commercial:   { c: "#60A5FA", bg: "rgba(96, 165, 250, 0.13)",  bd: "rgba(96, 165, 250, 0.28)" },
};

const TYPE_ICONS = {
  APARTMENT:  <FaBuilding size={13} />,
  ROW_HOUSE:  <MdHomeWork size={14} />,
  COMMERCIAL: <MdDomain size={15} />,
};

function toneFor(type) {
  return PROPERTY_TONES[type] || PROPERTY_TONES.APARTMENT;
}

function isRowHouse(type) {
  return type === "ROW_HOUSE" || type === "Row Houses";
}

export default function Blocks() {
  const { societyId } = useParams();
  const navigate      = useNavigate();
  const { t }         = useLang();

  const [societyName, setSocietyName]   = useState("Society");
  const [blocks,      setBlocks]        = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [submitting,  setSubmitting]    = useState(false);
  const [showModal,   setShowModal]     = useState(false);

  // Form states matching ManageProperty
  const [name,          setName]          = useState("");
  const [propertyType,  setPropertyType]  = useState("APARTMENT");
  const [floorCount,    setFloorCount]    = useState("");
  const [flatsPerFloor, setFlatsPerFloor] = useState("");
  const [totalHouses,   setTotalHouses]   = useState("");
  const [commonArea,    setCommonArea]    = useState("");
  const [areaStrategy,  setAreaStrategy]  = useState("BOTH"); // "SAME" | "SEPARATE" | "BOTH"
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [formError,     setFormError]     = useState("");

  // 3-Tier BHK Draft Configuration State
  const [blockDefaultBhk, setBlockDefaultBhk]   = useState("2BHK");
  const [floorsLayout, setFloorsLayout]         = useState([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [dimWarning, setDimWarning]             = useState("");
  const prevDimsRef = useRef({ floors: 0, units: 0, hasCustom: false });

  // Row House Area Assign Modal states
  const [areaAssignFlats, setAreaAssignFlats] = useState(null);
  const [areaAssignValues, setAreaAssignValues] = useState({});
  const [areaAssignInitialMode, setAreaAssignInitialMode] = useState("SAME");
  const [areaAssignBlockName, setAreaAssignBlockName] = useState("");
  const [savingAreas, setSavingAreas] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  useEffect(() => {
    loadSocietyName();
    loadBlocks();
  }, [societyId]);

  const loadSocietyName = async () => {
    try {
      const res = await API.get(`/blocks/getname/${societyId}`);
      setSocietyName(res.data?.name || "Society");
    } catch (err) {
      console.error("Failed to load society name", err);
    }
  };

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/blocks/${societyId}`, {
        headers: { "x-society-id": societyId },
      });
      setBlocks(res.data || []);
    } catch (err) {
      console.error("Failed to load blocks", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Synchronize draft floor and flat layout when inputs change ──
  useEffect(() => {
    if (propertyType !== "APARTMENT") {
      setFloorsLayout([]);
      setDimWarning("");
      return;
    }
    const fc = parseInt(floorCount, 10);
    const fp = parseInt(flatsPerFloor, 10);
    if (isNaN(fc) || fc < 1 || isNaN(fp) || fp < 1) {
      setFloorsLayout([]);
      setDimWarning("");
      return;
    }

    if (
      prevDimsRef.current.hasCustom &&
      (fc < prevDimsRef.current.floors || fp < prevDimsRef.current.units)
    ) {
      setDimWarning("Notice: Decreasing floor or unit count removes configured flats from the draft layout.");
    } else {
      setDimWarning("");
    }

    setFloorsLayout((prevFloors) => {
      const blockPrefix = (name || "").trim() || "Wing";
      const newFloors = [];

      for (let f = 1; f <= fc; f++) {
        const existingFloor = prevFloors[f - 1];
        const floorDefault = existingFloor?.floorDefaultBhk || blockDefaultBhk || "2BHK";
        const mode = existingFloor?.mode || "DEFAULT";

        const newFlats = [];
        for (let u = 1; u <= fp; u++) {
          const flatNum = `${blockPrefix}-${f}${u.toString().padStart(2, "0")}`;
          const existingFlat = existingFloor?.flats?.[u - 1];

          if (existingFlat) {
            newFlats.push({
              flat_number: flatNum,
              flat_type: existingFlat.flat_type || floorDefault,
              isOverridden: !!existingFlat.isOverridden,
            });
          } else {
            newFlats.push({
              flat_number: flatNum,
              flat_type: floorDefault,
              isOverridden: false,
            });
          }
        }

        const mixedCounts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
        newFlats.forEach((fl) => {
          if (mixedCounts[fl.flat_type] !== undefined) {
            mixedCounts[fl.flat_type]++;
          }
        });

        newFloors.push({
          floor_number: f,
          mode,
          floorDefaultBhk: floorDefault,
          mixedCounts: existingFloor?.mode === "MIXED" && existingFloor.mixedCounts ? existingFloor.mixedCounts : mixedCounts,
          flats: newFlats,
        });
      }

      const isCustom = newFloors.some(f => f.mode === "MIXED" || f.flats.some(fl => fl.isOverridden || fl.flat_type !== blockDefaultBhk));
      prevDimsRef.current = { floors: fc, units: fp, hasCustom: isCustom };

      return newFloors;
    });
  }, [propertyType, floorCount, flatsPerFloor, name]);

  // Level 1: Block default BHK change
  const handleBlockDefaultChange = (newBhk) => {
    setBlockDefaultBhk(newBhk);
    setFloorsLayout(prev => prev.map(floor => {
      if (floor.mode === "DEFAULT") {
        const updatedFlats = floor.flats.map(fl =>
          fl.isOverridden ? fl : { ...fl, flat_type: newBhk }
        );
        const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
        updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
        return {
          ...floor,
          floorDefaultBhk: newBhk,
          flats: updatedFlats,
          mixedCounts: counts,
        };
      }
      return floor;
    }));
  };

  // Level 2: Floor default BHK change
  const handleFloorDefaultChange = (floorIndex, newBhk) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const updatedFlats = floor.flats.map(fl =>
        fl.isOverridden ? fl : { ...fl, flat_type: newBhk }
      );
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return {
        ...floor,
        mode: "DEFAULT",
        floorDefaultBhk: newBhk,
        flats: updatedFlats,
        mixedCounts: counts,
      };
    }));
  };

  // Level 2: Floor mode change
  const handleFloorModeChange = (floorIndex, newMode) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const fp = parseInt(flatsPerFloor, 10) || 0;
      let mixedCounts = floor.mixedCounts || { "1BHK": 0, "2BHK": 0, "3BHK": 0 };

      if (newMode === "MIXED") {
        const sum = (mixedCounts["1BHK"] || 0) + (mixedCounts["2BHK"] || 0) + (mixedCounts["3BHK"] || 0);
        if (sum !== fp) {
          const def = floor.floorDefaultBhk || blockDefaultBhk || "2BHK";
          mixedCounts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
          mixedCounts[def] = fp;
        }
      }

      return {
        ...floor,
        mode: newMode,
        mixedCounts,
      };
    }));
  };

  // Level 2: Stepper counter change in MIXED mode
  const handleMixedCountChange = (floorIndex, bhkType, delta) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const currentCounts = { ...(floor.mixedCounts || { "1BHK": 0, "2BHK": 0, "3BHK": 0 }) };
      const currentVal = currentCounts[bhkType] || 0;
      const newVal = Math.max(0, currentVal + delta);
      currentCounts[bhkType] = newVal;

      const flatTypesList = [];
      ["1BHK", "2BHK", "3BHK"].forEach(tKey => {
        const cnt = currentCounts[tKey] || 0;
        for (let i = 0; i < cnt; i++) flatTypesList.push(tKey);
      });

      const updatedFlats = floor.flats.map((fl, fIdx) => {
        const assignedType = flatTypesList[fIdx] || floor.floorDefaultBhk || "2BHK";
        return {
          ...fl,
          flat_type: assignedType,
          isOverridden: false,
        };
      });

      return {
        ...floor,
        mixedCounts: currentCounts,
        flats: updatedFlats,
      };
    }));
  };

  // Level 3: Individual flat override
  const handleFlatBhkChange = (floorIndex, flatIndex, newBhk) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const updatedFlats = floor.flats.map((fl, fIdx) => {
        if (fIdx !== flatIndex) return fl;
        return {
          ...fl,
          flat_type: newBhk,
          isOverridden: true,
        };
      });
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return {
        ...floor,
        flats: updatedFlats,
        mixedCounts: counts,
      };
    }));
  };

  // Level 3: Revert individual flat override
  const handleRevertFlatOverride = (floorIndex, flatIndex) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const fallbackBhk = floor.floorDefaultBhk || blockDefaultBhk || "2BHK";
      const updatedFlats = floor.flats.map((fl, fIdx) => {
        if (fIdx !== flatIndex) return fl;
        return {
          ...fl,
          flat_type: fallbackBhk,
          isOverridden: false,
        };
      });
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return {
        ...floor,
        flats: updatedFlats,
        mixedCounts: counts,
      };
    }));
  };

  // Layout validation
  const layoutValidation = useMemo(() => {
    if (propertyType !== "APARTMENT") {
      return { isValid: true, errors: [] };
    }
    const fc = parseInt(floorCount, 10);
    const fp = parseInt(flatsPerFloor, 10);
    if (!fc || fc < 1 || !fp || fp < 1) {
      return { isValid: false, errors: ["Please enter valid floor and unit counts."] };
    }
    if (!floorsLayout.length || floorsLayout.length !== fc) {
      return { isValid: false, errors: ["Layout preview is generating..."] };
    }

    const errors = [];
    floorsLayout.forEach((floor, idx) => {
      const fNum = floor.floor_number || (idx + 1);
      if (floor.mode === "MIXED") {
        const sum = (floor.mixedCounts?.["1BHK"] || 0) + (floor.mixedCounts?.["2BHK"] || 0) + (floor.mixedCounts?.["3BHK"] || 0);
        if (sum !== fp) {
          errors.push(`Floor ${fNum} mixed distribution sum (${sum}) must equal ${fp} units.`);
        }
      }
      floor.flats.forEach(fl => {
        if (!fl.flat_type || !["1BHK", "2BHK", "3BHK"].includes(fl.flat_type)) {
          errors.push(`Unit ${fl.flat_number} must have a valid BHK type.`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [propertyType, floorCount, flatsPerFloor, floorsLayout]);

  // Overall BHK Breakdown summary
  const overallBhkSummary = useMemo(() => {
    const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0, total: 0 };
    floorsLayout.forEach(floor => {
      floor.flats.forEach(fl => {
        if (counts[fl.flat_type] !== undefined) {
          counts[fl.flat_type]++;
        }
        counts.total++;
      });
    });
    return counts;
  }, [floorsLayout]);

  const stats = useMemo(() => {
    const totalFloors = blocks.reduce((sum, b) => sum + (b.floorCount || 0), 0);
    const apartments = blocks.filter(b => !isRowHouse(b.property_type)).length;
    const rowHouses = blocks.filter(b => isRowHouse(b.property_type)).length;
    return { total: blocks.length, totalFloors, apartments, rowHouses };
  }, [blocks]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setFieldErrors({});
    setFormError("");

    const nameErr = getTitleError(name, "Block/Tower name");
    if (nameErr) {
      toast.error(nameErr);
      setFieldErrors(p => ({ ...p, name: nameErr }));
      return;
    }

    let payload = {
      name: name.trim(),
      society_id: societyId,
      property_type: propertyType,
    };

    if (propertyType === "ROW_HOUSE") {
      const housesErr = getNumberError(totalHouses, "Total Houses", { min: 1, allowZero: false, allowDecimal: false });
      if (housesErr) {
        toast.error(housesErr);
        setFieldErrors(p => ({ ...p, totalHouses: housesErr }));
        return;
      }
      payload.flats_per_floor = Number(totalHouses);
      if (areaStrategy !== "SEPARATE" && commonArea) {
        const areaErr = getPositiveAmountError(commonArea, "Built-up Area");
        if (areaErr) {
          toast.error(areaErr);
          setFieldErrors(p => ({ ...p, commonArea: areaErr }));
          return;
        }
        payload.area_sqft = Number(commonArea);
      }
    } else {
      const floorErr = getNumberError(floorCount, "No. of Floors", { min: 1, allowZero: false, allowDecimal: false });
      if (floorErr) {
        toast.error(floorErr);
        setFieldErrors(p => ({ ...p, floorCount: floorErr }));
        return;
      }
      const flatsPerFloorErr = getNumberError(flatsPerFloor, "Flats per Floor", { min: 1, allowZero: false, allowDecimal: false });
      if (flatsPerFloorErr) {
        toast.error(flatsPerFloorErr);
        setFieldErrors(p => ({ ...p, flatsPerFloor: flatsPerFloorErr }));
        return;
      }

      if (!layoutValidation.isValid) {
        const errMsg = layoutValidation.errors[0] || "Invalid BHK layout configuration.";
        toast.error(errMsg);
        setFormError(errMsg);
        return;
      }

      payload.floor_count = Number(floorCount);
      payload.flats_per_floor = Number(flatsPerFloor);
      payload.floors = floorsLayout.map(f => ({
        floor_number: f.floor_number,
        flats: f.flats.map(fl => ({
          flat_number: fl.flat_number,
          flat_type: fl.flat_type,
        })),
      }));
    }

    setSubmitting(true);
    try {
      const res = await API.post("/blocks", payload, {
        headers: { "x-society-id": societyId },
      });
      toast.success(t("blkCreateSuccess") || "Block created successfully!");

      const createdBlockName = name.trim();
      const initialCommonArea = commonArea;

      setName("");
      setFloorCount("");
      setFlatsPerFloor("");
      setTotalHouses("");
      setCommonArea("");
      setPropertyType("APARTMENT");
      setBlockDefaultBhk("2BHK");
      setFloorsLayout([]);
      setActiveFloorIndex(0);
      setShowModal(false);

      // For ROW_HOUSE: open the Area Assignment Modal
      if (propertyType === "ROW_HOUSE") {
        const blockId = res.data?.block?.id;
        if (blockId) {
          const flatsRes = await API.get(`/flats/list?blockId=${blockId}`, {
            headers: { "x-society-id": societyId },
          });
          const newFlats = flatsRes.data || [];
          setAreaAssignFlats(newFlats);
          setAreaAssignBlockName(createdBlockName);
          const vals = {};
          newFlats.forEach(f => {
            vals[f.id] = (areaStrategy !== "SEPARATE" && initialCommonArea)
              ? initialCommonArea
              : (f.area_sqft != null ? String(f.area_sqft) : "");
          });
          setAreaAssignValues(vals);
          setAreaAssignInitialMode(areaStrategy === "SEPARATE" || areaStrategy === "BOTH" ? "SEPARATE" : "SAME");
        }
      }

      loadBlocks();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create block";
      toast.error(msg);
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const saveAreaAssignments = async () => {
    setSavingAreas(true);
    try {
      const updates = Object.entries(areaAssignValues)
        .filter(([, v]) => v !== "" && v !== null && !isNaN(Number(v)))
        .map(([id, area_sqft]) => ({ flat_id: Number(id), area_sqft: Number(area_sqft) }));
      if (updates.length === 0) {
        setAreaAssignFlats(null);
        return;
      }
      await API.put("/flats/bulk-update", { flats: updates }, {
        headers: { "x-society-id": societyId },
      });
      toast.success(t("mpSavedRowHouses", { n: updates.length }) || `Saved area for ${updates.length} row houses!`);
      setAreaAssignFlats(null);
      setAreaAssignValues({});
      loadBlocks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save row house areas");
    } finally {
      setSavingAreas(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      setDeleteConfirm(p => ({ ...p, loading: true }));
      await API.delete(`/blocks/${deleteConfirm.id}`, {
        headers: { "x-society-id": societyId },
      });
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      toast.success("Block deleted successfully");
      loadBlocks();
    } catch (err) {
      console.error("Delete block error", err);
      toast.error(err.response?.data?.message || "Failed to delete block");
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

  const columns = [
    {
      key: "name",
      header: t("blkColBlock") || "Block Name",
      render: (b) => {
        const tone = toneFor(b.property_type);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: tone.bg,
                color: tone.c,
                border: `1px solid ${tone.bd}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {TYPE_ICONS[b.property_type] || <FaBuilding size={13} />}
            </div>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {(t("blkBlockLabel") || "Block")} {b.name}
            </span>
          </div>
        );
      },
    },
    {
      key: "property_type",
      header: "Type",
      render: (b) => (
        <GlobalBadge
          variant="info"
          style={{
            color: toneFor(b.property_type).c,
            background: toneFor(b.property_type).bg,
            border: `1px solid ${toneFor(b.property_type).bd}`,
          }}
        >
          {b.property_type === "ROW_HOUSE" ? "Row Houses" : b.property_type === "APARTMENT" ? "Apartments" : b.property_type || "Apartments"}
        </GlobalBadge>
      ),
    },
    {
      key: "floorCount",
      header: "Floors",
      render: (b) =>
        isRowHouse(b.property_type) ? (
          <span style={{ color: "var(--text-secondary)", opacity: 0.6 }}>—</span>
        ) : (
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.floorCount || 0}</span>
        ),
    },
    {
      key: "actions",
      header: t("billActionCol") || "Actions",
      align: "right",
      render: (b) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Link to={`/superadmin/block/${b.id}/floors`} style={{ textDecoration: "none" }}>
            <GlobalButton variant="secondary" size="sm" icon={MdLayers}>
              Manage
            </GlobalButton>
          </Link>
          <GlobalButton
            variant="delete"
            size="sm"
            icon={MdDelete}
            onClick={() => setDeleteConfirm({ isOpen: true, id: b.id, loading: false })}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="sa-page animate-fadeIn space-y-5">
      {/* ── HERO ── */}
      <div className="sa-page-er" style={{ flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div className="er-icon er-icon--amenity">
            <MdHomeWork size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sa-page-title">{societyName}</h1>
            <p className="sa-page-subtitle">
              {t("blkManageBlocks") || "Manage Blocks"} · {blocks.length} block{blocks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <GlobalButton
            variant="secondary"
            size="sm"
            icon={MdLaunch}
            onClick={() => navigate(`/superadmin/property?societyId=${societyId}`)}
            title="Open comprehensive property & block manager"
          >
            Full Property View
          </GlobalButton>
          <GlobalButton
            variant="add"
            borderDraw
            size="sm"
            icon={MdAdd}
            onClick={() => setShowModal(true)}
          >
            {t("createBlock") || "Create Block"}
          </GlobalButton>
          <GlobalButton
            variant="secondary"
            size="sm"
            icon={MdArrowBack}
            onClick={() => navigate(-1)}
          >
            {t("socBack") || "Back"}
          </GlobalButton>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-icon" style={{ "--stat-c": "var(--accent)", "--stat-bg": "var(--accent-soft)" }}>
            <MdHomeWork size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sa-stat-value">{stats.total}</div>
            <div className="sa-stat-label">Total Blocks</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon" style={{ "--stat-c": "#2FC27E", "--stat-bg": "rgba(47, 194, 126, 0.13)" }}>
            <FaBuilding size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sa-stat-value">{stats.apartments}</div>
            <div className="sa-stat-label">Apartment Blocks</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon" style={{ "--stat-c": "#9F87D7", "--stat-bg": "rgba(159, 135, 215, 0.13)" }}>
            <MdHomeWork size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sa-stat-value">{stats.rowHouses}</div>
            <div className="sa-stat-label">Row Houses / Villas</div>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon" style={{ "--stat-c": "#60A5FA", "--stat-bg": "rgba(96, 165, 250, 0.13)" }}>
            <MdStraighten size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sa-stat-value">{stats.totalFloors}</div>
            <div className="sa-stat-label">Total Floors</div>
          </div>
        </div>
      </div>

      {/* ── CREATE BLOCK MODAL (MATCHING MANAGE PROPERTY 3-TIER LOGIC) ── */}
      <GlobalModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setFormError(""); }}
        title={t("mpCreateNewBlock") || "Create New Block"}
        subtitle={`Add and configure blocks for ${societyName}`}
        icon={MdAdd}
        size="xl"
        showFooter
        submitLabel={t("mpCreate") || "Create"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleSubmit}
        submitLoading={submitting}
        submitDisabled={submitting || (propertyType === "APARTMENT" && (!layoutValidation.isValid || floorsLayout.length === 0))}
        submitIcon={MdAdd}
        submitVariant="add"
        submitBorderDraw
        bodyClassName="modal-scroll-thin"
      >
        {formError && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--stat-red-color)", marginBottom: 14 }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                {t("mpPhaseName") || "Block / Wing Name"}
              </label>
              <input
                className="input"
                placeholder={t("mpPhaseNamePh") || "e.g. Tower A, Wing B"}
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }}
                required
              />
              <FieldError error={fieldErrors.name} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                {t("mpPropertyType") || "Property Type"}
              </label>
              <Select
                className="input"
                value={propertyType}
                onChange={e => {
                  setPropertyType(e.target.value);
                  setFloorCount(""); setFlatsPerFloor(""); setTotalHouses(""); setCommonArea("");
                }}
                rootStyle={{ width: "100%" }}
                style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%" }}
              >
                <option value="APARTMENT">🏢 {t("mpTypeApartmentFull") || "Apartment Building / High Rise"}</option>
                <option value="ROW_HOUSE">🏡 {t("mpTypeRowHouseFull") || "Row House / Villa Enclave"}</option>
              </Select>
            </div>
          </div>

          {/* Row Houses Configuration */}
          {propertyType === "ROW_HOUSE" ? (
            <div style={{
              background: "rgba(var(--acct-purple-rgb,139,92,246),0.06)",
              border: "1px solid rgba(var(--acct-purple-rgb,139,92,246),0.25)",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(var(--acct-purple-rgb,139,92,246),0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  <MdHomeWork size={16} />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                    {t("mpRowHouseConfig") || "Row House Configuration"}
                  </span>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                    {t("mpRowHouseConfigHint") || "Quickly generate individual houses with flexible square footage strategies"}
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  {t("mpTotalHouses") || "Total Number of Houses / Villas"}
                </label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder={t("mpTotalHousesPh") || "e.g. 24"}
                  value={totalHouses}
                  onChange={e => setTotalHouses(e.target.value)}
                  style={{ height: 42, borderRadius: 10, fontSize: 13, background: "var(--card-bg)", width: "100%", boxSizing: "border-box" }}
                  required
                />
                <FieldError error={fieldErrors.totalHouses} />
              </div>

              {/* Area Strategy */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("mpAreaStrategy") || "Built-Up Area Allocation Strategy"}
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div
                    onClick={() => setAreaStrategy("BOTH")}
                    style={{
                      background: areaStrategy === "BOTH" ? "rgba(var(--acct-purple-rgb,139,92,246),0.15)" : "var(--card-bg)",
                      border: areaStrategy === "BOTH" ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: areaStrategy === "BOTH" ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                        <MdSpeed size={14} /> 🔄 {t("mpUseBoth") || "Use Both (Recommended)"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                      {t("mpUseBothHint") || "Pre-fill all houses with a standard size, then adjust unique units."}
                    </p>
                  </div>

                  <div
                    onClick={() => setAreaStrategy("SAME")}
                    style={{
                      background: areaStrategy === "SAME" ? "rgba(var(--acct-purple-rgb,139,92,246),0.15)" : "var(--card-bg)",
                      border: areaStrategy === "SAME" ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: areaStrategy === "SAME" ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                      <MdDoneAll size={14} /> ⚡ {t("mpAllSame") || "Make All Same"}
                    </span>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                      {t("mpAllSameHint") || "Apply identical square footage to all houses."}
                    </p>
                  </div>

                  <div
                    onClick={() => setAreaStrategy("SEPARATE")}
                    style={{
                      background: areaStrategy === "SEPARATE" ? "rgba(var(--acct-purple-rgb,139,92,246),0.15)" : "var(--card-bg)",
                      border: areaStrategy === "SEPARATE" ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: areaStrategy === "SEPARATE" ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                      <MdTune size={14} /> ✍️ {t("mpSeparate") || "Separate Filling"}
                    </span>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                      {t("mpSeparateHint") || "Input custom built-up area for each house individually."}
                    </p>
                  </div>
                </div>
              </div>

              {areaStrategy !== "SEPARATE" ? (
                <div style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {areaStrategy === "BOTH" ? (t("mpCommonBaseArea") || "Common Base Area") : (t("mpUniformArea") || "Uniform Area")}
                    </label>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", background: "var(--card-inner-bg)", border: "1px solid rgba(var(--acct-purple-rgb,139,92,246),0.3)", borderRadius: 10, padding: "0 12px", height: 42 }}>
                    <MdSquareFoot size={18} style={{ color: "var(--accent)", marginRight: 8, flexShrink: 0 }} />
                    <input
                      className="mp-bare-input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="1500"
                      value={commonArea}
                      onChange={e => setCommonArea(e.target.value)}
                      style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 13, fontWeight: 700, outline: "none" }}
                    />
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>{t("mpSqft") || "sq.ft"}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>Presets:</span>
                    {[1000, 1200, 1500, 1800, 2000, 2400].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setCommonArea(String(val))}
                        style={{
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: commonArea === String(val) ? "var(--accent)" : "var(--card-inner-bg)",
                          color: commonArea === String(val) ? "#fff" : "var(--text-secondary)",
                          border: "1px solid var(--glass-border)",
                          cursor: "pointer"
                        }}
                      >
                        {val} sq.ft
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Apartment Configuration */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    No. of Floors
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    placeholder="e.g. 10"
                    value={floorCount}
                    onChange={e => setFloorCount(e.target.value)}
                    style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }}
                    required
                  />
                  <FieldError error={fieldErrors.floorCount} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Units per Floor
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    placeholder="e.g. 4"
                    value={flatsPerFloor}
                    onChange={e => setFlatsPerFloor(e.target.value)}
                    style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }}
                    required
                  />
                  <FieldError error={fieldErrors.flatsPerFloor} />
                </div>
              </div>

              {/* 3-Tier BHK Draft Layout Configuration */}
              {floorsLayout.length > 0 && (
                <div style={{
                  background: "rgba(var(--acct-purple-rgb, 139,92,246), 0.04)",
                  border: "1px solid rgba(var(--acct-purple-rgb, 139,92,246), 0.2)",
                  borderRadius: 16,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginTop: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa" }}>
                        <MdLayers size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                          BHK Layout & Interactive Draft Preview
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                          Configure block defaults, floor distributions, or customize individual units
                        </p>
                      </div>
                    </div>

                    {layoutValidation.isValid ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                        background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)"
                      }}>
                        <MdCheckCircle size={13} /> Layout Balanced & Ready
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                        background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)"
                      }}>
                        Incomplete / Imbalanced
                      </span>
                    )}
                  </div>

                  {dimWarning && (
                    <div style={{
                      padding: "8px 12px", borderRadius: 10,
                      background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                      color: "#fbbf24", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6
                    }}>
                      <span>⚠️</span> {dimWarning}
                    </div>
                  )}

                  {/* Level 1: Block Default */}
                  <div style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10
                  }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Level 1: Block-Wide Default
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                        Applies to all eligible floors and flats in {name.trim() || "this block"}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {["1BHK", "2BHK", "3BHK"].map(bhk => {
                        const isSelected = blockDefaultBhk === bhk;
                        return (
                          <button
                            key={bhk}
                            type="button"
                            onClick={() => handleBlockDefaultChange(bhk)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.16s ease",
                              background: isSelected ? "var(--accent)" : "var(--card-inner-bg)",
                              color: isSelected ? "#fff" : "var(--text-primary)",
                              border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}`,
                            }}
                          >
                            {bhk}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Total Flats</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{overallBhkSummary.total}</div>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, textTransform: "uppercase" }}>1BHK</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#818cf8", marginTop: 2 }}>{overallBhkSummary["1BHK"]}</div>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>2BHK</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#a78bfa", marginTop: 2 }}>{overallBhkSummary["2BHK"]}</div>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: "#f472b6", fontWeight: 700, textTransform: "uppercase" }}>3BHK</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#f472b6", marginTop: 2 }}>{overallBhkSummary["3BHK"]}</div>
                    </div>
                  </div>

                  {/* Level 2: Floor Pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Level 2 & 3: Floor & Flat Configuration
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                      {floorsLayout.map((flr, idx) => {
                        const isActive = idx === activeFloorIndex;
                        const fp = parseInt(flatsPerFloor, 10) || 0;
                        const sum = (flr.mixedCounts?.["1BHK"] || 0) + (flr.mixedCounts?.["2BHK"] || 0) + (flr.mixedCounts?.["3BHK"] || 0);
                        const hasFloorDiscrepancy = flr.mode === "MIXED" && sum !== fp;

                        return (
                          <button
                            key={flr.floor_number}
                            type="button"
                            onClick={() => setActiveFloorIndex(idx)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: isActive ? "rgba(var(--acct-purple-rgb, 139,92,246), 0.18)" : "var(--card-inner-bg)",
                              border: `1.5px solid ${isActive ? "var(--accent)" : hasFloorDiscrepancy ? "#ef4444" : "var(--glass-border)"}`,
                              color: isActive ? "var(--accent)" : hasFloorDiscrepancy ? "#ef4444" : "var(--text-primary)",
                            }}
                          >
                            <span>Floor {flr.floor_number}</span>
                            {hasFloorDiscrepancy ? (
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>!</span>
                            ) : flr.mode === "MIXED" ? (
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>Mixed</span>
                            ) : (
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                                {flr.floorDefaultBhk}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Floor Detail Card */}
                  {floorsLayout[activeFloorIndex] && (() => {
                    const currentFloor = floorsLayout[activeFloorIndex];
                    const fp = parseInt(flatsPerFloor, 10) || 0;
                    const sum = (currentFloor.mixedCounts?.["1BHK"] || 0) + (currentFloor.mixedCounts?.["2BHK"] || 0) + (currentFloor.mixedCounts?.["3BHK"] || 0);
                    const isFloorBalanced = currentFloor.mode === "DEFAULT" || sum === fp;

                    return (
                      <div style={{
                        background: "var(--card-bg)",
                        border: `1.5px solid ${isFloorBalanced ? "var(--glass-border)" : "rgba(239,68,68,0.4)"}`,
                        borderRadius: 14,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                              Floor {currentFloor.floor_number} Controls ({currentFloor.flats.length} Flats)
                            </span>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                              {currentFloor.mode === "DEFAULT" ? "All units inherit floor default" : "Mixed distribution mode"}
                            </p>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--card-inner-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--glass-border)" }}>
                            <button
                              type="button"
                              onClick={() => handleFloorModeChange(activeFloorIndex, "DEFAULT")}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "none",
                                background: currentFloor.mode === "DEFAULT" ? "var(--accent)" : "transparent",
                                color: currentFloor.mode === "DEFAULT" ? "#fff" : "var(--text-secondary)",
                              }}
                            >
                              Uniform
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFloorModeChange(activeFloorIndex, "MIXED")}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "none",
                                background: currentFloor.mode === "MIXED" ? "var(--accent)" : "transparent",
                                color: currentFloor.mode === "MIXED" ? "#fff" : "var(--text-secondary)",
                              }}
                            >
                              Mixed
                            </button>
                          </div>
                        </div>

                        {currentFloor.mode === "DEFAULT" ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "10px 12px", background: "var(--card-inner-bg)", borderRadius: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                              Floor {currentFloor.floor_number} Default:
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {["1BHK", "2BHK", "3BHK"].map(bhk => (
                                <button
                                  key={bhk}
                                  type="button"
                                  onClick={() => handleFloorDefaultChange(activeFloorIndex, bhk)}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    border: `1.5px solid ${currentFloor.floorDefaultBhk === bhk ? "var(--accent)" : "var(--glass-border)"}`,
                                    background: currentFloor.floorDefaultBhk === bhk ? "rgba(139,92,246,0.18)" : "var(--card-bg)",
                                    color: currentFloor.floorDefaultBhk === bhk ? "var(--accent)" : "var(--text-primary)",
                                  }}
                                >
                                  {bhk}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", background: "var(--card-inner-bg)", borderRadius: 10, border: isFloorBalanced ? "1px solid var(--glass-border)" : "1px solid rgba(239,68,68,0.3)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                Steppers (Sum must equal {fp})
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: isFloorBalanced ? "#4ade80" : "#f87171" }}>
                                {isFloorBalanced ? "✓ Balanced" : "⚠️ Sum:"} {sum} / {fp}
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                              {["1BHK", "2BHK", "3BHK"].map(bhk => {
                                const cnt = currentFloor.mixedCounts?.[bhk] || 0;
                                return (
                                  <div key={bhk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--glass-border)" }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{bhk}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleMixedCountChange(activeFloorIndex, bhk, -1)}
                                        disabled={cnt <= 0}
                                        style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", fontWeight: 800, cursor: cnt <= 0 ? "not-allowed" : "pointer", opacity: cnt <= 0 ? 0.4 : 1 }}
                                      >
                                        -
                                      </button>
                                      <span style={{ fontSize: 13, fontWeight: 800, minWidth: 20, textAlign: "center", color: "var(--text-primary)" }}>{cnt}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleMixedCountChange(activeFloorIndex, bhk, 1)}
                                        disabled={sum >= fp}
                                        style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", fontWeight: 800, cursor: sum >= fp ? "not-allowed" : "pointer", opacity: sum >= fp ? 0.4 : 1 }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Level 3: Individual Units Grid */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Individual Units on Floor {currentFloor.floor_number}
                          </span>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                            {currentFloor.flats.map((fl, uIdx) => {
                              const isOverridden = !!fl.isOverridden;
                              const bhkStyle = fl.flat_type === "1BHK"
                                ? { bg: "rgba(99,102,241,0.12)", color: "#818cf8", border: "rgba(99,102,241,0.25)" }
                                : fl.flat_type === "2BHK"
                                ? { bg: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "rgba(139,92,246,0.25)" }
                                : { bg: "rgba(236,72,153,0.12)", color: "#f472b6", border: "rgba(236,72,153,0.25)" };

                              return (
                                <div
                                  key={fl.flat_number}
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    background: "var(--card-inner-bg)",
                                    border: `1px solid ${isOverridden ? "rgba(139,92,246,0.4)" : "var(--glass-border)"}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{fl.flat_number}</span>
                                    {isOverridden && (
                                      <button
                                        type="button"
                                        onClick={() => handleRevertFlatOverride(activeFloorIndex, uIdx)}
                                        title="Revert to floor default"
                                        style={{ border: "none", background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                                      >
                                        ↺ Reset
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", gap: 3 }}>
                                    {["1BHK", "2BHK", "3BHK"].map(bhkOpt => {
                                      const isMatch = fl.flat_type === bhkOpt;
                                      return (
                                        <button
                                          key={bhkOpt}
                                          type="button"
                                          onClick={() => handleFlatBhkChange(activeFloorIndex, uIdx, bhkOpt)}
                                          style={{
                                            flex: 1,
                                            padding: "3px 0",
                                            borderRadius: 5,
                                            fontSize: 10,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            border: isMatch ? `1px solid ${bhkStyle.border}` : "1px solid var(--glass-border)",
                                            background: isMatch ? bhkStyle.bg : "var(--card-bg)",
                                            color: isMatch ? bhkStyle.color : "var(--text-secondary)",
                                          }}
                                        >
                                          {bhkOpt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </form>
      </GlobalModal>

      {/* ── ROW HOUSES AREA ASSIGN MODAL ── */}
      {areaAssignFlats && (
        <AreaAssignModal
          flats={areaAssignFlats}
          values={areaAssignValues}
          setValues={setAreaAssignValues}
          onSave={saveAreaAssignments}
          onSkip={() => setAreaAssignFlats(null)}
          saving={savingAreas}
          initialMode={areaAssignInitialMode}
          blockName={areaAssignBlockName}
        />
      )}

      {/* ── BLOCKS TABLE ── */}
      <GlobalTable
        columns={columns}
        data={blocks}
        loading={loading}
        emptyMessage={t("blkEmpty") || "No blocks found."}
        emptySubtext="Click 'Create Block' above to start adding blocks, floors and flats."
        emptyIcon={MdLayers}
      />

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title={t("blkConfirmDelete") || "Delete Block"}
        message="Are you sure you want to delete this block? This will permanently remove all associated floors and flats."
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}
