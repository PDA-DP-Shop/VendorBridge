import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  optionClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map option format (supports strings or objects)
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value, label: opt.label };
    }
    return { value: opt, label: opt };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  const handleSelect = (val) => {
    if (disabled) return;
    onChange({ target: { value: val } }); // Mock event object to keep compatibility with standard handlers
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Select Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/30 transition-all select-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-left ${triggerClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-green-600' : ''
          }`}
        />
      </button>

      {/* Select Dropdown Picker Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-lg shadow-slate-200/40 py-1.5 max-h-60 overflow-y-auto focus:outline-none animate-in fade-in slide-in-from-top-1 duration-150 ${menuClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3.5 py-2 text-xs font-medium text-slate-400 text-center">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-green-50/70 text-green-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                  } ${optionClassName}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-green-600 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
