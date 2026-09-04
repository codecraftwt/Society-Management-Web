import { useState, useEffect, useRef } from "react";
import { MdMoreVert, MdManageAccounts, MdDelete } from "react-icons/md";
import { BiSolidEdit } from "react-icons/bi";

/**
 * SocietyActionMenu
 *
 * Props:
 *   onEditAdmin  – called when "Edit Admin" / "Assign Admin" is clicked
 *   onManage     – called when "Manage" is clicked
 *   onDelete     – called when "Delete" is clicked
 *   hasAdmin     – boolean, changes label between Edit / Assign
 *   t            – translation function
 */
export default function SocietyActionMenu({ onEditAdmin, onManage, onDelete, hasAdmin, t }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleItem = (fn) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="sa-action-menu-wrap" ref={menuRef}>
      <button
        className="sa-action-dots"
        onClick={() => setOpen((p) => !p)}
        aria-label="Society actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MdMoreVert size={20} />
      </button>

      {open && (
        <div className="sa-action-dropdown" role="menu">
          <button
            role="menuitem"
            className="sa-action-item"
            onClick={() => handleItem(onEditAdmin)}
          >
            <BiSolidEdit size={15} />
            {hasAdmin ? t("saEditAdmin") : t("saAssignAdmin")}
          </button>

          <button
            role="menuitem"
            className="sa-action-item"
            onClick={() => handleItem(onManage)}
          >
            <MdManageAccounts size={15} />
            {t("saManageBtn")}
          </button>

          <div className="sa-action-divider" />

          <button
            role="menuitem"
            className="sa-action-item sa-action-item-danger"
            onClick={() => handleItem(onDelete)}
          >
            <MdDelete size={15} />
            {t("mpDelete")}
          </button>
        </div>
      )}
    </div>
  );
}
