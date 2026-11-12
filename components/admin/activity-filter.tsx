"use client";

import { useEffect, useRef } from "react";

type Option = { value: string; label: string };

export function ActivityFilter({ label, value, options, onChange }: {
  label: string; value: string; options: Option[]; onChange: (value: string) => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target))
        menu.current.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function close() {
    if (menu.current) menu.current.open = false;
    trigger.current?.focus();
  }

  return (
    <div className="admin-activity-filter">
      <span>{label}</span>
      <details name="activity-filters" ref={menu} onKeyDown={event => {
        if (event.key === "Escape" && menu.current?.open) {
          event.preventDefault();
          close();
        }
      }} onBlur={event => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}>
        <summary ref={trigger} aria-label={`${label}: ${selected?.label ?? label}`}>
          <span>{selected?.label ?? label}</span><span aria-hidden="true">⌄</span>
        </summary>
        <ul aria-label={`${label} options`}>
          {options.map(option => <li key={option.value}>
            <button type="button" aria-pressed={value === option.value} onClick={() => {
              onChange(option.value);
              close();
            }}>{option.label}</button>
          </li>)}
        </ul>
      </details>
    </div>
  );
}
