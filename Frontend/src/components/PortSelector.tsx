import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Anchor, Search, ChevronDown, MapPin, X } from "lucide-react";
import { INDIAN_PORTS, IndianPort } from "../data/indianPorts";

interface PortSelectorProps {
  onSelectPort: (port: IndianPort) => void;
  selectedPortName?: string | null;
}

export const PortSelector: React.FC<PortSelectorProps> = ({
  onSelectPort,
  selectedPortName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 80,
    left: 20,
  });

  // Calculate coordinates relative to viewport for fixed portal placement
  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;

      // Ensure dropdown does not overflow right or left edges
      let left = rect.left;
      if (left + dropdownWidth > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - dropdownWidth - 16);
      }

      setCoords({
        top: Math.max(10, rect.bottom + 6),
        left: Math.max(12, left),
      });
    }
  }, []);

  // Synchronously compute position on toggle click before setting isOpen
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Update position on open, scroll, or resize
  useEffect(() => {
    if (isOpen) {
      updateCoords();

      const handleScrollOrResize = () => {
        updateCoords();
      };

      window.addEventListener("resize", handleScrollOrResize);
      window.addEventListener("scroll", handleScrollOrResize, true);

      return () => {
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, true);
      };
    }
  }, [isOpen, updateCoords]);

  // Click outside listener (both mousedown and touchstart for full device/test compatibility)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredPorts = INDIAN_PORTS.filter(
    (port) =>
      port.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      port.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block">
      {/* Trigger Button with MapPin lucide icon (NO raw emoji characters) */}
      <button
        ref={buttonRef}
        type="button"
        id="jump-to-port-button"
        data-testid="jump-to-port-button"
        aria-label="Jump to Port"
        aria-expanded={isOpen}
        onClick={handleToggle}
        onMouseDown={(e) => e.stopPropagation()}
        className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-[#E1EEF9] text-xs font-semibold text-slate-700 shadow-[0_2px_8px_rgba(30,95,191,0.06)] flex items-center gap-1.5 transition-colors cursor-pointer select-none"
        title="Jump to Port"
      >
        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-none text-xs font-semibold text-slate-700">
          {selectedPortName ? selectedPortName : "Jump to Port"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu rendered via React Portal to document.body (escapes all ancestor overflow and stacking contexts) */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            id="port-selector-dropdown"
            data-testid="port-selector-dropdown"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              width: "min(320px, calc(100vw - 24px))",
            }}
            className="bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_10px_30px_rgba(30,95,191,0.15)] p-2.5 text-slate-800 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1 mb-2">
              <div className="flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-[#185ADB]" />
                <span className="text-xs font-bold text-[#0B2545]">Major Indian Ports</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {INDIAN_PORTS.length} Harbors
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                id="port-search-input"
                data-testid="port-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search port or state (e.g., JNPT, Gujarat)..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#F8FBFE] border border-[#E1EEF9] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E5FBF] focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scrollable Ports List (max-height: 300px, custom scrollbar) */}
            <div
              id="port-list-container"
              data-testid="port-list-container"
              className="overflow-y-auto space-y-1 pr-1 custom-port-scrollbar"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {filteredPorts.map((port) => {
                const isSelected = selectedPortName === port.name;
                return (
                  <button
                    key={port.name}
                    type="button"
                    data-testid={`port-option-${port.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onClick={() => {
                      onSelectPort(port);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 border border-sky-200 text-[#185ADB]"
                        : "hover:bg-slate-50 border border-transparent text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-[#185ADB] text-white"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      <Anchor className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">
                        {port.name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        <span className="truncate">{port.city}</span>
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 text-right shrink-0 pt-0.5">
                      {port.lat.toFixed(2)}N
                    </div>
                  </button>
                );
              })}

              {filteredPorts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  No ports found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PortSelector;
