import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./CheckBoxSelect.css";

interface CheckBoxSelectProps {
  id?: string;
  options: string[];
  placeholder?: string;
  selectedValues?: string[];
  onChange?: (selectedItems: string[]) => void;
}

export const CheckBoxSelect: React.FC<CheckBoxSelectProps> = ({
  id,
  options,
  placeholder = "All",
  selectedValues: controlledValues,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uncontrolledValues, setUncontrolledValues] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const optionsId = useId();
  const selectedValues = controlledValues ?? uncontrolledValues;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCheckboxChange = (value: string) => {
    const updatedValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value];

    if (controlledValues === undefined) {
      setUncontrolledValues(updatedValues);
    }

    onChange?.(updatedValues);
  };

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : `${selectedValues.length} item${selectedValues.length === 1 ? "" : "s"} selected`;

  return (
    <div
      className="multiselect-dropdown"
      ref={dropdownRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }}
    >
      <button
        id={id}
        type="button"
        className="select-box"
        onClick={() => setIsOpen((open) => !open)}
        aria-controls={optionsId}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="select-text">{displayText}</span>
        <ChevronDown
          className="select-box-chevron"
          aria-hidden="true"
          size={16}
          strokeWidth={2}
        />
      </button>

      {isOpen && (
        <div
          id={optionsId}
          className="options-container"
          aria-label={`${placeholder} options`}
        >
          {options.map((option) => (
            <label key={option} className="option-label">
              <input
                type="checkbox"
                value={option}
                checked={selectedValues.includes(option)}
                onChange={() => handleCheckboxChange(option)}
              />
              <span className="option-text">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
