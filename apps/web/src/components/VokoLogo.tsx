import React from 'react';

interface VokoLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export const VokoLogo: React.FC<VokoLogoProps> = ({
  className = 'h-10 w-auto',
  showSubtitle = true,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 340 80"
      fill="none"
      role="img"
      aria-label="Voko Logo"
      className={className}
    >
      <defs>
        <filter id="voko-silver-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="voko-titanium-grad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27272A" />
          <stop offset="50%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#09090B" />
        </linearGradient>
      </defs>

      {/* Isotipo: Cuadro Titanio / Obsidiana con borde plata y letra V blanca pura */}
      <g transform="translate(10, 10)">
        {/* Caja de contorno con borde blanco plata sutil */}
        <rect
          x="0"
          y="0"
          width="60"
          height="60"
          rx="16"
          fill="url(#voko-titanium-grad)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          filter="url(#voko-silver-glow)"
        />
        {/* Letra V geométrica estilizada en blanco brillante */}
        <path
          d="M16 18L30 46L44 18H36.5L30 33L23.5 18H16Z"
          fill="#FFFFFF"
        />
        {/* Punto / Indicador de Turno en blanco puro */}
        <circle cx="30" cy="18" r="4.5" fill="#FFFFFF" />
      </g>

      {/* Tipografía de Marca "VOKO" en blanco nítido puro (#FFFFFF) */}
      <text
        x="86"
        y="50"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="38"
        fontWeight="900"
        fill="#FFFFFF"
        letterSpacing="3"
      >
        VOKO
      </text>

      {/* Subtítulo de posicionamiento en plata platino (#A1A1AA) */}
      {showSubtitle && (
        <text
          x="88"
          y="66"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="9.5"
          fontWeight="700"
          fill="#A1A1AA"
          letterSpacing="1.8"
        >
          GESTIÓN INTELIGENTE DE TURNOS
        </text>
      )}
    </svg>
  );
};

export default VokoLogo;
