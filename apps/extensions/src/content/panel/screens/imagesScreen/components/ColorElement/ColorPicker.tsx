import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ColorPickerProps {
  color: string;
  setColor: (color: string) => void;
}

export function ColorPicker({ color, setColor }: ColorPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
  };

  const handleTriggerClick = () => {
    setIsOpen(true);
    colorInputRef.current?.click();
  };

  return (
    <div className="tw-relative tw-inline-block ">
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        className="tw-w-16 tw-h-[24px] tw-mt-2 tw-border-none  tw-p-0.5 tw-border tw-border-input"
        style={{ backgroundColor: color }}
      >
        <span className="tw-sr-only">{t('unique.openColor')}</span>
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={color}
        onChange={handleColorChange}
        className="tw-absolute tw-top-0 tw-left-0 tw-w-10 tw-h-10 tw-opacity-0 tw-cursor-pointer"
      />
    </div>
  );
}
