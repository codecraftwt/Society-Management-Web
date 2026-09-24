import React, { useState, useRef, useEffect } from "react";
import { MdSearch, MdClose } from "react-icons/md";

export default function ToggleSearchBar({
  value = "",
  onChange,
  placeholder = "Search...",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(() => Boolean(value));
  const inputRef = useRef(null);

  useEffect(() => {
    if (value && !isOpen) {
      setIsOpen(true);
    }
  }, [value]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  };

  const handleClose = () => {
    if (onChange) onChange("");
    setIsOpen(false);
  };

  return (
    <div className={`flex items-center ${className}`}>
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className="h-10 px-3.5 rounded-xl bg-card border border-glass-border hover:border-accent text-secondary hover:text-primary transition-all flex items-center gap-2 text-xs font-bold shadow-xs hover:shadow-sm"
          title="Open Search"
        >
          <MdSearch size={18} className="text-accent" />
          <span className="hidden sm:inline">Search</span>
        </button>
      ) : (
        <div className="flex items-center h-10 rounded-xl bg-card border-2 border-accent px-3 py-1 shadow-md w-64 sm:w-72 transition-all animate-fadeIn">
          <MdSearch size={18} className="text-accent shrink-0 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs font-bold text-primary outline-none border-0 placeholder:text-secondary/60"
          />
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-secondary hover:text-primary transition shrink-0 ml-1"
            title="Close Search"
          >
            <MdClose size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
