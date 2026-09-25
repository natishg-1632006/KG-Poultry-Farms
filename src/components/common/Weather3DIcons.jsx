import React from 'react';

/**
 * 3D Weather Icons Component
 * High-definition, glossy, volumetric 3D weather icons with rich drop shadows,
 * gradients, and specular highlights. Designed to render borderless on card backgrounds.
 */

export const Sun3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sunGlow3D" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFF59D" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#FBC02D" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#FFA000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sunSphere3D" cx="32%" cy="32%" r="68%">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="25%" stopColor="#FFF176" />
        <stop offset="60%" stopColor="#FBC02D" />
        <stop offset="88%" stopColor="#F57F17" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <filter id="sunShadow3D" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#F57F17" floodOpacity="0.45" />
      </filter>
    </defs>
    {/* Outer Sun Rays & Aura Glow */}
    <circle cx="60" cy="60" r="56" fill="url(#sunGlow3D)" />
    <g filter="url(#sunShadow3D)">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <rect
          key={i}
          x="55"
          y="10"
          width="10"
          height="18"
          rx="5"
          fill="#FBC02D"
          transform={`rotate(${angle} 60 60)`}
        />
      ))}
    </g>
    {/* 3D Glossy Sun Sphere */}
    <circle cx="60" cy="60" r="34" fill="url(#sunSphere3D)" filter="url(#sunShadow3D)" />
    <ellipse cx="49" cy="46" rx="14" ry="8" fill="#FFFFFF" opacity="0.75" transform="rotate(-20 49 46)" />
  </svg>
);

export const Cloud3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cloudGradMain" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#B0BEC5" />
      </linearGradient>
      <linearGradient id="cloudGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#E0E0E0" />
        <stop offset="100%" stopColor="#90A4AE" />
      </linearGradient>
      <filter id="cloudShadow3D" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#263238" floodOpacity="0.28" />
      </filter>
    </defs>
    {/* Back Layer Cloud */}
    <g filter="url(#cloudShadow3D)" opacity="0.85">
      <path
        d="M62 48 C62 38, 74 30, 86 35 C95 28 110 37 108 48 C116 51 118 64 108 71 C108 78 95 82 85 79 C74 81 62 74 62 65 Z"
        fill="url(#cloudGradBack)"
      />
    </g>
    {/* Main 3D Glossy Front Cloud */}
    <g filter="url(#cloudShadow3D)">
      <path
        d="M26 84 H88 C100 84 108 74 105 63 C103 53 94 47 84 48 C79 35 64 28 51 34 C41 25 25 31 22 43 C11 45 6 56 10 67 C6 75 12 84 26 84 Z"
        fill="url(#cloudGradMain)"
      />
      {/* Specular Highlights */}
      <ellipse cx="53" cy="40" rx="16" ry="8" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 53 40)" />
      <ellipse cx="32" cy="50" rx="10" ry="6" fill="#FFFFFF" opacity="0.75" transform="rotate(-15 32 50)" />
    </g>
  </svg>
);

export const CloudSun3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sunSphereSmall" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="25%" stopColor="#FFF176" />
        <stop offset="60%" stopColor="#FBC02D" />
        <stop offset="90%" stopColor="#F57F17" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="cloudGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <filter id="cloudSunShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="9" stdDeviation="6" floodColor="#1C313A" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* 3D Golden Sun Peeking Behind Cloud */}
    <g filter="url(#cloudSunShadow)">
      <circle cx="78" cy="40" r="25" fill="url(#sunSphereSmall)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <rect
          key={i}
          x="75"
          y="8"
          width="6"
          height="12"
          rx="3"
          fill="#FBC02D"
          transform={`rotate(${angle} 78 40)`}
        />
      ))}
      <ellipse cx="70" cy="30" rx="9" ry="5" fill="#FFFFFF" opacity="0.75" transform="rotate(-20 70 30)" />
    </g>
    {/* 3D Front Cloud */}
    <g filter="url(#cloudSunShadow)">
      <path
        d="M24 86 H86 C98 86 106 76 103 65 C101 55 92 49 82 50 C77 37 62 30 49 36 C39 27 23 33 20 45 C9 47 4 58 8 69 C4 77 10 86 24 86 Z"
        fill="url(#cloudGradFront)"
      />
      <ellipse cx="50" cy="43" rx="15" ry="7" fill="#FFFFFF" opacity="0.9" transform="rotate(-10 50 43)" />
    </g>
  </svg>
);

