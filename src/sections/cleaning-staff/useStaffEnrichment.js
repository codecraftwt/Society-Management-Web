import { useEffect, useRef, useState } from "react";

import { getPasses } from "./cleaningStaffService";
import { PASS_STATUS } from "./constants";

/**
 * Enriches the visible page of staff rows with their active pass.
 */
const EMPTY = { active_pass: null };

export default function useStaffEnrichment(rows, { enabled = true } = {}) {
  const [enriched, setEnriched] = useState({});
  const cacheRef = useRef({});
  const inFlightRef = useRef({});

  const ids = (rows || [])
    .map((r) => r?.id)
    .filter((id) => id !== null && id !== undefined);

  const idKey = ids.join(",");

  useEffect(() => {
    if (!enabled) return undefined;

    const missing = ids.filter((id) => !cacheRef.current[id] && !inFlightRef.current[id]);
    if (!missing.length) return undefined;

    let cancelled = false;

    missing.forEach((id) => {
      inFlightRef.current[id] = true;
      getPasses(id, { status: PASS_STATUS.ACTIVE })
        .then((passes) => {
          const activePass =
            (Array.isArray(passes) ? passes : []).find((p) => p.status === PASS_STATUS.ACTIVE) || null;
          cacheRef.current[id] = {
            active_pass: activePass,
          };
          if (!cancelled) setEnriched((prev) => ({ ...prev, [id]: cacheRef.current[id] }));
        })
        .catch(() => {
          cacheRef.current[id] = EMPTY;
          if (!cancelled) setEnriched((prev) => ({ ...prev, [id]: EMPTY }));
        })
        .finally(() => {
          delete inFlightRef.current[id];
        });
    });

    return () => {
      cancelled = true;
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [idKey, enabled]);

  /* Decorate rows in place for the table renderer. */
  const decorate = (row) => {
    const extra = enriched[row.id] || cacheRef.current[row.id] || null;
    if (!extra) return row;
    return {
      ...row,
      active_pass: row.active_pass ?? extra.active_pass,
    };
  };

  return { decorate, enrichments: enriched };
}