import type { CSSProperties } from "react";

/**
 * Maschera di Guy Fawkes stilizzata (simbolo di Anonymous).
 * SVG vettoriale, nessun asset esterno: scala pulita a ogni dimensione.
 */
export default function AnonMask({
  size = 150,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.2)}
      viewBox="0 0 200 240"
      className={className}
      style={style}
      role="img"
      aria-label="Maschera di Guy Fawkes"
      fill="none"
    >
      {/* Volto pallido che si assottiglia fino al mento appuntito. */}
      <path
        d="M100 8 C150 8 168 44 168 92 C168 138 150 176 128 206
           C118 220 108 232 100 232 C92 232 82 220 72 206
           C50 176 32 138 32 92 C32 44 50 8 100 8 Z"
        fill="#f4f1ea"
        stroke="#0a0a0e"
        strokeWidth="3"
      />
      {/* Guance rosate. */}
      <ellipse cx="62" cy="150" rx="13" ry="9" fill="#e7a3a0" opacity="0.5" />
      <ellipse cx="138" cy="150" rx="13" ry="9" fill="#e7a3a0" opacity="0.5" />
      {/* Sopracciglia arcuate. */}
      <path d="M52 92 Q70 72 92 86" stroke="#0a0a0e" strokeWidth="5" strokeLinecap="round" />
      <path d="M148 92 Q130 72 108 86" stroke="#0a0a0e" strokeWidth="5" strokeLinecap="round" />
      {/* Occhi a mandorla. */}
      <path d="M58 104 Q74 96 90 106 Q74 116 58 104 Z" fill="#0a0a0e" />
      <path d="M142 104 Q126 96 110 106 Q126 116 142 104 Z" fill="#0a0a0e" />
      {/* Naso. */}
      <path d="M100 110 L93 142 Q100 149 107 142 Z" fill="#d9d4c8" stroke="#0a0a0e" strokeWidth="2" />
      {/* Baffi a manubrio. */}
      <path d="M100 158 Q86 150 70 154 Q56 158 50 148 Q60 167 78 164 Q92 162 100 158 Z" fill="#0a0a0e" />
      <path d="M100 158 Q114 150 130 154 Q144 158 150 148 Q140 167 122 164 Q108 162 100 158 Z" fill="#0a0a0e" />
      {/* Sorriso. */}
      <path d="M74 176 Q100 196 126 176" stroke="#0a0a0e" strokeWidth="3" strokeLinecap="round" />
      {/* Pizzetto sotto il labbro + barba a punta. */}
      <path d="M94 168 Q100 172 106 168 L104 182 Q100 186 96 182 Z" fill="#0a0a0e" />
      <path d="M88 196 Q100 210 112 196 Q100 226 88 196 Z" fill="#0a0a0e" />
    </svg>
  );
}
