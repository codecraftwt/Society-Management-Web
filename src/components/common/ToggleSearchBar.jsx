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
    }, 50);
  };

  const handleClose = () => {
    if (onChange) onChange("");
    setIsOpen(false);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className="h-9 px-3.5 rounded-xl bg-card-inner-bg/80 hover:bg-indigo-500/15 text-secondary hover:text-indigo-500 transition-all duration-200 flex items-center gap-2 text-xs font-bold shadow-2xs hover:shadow-xs cursor-pointer border-0 outline-none"
          title="Search"
        >
          <MdSearch size={18} className="text-indigo-500 shrink-0" />
          <span className="hidden sm:inline font-bold">Search</span>
        </button>
      ) : (
        <div className="flex items-center h-9 rounded-xl bg-card-inner-bg/90 backdrop-blur-md px-3 shadow-inner w-56 sm:w-64 transition-all duration-300 ease-out border-0 outline-none ring-1 ring-indigo-500/20">
          <MdSearch size={18} className="text-indigo-500 shrink-0 mr-2 opacity-90" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs font-semibold text-primary outline-none border-0 focus:ring-0 placeholder:text-secondary/50"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-secondary/70 hover:text-primary text-[10px] font-extrabold mr-1 hover:bg-black/5 dark:hover:bg-white/10 px-1.5 py-0.5 rounded-full border-0 outline-none cursor-pointer"
              title="Clear text"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-secondary hover:text-primary transition shrink-0 ml-1 border-0 outline-none cursor-pointer"
            title="Close Search"
          >
            <MdClose size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
