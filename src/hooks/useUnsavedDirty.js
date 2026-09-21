import { useEffect, useRef } from "react";

/**
 * useUnsavedDirty
 * Tracks whether the user has entered/edited anything in any open form.
 * While `active` is true, any "input"/"change" event on the document marks the
 * form as dirty. Returned ref can be force-set to `true` too (e.g. for custom
 * button-based pickers that don't fire input/change events).
 *
 * @param {boolean} active - should be the modal's open state.
 * @returns {React.MutableRefObject<boolean>}
 */
export default function useUnsavedDirty(active = true) {
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    dirtyRef.current = false;

    const markDirty = () => { dirtyRef.current = true; };

    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);

    return () => {
      document.removeEventListener("input", markDirty, true);
      document.removeEventListener("change", markDirty, true);
    };
  }, [active]);

  return dirtyRef;
}