export const CloudRain3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cloudRainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#B0BEC5" />
      </linearGradient>
      <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#B3E5FC" />
        <stop offset="50%" stopColor="#40C4FF" />
        <stop offset="100%" stopColor="#0288D1" />
      </linearGradient>
      <filter id="rainShadow" x="-15%" y="-15%" width="135%" height="145%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#1C313A" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* 3D Rain Drops */}
    <g filter="url(#rainShadow)">
      <path d="M36 82 C36 82 30 96 36 103 C41 108 48 103 48 96 C48 89 36 82 36 82 Z" fill="url(#dropGrad)" />
      <path d="M60 86 C60 86 54 102 60 109 C65 114 73 109 73 101 C73 93 60 86 60 86 Z" fill="url(#dropGrad)" />
      <path d="M84 82 C84 82 78 96 84 103 C89 108 96 103 96 96 C96 89 84 82 84 82 Z" fill="url(#dropGrad)" />
    </g>
    {/* 3D Cloud */}
    <g filter="url(#rainShadow)">
      <path
        d="M24 76 H86 C98 76 106 66 103 55 C101 45 92 39 82 40 C77 27 62 20 49 26 C39 17 23 23 20 35 C9 37 4 48 8 59 C4 67 10 76 24 76 Z"
        fill="url(#cloudRainGrad)"
      />
      <ellipse cx="50" cy="33" rx="15" ry="7" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 50 33)" />
    </g>
  </svg>
);

export const CloudDrizzle3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cloudDrizzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <linearGradient id="smallDropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#B3E5FC" />
        <stop offset="100%" stopColor="#0288D1" />
      </linearGradient>
      <filter id="drizzleShadow" x="-15%" y="-15%" width="135%" height="145%">
        <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#263238" floodOpacity="0.22" />
      </filter>
    </defs>
    {/* 3D Drizzle Drops */}
    <g filter="url(#drizzleShadow)">
      <circle cx="36" cy="90" r="5" fill="url(#smallDropGrad)" />
      <circle cx="48" cy="103" r="5.5" fill="url(#smallDropGrad)" />
      <circle cx="62" cy="92" r="6" fill="url(#smallDropGrad)" />
      <circle cx="76" cy="105" r="5" fill="url(#smallDropGrad)" />
      <circle cx="88" cy="90" r="4.5" fill="url(#smallDropGrad)" />
    </g>
    {/* 3D Cloud */}
    <g filter="url(#drizzleShadow)">
      <path
        d="M24 76 H86 C98 76 106 66 103 55 C101 45 92 39 82 40 C77 27 62 20 49 26 C39 17 23 23 20 35 C9 37 4 48 8 59 C4 67 10 76 24 76 Z"
        fill="url(#cloudDrizzleGrad)"
      />
      <ellipse cx="50" cy="33" rx="15" ry="7" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 50 33)" />
    </g>
  </svg>
);

export const CloudLightning3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="darkCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ECEFF1" />
        <stop offset="50%" stopColor="#90A4AE" />
        <stop offset="100%" stopColor="#455A64" />
      </linearGradient>
      <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="40%" stopColor="#FFEB3B" />
        <stop offset="85%" stopColor="#F57F17" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <filter id="boltGlow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#F57F17" floodOpacity="0.75" />
      </filter>
    </defs>
    {/* 3D Lightning Bolt */}
    <g filter="url(#boltGlow)">
      <path
        d="M60 62 L42 88 H58 L50 114 L80 82 H62 L70 62 Z"
        fill="url(#boltGrad)"
      />
    </g>
    {/* 3D Rain Drops */}
    <circle cx="34" cy="94" r="4" fill="#40C4FF" />
    <circle cx="86" cy="96" r="4" fill="#40C4FF" />
    {/* Dark 3D Thunderstorm Cloud */}
    <g filter="url(#boltGlow)">
      <path
        d="M24 70 H86 C98 70 106 60 103 50 C101 40 92 34 82 35 C77 22 62 15 49 21 C39 12 23 18 20 30 C9 32 4 43 8 54 C4 62 10 70 24 70 Z"
        fill="url(#darkCloudGrad)"
      />
      <ellipse cx="50" cy="28" rx="14" ry="6" fill="#FFFFFF" opacity="0.65" transform="rotate(-10 50 28)" />
    </g>
  </svg>
);

