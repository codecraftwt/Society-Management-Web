import {
  MdApartment, MdAttachFile, MdCalendarToday, MdCheckCircle,
  MdOpenInNew, MdPerson, MdSchedule,
} from "react-icons/md";
import styles from "../Complaint.module.css";
import { flatLabel, formatDate, formatTime, resolveFlatObj } from "../complaintHelpers.js";
import { Spinner, StatusPill } from "../complaintPieces.jsx";

/* ── Drawer actions ── */
function ActionButtons({ c, updateStatus, updatingId, t }) {
  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isInProgress = c.status === "IN_PROGRESS";
  const isResolved   = c.status === "RESOLVED";
  const busy = updatingId === c.id;
  if (isResolved) return (
    <div className={styles.doneChip}><MdCheckCircle size={15} /> {t("adminCompCompleted") || "Completed"}</div>
  );
  return (
    <div className={styles.actionsBar}>
      {isPending && (
        <button className={`${styles.drawerActionBtn} ${styles.progressAction}`}
          onClick={() => updateStatus(c.id, "IN_PROGRESS")} disabled={busy}>
          {busy ? <Spinner small /> : <><MdSchedule size={15} /> {t("adminCompMarkInProgress")}</>}
        </button>
      )}
      {isInProgress && (
        <button className={`${styles.drawerActionBtn} ${styles.resolveAction}`}
          onClick={() => updateStatus(c.id, "RESOLVED")} disabled={busy}>
          {busy ? <Spinner small /> : <><MdCheckCircle size={15} /> {t("adminCompMarkResolved")}</>}
        </button>
      )}
    </div>
  );
}

/* ── FlatInfoBlock — reusable Block/Floor/Flat display in the drawer ────────── */
function FlatInfoBlock({ c, t }) {
  const flat = resolveFlatObj(c);
  if (!flat) {
    return <span style={{ fontSize: 13, color: "var(--text-secondary)", opacity: 0.6 }}>NA</span>;
  }

  const block    = flat.Block?.name   || flat.block_name   || null;
  const flatNum  = flat.flat_number   || null;
  const floorNum = flat.floor_number  ?? flat.Floor?.floor_number ?? null;

  const cells = [];
  if (block) {
    const label = t("blockLabel") || "Block";
    cells.push({ key: "block", label, value: `${label} ${block}` });
  }
  if (flatNum) {
    const label = t("flatLabel") || "Flat";
    cells.push({ key: "flat", label, value: `${label} ${flatNum}` });
  }
  if (floorNum !== null && floorNum !== undefined) {
    const label = t("floorLabel") || "Floor";
    cells.push({ key: "floor", label, value: `${label} ${floorNum}` });
  }

  if (cells.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--text-secondary)", opacity: 0.6 }}>NA</span>;
  }

  return (
    <div className={styles.valueGrid}>
      {cells.map(({ key, label, value }) => (
        <div key={key} className={styles.metaCell}>
          <div className={styles.metaLabel}>{label}</div>
          <div className={styles.metaValue}>{value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Complaint detail drawer body (details tab) ─────────────────────────────── */
export default function DrawerDetail({ selected, t, updateStatus, updatingId, onOpenAttachment }) {
  return (
    <>
      {/* Status + identity */}
      <div className={styles.statusRow}>
        <div className={styles.statusMeta}>
          <span className={styles.statusMetaLabel}>{t("billStatusCol")}</span>
          <p className={styles.dTitle} style={{ fontSize: 13.5 }}>{selected.title}</p>
        </div>
        <StatusPill status={selected.status} t={t} />
      </div>

      {selected.description && (
        <>
          <span className={styles.sectionTitle}>{t("compColDesc")}</span>
          <p className={styles.dDesc}>{selected.description}</p>
        </>
      )}

      {/* Resident */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{t("adminCompResidentInfo")}</span>
        <div className={styles.valueRow}>
          <span className={styles.valueRowIcon}><MdPerson size={17} /></span>
          <div className={styles.valueText}>
            <div className={styles.valueTitle}>{selected.User?.name || "NA"}</div>
            <div className={styles.valueSub}>{selected.User?.email || ""}</div>
          </div>
        </div>
      </div>

      {/* Society / Location */}
      {selected.Society && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>{t("reportSociety") || "Society"}</span>
          <div className={styles.valueRow}>
            <span className={styles.valueRowIcon}><MdApartment size={17} /></span>
            <div className={styles.valueText}>
              <div className={styles.valueTitle}>{selected.Society.name}</div>
              <div className={styles.valueSub}>{flatLabel(selected, t)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Flat / Block / Floor */}
      {!selected.Society && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>{t("reportFlat")}</span>
          <FlatInfoBlock c={selected} t={t} />
        </div>
      )}

      {/* Submitted */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{t("compSubmittedAt")}</span>
        <div className={styles.valueRow}>
          <span className={styles.valueRowIcon}><MdCalendarToday size={16} /></span>
          <div className={styles.valueText}>
            <div className={styles.valueTitle}>{formatDate(selected.created_at)}</div>
            {formatTime(selected.created_at) && (
              <div className={styles.valueSub}>{formatTime(selected.created_at)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Attachment */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{t("adminCompAttachedPhoto")}</span>
        {(selected.photo_url || selected.attachment_url || selected.attachment) ? (
          <div>
            <button
              type="button"
              onClick={() => onOpenAttachment(selected.photo_url || selected.attachment_url || selected.attachment)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 600,
                background: "rgba(160, 90, 255, 0.12)",
                border: "1px solid rgba(160, 90, 255, 0.3)",
                color: "var(--accent, #6B46C1)",
                cursor: "pointer",
              }}
            >
              <MdAttachFile size={15} />
              <span>{t("viewAttachment") || "View Attachment"}</span>
              <MdOpenInNew size={13} style={{ opacity: 0.8 }} />
            </button>
          </div>
        ) : (
          <div className={styles.noAttachment}>
            <MdOpenInNew size={18} style={{ opacity: 0.45 }} />
            <span>{t("compNoAttachment")}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{t("compActions")}</span>
        <ActionButtons c={selected} updateStatus={updateStatus} updatingId={updatingId} t={t} />
      </div>
    </>
  );
}