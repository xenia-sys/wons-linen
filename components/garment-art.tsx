import { useId } from "react";
import type { Category } from "../lib/types";
// Original SVG concept drawings. Replace with approved product photography before launch.
export function GarmentArt({
  category,
  color = "#e9e1d2",
  className = "",
  detail = false,
}: {
  category: Category;
  color?: string;
  className?: string;
  detail?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const shirt = (
    <g>
      <path
        d="M158 100 215 77q35 24 70 0l57 23 68 76-47 48-37-35 10 239q-86 12-172 0l10-239-37 35-47-48Z"
        fill={`url(#${id}-cloth)`}
        stroke="#6e6554"
        strokeOpacity=".24"
        strokeWidth="1.5"
      />
      <path
        d="m215 77 35 24-23 43-36-55m94-12-35 24 23 43 36-55"
        fill={color}
        stroke="#6e6554"
        strokeOpacity=".32"
      />
      <path
        d="M250 103v329m-76-243 8-65m144 65-8-65m-148 289q80 10 160 0M109 160l42 44m198 0 42-44"
        fill="none"
        stroke="#6e6554"
        strokeOpacity=".22"
        strokeWidth="1.5"
      />
      {[158, 211, 264, 317, 370, 416].map((y) => (
        <circle key={y} cx="256" cy={y} r="2.3" fill="#817665" opacity=".65" />
      ))}
      <path
        d="M280 163h29v39q-15 6-29 0Z"
        fill="none"
        stroke="#6e6554"
        strokeOpacity=".26"
      />
      <path
        d="m195 183-7 185m107-127 10 139m-89-228-8 114"
        stroke="#fff"
        strokeOpacity=".32"
        strokeWidth="4"
        fill="none"
      />
    </g>
  );
  const trousers = (
    <g>
      <path
        d="M177 81h146l20 373-73 6-20-241-20 241-73-6Z"
        fill={`url(#${id}-cloth)`}
        stroke="#6e6554"
        strokeOpacity=".28"
      />
      <path
        d="M177 96h146m-72-15v138m-56-123-21 350m130-350 21 350m-166 0 72 6m39 0 72-6M179 110l26 33m116-33-26 33"
        fill="none"
        stroke="#6e6554"
        strokeOpacity=".24"
        strokeWidth="1.5"
      />
      <path
        d="m205 181-12 222m99-222 17 222"
        fill="none"
        stroke="#fff"
        strokeOpacity=".3"
        strokeWidth="5"
      />
      <circle cx="250" cy="88" r="2.5" fill="#817665" />
    </g>
  );
  const dress = (
    <g>
      <path
        d="M198 78h25l4 44h46l4-44h25l13 113q-11 20-16 40l62 224q-111 20-222 0l62-224q-5-20-16-40Z"
        fill={`url(#${id}-cloth)`}
        stroke="#6e6554"
        strokeOpacity=".28"
      />
      <path
        d="M201 229q49 9 98 0m-102-52q53 9 106 0m-157 265q104 20 208 0m-138-183-42 178m82-175 3 184m28-188 43 179"
        fill="none"
        stroke="#6e6554"
        strokeOpacity=".22"
        strokeWidth="1.5"
      />
      <path
        d="m229 267-20 155m66-158 22 155"
        stroke="#fff"
        strokeOpacity=".3"
        strokeWidth="5"
      />
    </g>
  );
  return (
    <svg
      className={`garment-art ${className}`}
      viewBox="0 0 500 530"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-cloth`} x1="0" y1="0" x2="1" y2=".4">
          <stop stopColor={color} />
          <stop offset=".3" stopColor={color} />
          <stop offset=".47" stopColor="#fff" stopOpacity=".68" />
          <stop offset=".5" stopColor={color} />
          <stop offset=".75" stopColor={color} />
          <stop offset="1" stopColor="#aa9e88" stopOpacity=".6" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-40%"
          y="-30%"
          width="180%"
          height="180%"
        >
          <feDropShadow
            dx="9"
            dy="15"
            stdDeviation="11"
            floodColor="#5c5038"
            floodOpacity=".18"
          />
        </filter>
      </defs>
      <g transform={detail ? "translate(-130 -65) scale(1.55)" : undefined}>
        <g filter={`url(#${id}-shadow)`}>
          {category === "Dresses" ? (
            dress
          ) : category === "Trousers" ? (
            trousers
          ) : category === "Sets" ? (
            <>
              <g transform="translate(145 135) scale(.72)">{trousers}</g>
              <g transform="translate(-18 -2) scale(.82)">{shirt}</g>
            </>
          ) : (
            shirt
          )}
        </g>
      </g>
    </svg>
  );
}