export const CloudFog3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fogCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <linearGradient id="fogLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#CFD8DC" stopOpacity="0.2" />
        <stop offset="50%" stopColor="#B0BEC5" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#CFD8DC" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* 3D Cloud */}
    <path
      d="M26 64 H88 C100 64 108 54 105 44 C103 34 94 28 84 29 C79 17 64 10 51 16 C41 7 25 13 22 25 C11 27 6 38 10 49 C6 57 12 64 26 64 Z"
      fill="url(#fogCloudGrad)"
    />
    {/* 3D Fog Mist Layers */}
    <rect x="18" y="74" width="84" height="9" rx="4.5" fill="url(#fogLineGrad)" />
    <rect x="26" y="89" width="68" height="8" rx="4" fill="url(#fogLineGrad)" />
    <rect x="36" y="102" width="48" height="7" rx="3.5" fill="url(#fogLineGrad)" />
  </svg>
);

export const Moon3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="moonGrad3D" cx="38%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="25%" stopColor="#FFF59D" />
        <stop offset="55%" stopColor="#FBC02D" />
        <stop offset="85%" stopColor="#F57F17" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <filter id="moonShadow3D" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#F57F17" floodOpacity="0.45" />
      </filter>
    </defs>
    {/* 3D Sparkling Stars */}
    <g opacity="0.9">
      <path d="M26 30 L28 37 L35 39 L28 41 L26 48 L24 41 L17 39 L24 37 Z" fill="#FFE082" />
      <path d="M92 22 L93 27 L98 28 L93 29 L92 34 L91 29 L86 28 L91 27 Z" fill="#FFF59D" />
      <path d="M98 76 L99 81 L104 82 L99 83 L98 88 L97 83 L92 82 L97 81 Z" fill="#FFE082" />
    </g>
    {/* 3D Crescent Moon */}
    <g filter="url(#moonShadow3D)">
      <path
        d="M74 20 C44 20 22 44 22 74 C22 98 42 112 68 112 C90 112 106 98 108 76 C96 84 80 86 65 77 C49 68 45 48 54 33 C62 24 74 20 74 20 Z"
        fill="url(#moonGrad3D)"
      />
      <ellipse cx="46" cy="50" rx="11" ry="6" fill="#FFFFFF" opacity="0.55" transform="rotate(-30 46 50)" />
    </g>
  </svg>
);

export const CloudMoon3D = ({ className = "w-20 h-20" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="moonGradSmall" cx="38%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="25%" stopColor="#FFF59D" />
        <stop offset="60%" stopColor="#FBC02D" />
        <stop offset="90%" stopColor="#F57F17" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="cloudGradNight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <filter id="cloudMoonShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#1C313A" floodOpacity="0.3" />
      </filter>
    </defs>
    {/* 3D Crescent Moon & Sparkling Stars Floating Behind Cloud */}
    <g filter="url(#cloudMoonShadow)">
      <path
        d="M82 8 C58 8 40 26 40 48 C40 70 58 84 78 84 C92 84 104 74 106 56 C98 62 84 64 74 56 C61 47 57 30 66 16 C72 11 82 9 82 8 Z"
        fill="url(#moonGradSmall)"
      />
      <path d="M20 22 L22 26 L26 27 L22 28 L20 32 L18 28 L14 27 L18 26 Z" fill="#FFE082" />
      <path d="M98 14 L99 18 L103 19 L99 20 L98 24 L97 20 L93 19 L97 18 Z" fill="#FFF59D" />
    </g>
    {/* 3D Front Cloud */}
    <g filter="url(#cloudMoonShadow)">
      <path
        d="M24 86 H86 C98 86 106 76 103 65 C101 55 92 49 82 50 C77 37 62 30 49 36 C39 27 23 33 20 45 C9 47 4 58 8 69 C4 77 10 86 24 86 Z"
        fill="url(#cloudGradNight)"
      />
      <ellipse cx="50" cy="43" rx="15" ry="7" fill="#FFFFFF" opacity="0.9" transform="rotate(-10 50 43)" />
    </g>
  </svg>
);

export const WEATHER_3D_ICON_MAP = {
  Sun: Sun3D,
  CloudSun: CloudSun3D,
  Cloud: Cloud3D,
  CloudFog: CloudFog3D,
  CloudDrizzle: CloudDrizzle3D,
  CloudRain: CloudRain3D,
  CloudLightning: CloudLightning3D,
  Moon: Moon3D,
  CloudMoon: CloudMoon3D
};
