/**
 * Format block name without duplicate "Block" prefix.
 * e.g. "Block - A" -> "Block - A"
 *      "Block A"   -> "Block A"
 *      "Wing B"    -> "Wing B"
 *      "Tower 1"   -> "Tower 1"
 *      "A"         -> "Block A"
 */
export function formatBlockName(rawBlock, t = (k, def) => def || k) {
  if (!rawBlock) return "";
  const trimmed = String(rawBlock).trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return "";

  // If already starts with Block, Wing, Tower, Sector, Phase, Building, etc.
  if (/^(block|wing|tower|building|sector|phase)\b/i.test(trimmed)) {
    return trimmed;
  }
  const blockWord = typeof t === "function" ? t("rdBlock", "Block") : "Block";
  return `${blockWord} ${trimmed}`;
}

/**
 * Format flat/unit number without duplicate block or "Flat" prefix.
 * e.g. "Block - A-305" with block "Block - A" -> "305"
 *      "A-305" with block "Block - A"        -> "305"
 *      "Flat 305"                            -> "305"
 *      "305"                                 -> "305"
 */
export function formatUnitNumber(rawFlat, rawBlock = "") {
  if (!rawFlat) return "";
  let clean = String(rawFlat).trim();
  if (!clean || clean === "—" || clean === "-") return "";

  // Strip leading "Flat" or "Unit" if already present
  clean = clean.replace(/^(flat|unit)\s*[:#-]?\s*/i, "");

  const blockStr = String(rawBlock || "").trim();

  // If starts with the full block name, strip it
  if (blockStr && clean.toLowerCase().startsWith(blockStr.toLowerCase())) {
    clean = clean.slice(blockStr.length).replace(/^[\s\-_]+/, "");
  }

  // If block is e.g. "Block - A" or "Block A", get the base code e.g. "A"
  if (blockStr) {
    const code = blockStr.replace(/^(block|wing|tower)\s*[-:]?\s*/i, "").trim();
    if (code && clean.toLowerCase().startsWith(code.toLowerCase())) {
      clean = clean.slice(code.length).replace(/^[\s\-_]+/, "");
    }
  }

  // Also strip any residual generic "Block-X-" or "Block X-"
  clean = clean.replace(/^block\s*[-:]?\s*[a-z0-9]+\s*[-:]?\s*/i, "");

  return clean.trim() || String(rawFlat).trim();
}

/**
 * Produces a clear, non-repetitive flat label:
 * e.g. "Block - A, Floor 3, Flat 305"
 *      "Block - A, Flat 305" (if no floor)
 */
export function formatFullFlatLabel({ block_name, floor_number, flat_number } = {}, t = (k, def) => def || k) {
  const blockPart = formatBlockName(block_name, t);
  const unitNum = formatUnitNumber(flat_number, block_name);

  const floorWord = typeof t === "function" ? t("rpropFloor", "Floor") : "Floor";
  const flatWord = typeof t === "function" ? t("rdFlat", "Flat") : "Flat";

  const floorPart = floor_number != null && String(floor_number).trim() !== ""
    ? `${floorWord} ${String(floor_number).trim()}`
    : "";

  const flatPart = unitNum ? `${flatWord} ${unitNum}` : "";

  return [blockPart, floorPart, flatPart].filter(Boolean).join(", ");
}
