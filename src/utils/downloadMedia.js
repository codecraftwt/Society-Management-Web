import JSZip from "jszip";

const EXT_FALLBACK = {
  image: "jpg",
  video: "mp4",
};

function extFromUrl(url = "") {
  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.includes(".") ? clean.split(".").pop() : "";
  return ext && ext.length <= 5 ? ext : null;
}

function safeName(name = "") {
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

export function buildMediaFileName(item, index) {
  const ext = extFromUrl(item?.url) || EXT_FALLBACK[item?.media_type === "VIDEO" ? "video" : "image"];
  const base = safeName(
    item?.file_name || item?.name || item?.title || `media_${String(index + 1).padStart(2, "0")}`
  ).replace(/\.[^.]+$/, "");
  const padded = String(index + 1).padStart(2, "0");
  return `${padded}_${base || "media"}.${ext}`;
}

async function fetchAsBlob(url) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export async function downloadMediaFile(item, index = 0) {
  const filename = buildMediaFileName(item, index);
  try {
    const blob = await fetchAsBlob(item.url);
    saveBlob(blob, filename);
    return { ok: true, filename };
  } catch {
    const anchor = document.createElement("a");
    anchor.href = item.url;
    anchor.download = filename;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { ok: false, filename };
  }
}

export async function downloadMediaZip(items = [], zipName = "media.zip", onProgress) {
  const zip = new JSZip();
  const used = new Set();
  let added = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item?.url) {
      failed += 1;
      continue;
    }

    try {
      const blob = await fetchAsBlob(item.url);
      let name = buildMediaFileName(item, i);
      let counter = 2;
      while (used.has(name)) {
        const dot = name.lastIndexOf(".");
        name = `${name.slice(0, dot)}_${counter}${name.slice(dot)}`;
        counter += 1;
      }
      used.add(name);
      zip.file(name, blob);
      added += 1;
    } catch {
      failed += 1;
    }
    if (onProgress) onProgress(i + 1, items.length);
  }

  if (added === 0) {
    throw new Error("Could not download any media");
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveBlob(zipBlob, zipName);
  return { ok: failed === 0, added, failed };
}
