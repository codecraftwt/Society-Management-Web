import styles from "../Complaint.module.css";

export function SkeletonRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className={styles.skelRow}>
          <div style={{ padding: "0 14px", height: "100%", display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: 40, height: 38 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: "55%" }} />
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: "32%" }} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: 120, height: 32 }} />
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: 90, height: 32 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}