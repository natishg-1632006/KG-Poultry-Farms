import React from 'react';

/**
 * 3D Weather Icons Component
 * High-definition, glossy 3D weather icons with gradients, volumetric lighting, and drop shadows
 * matching modern 3D iOS/Android weather widgets.
 */

export const Sun3D = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sunGlow3D" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFF59D" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#FBC02D" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FFA000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sunSphere3D" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFF176" />
        <stop offset="45%" stopColor="#FBC02D" />
        <stop offset="85%" stopColor="#F57F17" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <filter id="sunShadow3D" x="10%" y="10%" width="80%" height="80%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#F57F17" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Outer Glow */}
    <circle cx="60" cy="60" r="54" fill="url(#sunGlow3D)" />
    {/* Sun Rays */}
    <g filter="url(#sunShadow3D)">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <rect
          key={i}
          x="55"
          y="12"
          width="10"
          height="16"
          rx="5"
          fill="#FBC02D"
          transform={`rotate(${angle} 60 60)`}
        />
      ))}
    </g>
    {/* 3D Sun Center Sphere */}
    <circle cx="60" cy="60" r="32" fill="url(#sunSphere3D)" filter="url(#sunShadow3D)" />
    {/* Top Highlight Specular */}
    <ellipse cx="50" cy="48" rx="12" ry="7" fill="#FFFFFF" opacity="0.6" transform="rotate(-20 50 48)" />
  </svg>
);

export const Cloud3D = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cloudGradMain" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <linearGradient id="cloudGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#B0BEC5" />
      </linearGradient>
      <filter id="cloudShadow3D" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#37474F" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* Back Layer Cloud */}
    <g filter="url(#cloudShadow3D)" opacity="0.85">
      <path
        d="M62 48 C62 40, 72 32, 84 36 C92 30, 106 38, 104 48 C112 50, 114 62, 106 68 C106 74, 94 78, 84 76 C74 78, 62 72, 62 64 Z"
        fill="url(#cloudGradBack)"
      />
    </g>
    {/* Main 3D Glossy Front Cloud */}
    <g filter="url(#cloudShadow3D)">
      <path
        d="M28 82 H88 C99 82 106 73 104 63 C102 54 94 48 85 49 C80 37 66 31 54 36 C45 28 30 33 27 44 C17 46 12 56 16 66 C12 73 17 82 28 82 Z"
        fill="url(#cloudGradMain)"
      />
      {/* Glossy Top Highlight */}
      <ellipse cx="55" cy="42" rx="14" ry="7" fill="#FFFFFF" opacity="0.8" transform="rotate(-10 55 42)" />
      <ellipse cx="34" cy="50" rx="9" ry="5" fill="#FFFFFF" opacity="0.7" transform="rotate(-15 34 50)" />
    </g>
  </svg>
);

export const CloudSun3D = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sunSphereSmall" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="60%" stopColor="#FBC02D" />
        <stop offset="100%" stopColor="#F57F17" />
      </radialGradient>
      <linearGradient id="cloudGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <filter id="cloudSunShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#263238" floodOpacity="0.22" />
      </filter>
    </defs>
    {/* 3D Sun Behind Cloud */}
    <g filter="url(#cloudSunShadow)">
      <circle cx="76" cy="44" r="22" fill="url(#sunSphereSmall)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <rect
          key={i}
          x="73"
          y="14"
          width="6"
          height="10"
          rx="3"
          fill="#FBC02D"
          transform={`rotate(${angle} 76 44)`}
        />
      ))}
    </g>
    {/* 3D Front Cloud */}
    <g filter="url(#cloudSunShadow)">
      <path
        d="M24 86 H84 C95 86 102 77 100 67 C98 58 90 52 81 53 C76 41 62 35 50 40 C41 32 26 37 23 48 C13 50 8 60 12 70 C8 77 13 86 24 86 Z"
        fill="url(#cloudGradFront)"
      />
      <ellipse cx="51" cy="46" rx="13" ry="6" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 51 46)" />
    </g>
  </svg>
);

export const CloudRain3D = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cloudRainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#B0BEC5" />
      </linearGradient>
      <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#80D8FF" />
        <stop offset="60%" stopColor="#40C4FF" />
        <stop offset="100%" stopColor="#0091EA" />
      </linearGradient>
      <filter id="rainShadow" x="-10%" y="-10%" width="120%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#1C313A" floodOpacity="0.2" />
      </filter>
    </defs>
    {/* 3D Rain Drops */}
    <g filter="url(#rainShadow)">
      <path d="M38 84 C38 84 32 96 38 102 C42 106 48 102 48 96 C48 90 38 84 38 84 Z" fill="url(#dropGrad)" />
      <path d="M60 88 C60 88 54 102 60 108 C65 113 72 108 72 101 C72 94 60 88 60 88 Z" fill="url(#dropGrad)" />
      <path d="M82 84 C82 84 76 96 82 102 C86 106 92 102 92 96 C92 90 82 84 82 84 Z" fill="url(#dropGrad)" />
    </g>
    {/* 3D Cloud */}
    <g filter="url(#rainShadow)">
      <path
        d="M26 76 H86 C97 76 104 67 102 57 C100 48 92 42 83 43 C78 31 64 25 52 30 C43 22 28 27 25 38 C15 40 10 50 14 60 C10 67 15 76 26 76 Z"
        fill="url(#cloudRainGrad)"
      />
      <ellipse cx="53" cy="36" rx="13" ry="6" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 53 36)" />
    </g>
  </svg>
);

export const CloudDrizzle3D = ({ className = "w-12 h-12" }) => (
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
      <filter id="drizzleShadow" x="-10%" y="-10%" width="120%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#263238" floodOpacity="0.2" />
      </filter>
    </defs>
    {/* 3D Drizzle Drops */}
    <g filter="url(#drizzleShadow)">
      <circle cx="36" cy="90" r="4.5" fill="url(#smallDropGrad)" />
      <circle cx="48" cy="102" r="5" fill="url(#smallDropGrad)" />
      <circle cx="62" cy="92" r="5.5" fill="url(#smallDropGrad)" />
      <circle cx="76" cy="104" r="4.5" fill="url(#smallDropGrad)" />
      <circle cx="88" cy="90" r="4" fill="url(#smallDropGrad)" />
    </g>
    {/* 3D Cloud */}
    <g filter="url(#drizzleShadow)">
      <path
        d="M26 76 H86 C97 76 104 67 102 57 C100 48 92 42 83 43 C78 31 64 25 52 30 C43 22 28 27 25 38 C15 40 10 50 14 60 C10 67 15 76 26 76 Z"
        fill="url(#cloudDrizzleGrad)"
      />
      <ellipse cx="53" cy="36" rx="13" ry="6" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 53 36)" />
    </g>
  </svg>
);

export const CloudLightning3D = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="darkCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ECEFF1" />
        <stop offset="50%" stopColor="#90A4AE" />
        <stop offset="100%" stopColor="#546E7A" />
      </linearGradient>
      <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="50%" stopColor="#FFEB3B" />
        <stop offset="100%" stopColor="#F57F17" />
      </linearGradient>
      <filter id="boltGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#F57F17" floodOpacity="0.7" />
      </filter>
    </defs>
    {/* 3D Lightning Bolt */}
    <g filter="url(#boltGlow)">
      <path
        d="M58 64 L42 88 H56 L48 112 L76 82 H60 L68 64 Z"
        fill="url(#boltGrad)"
      />
    </g>
    {/* 3D Rain Drops */}
    <circle cx="34" cy="94" r="3.5" fill="#40C4FF" />
    <circle cx="84" cy="96" r="3.5" fill="#40C4FF" />
    {/* Dark 3D Thunderstorm Cloud */}
    <g filter="url(#boltGlow)">
      <path
        d="M26 72 H86 C97 72 104 63 102 53 C100 44 92 38 83 39 C78 27 64 21 52 26 C43 18 28 23 25 34 C15 36 10 46 14 56 C10 63 15 72 26 72 Z"
        fill="url(#darkCloudGrad)"
      />
      <ellipse cx="53" cy="32" rx="13" ry="5" fill="#FFFFFF" opacity="0.6" transform="rotate(-10 53 32)" />
    </g>
  </svg>
);

export const CloudFog3D = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fogCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#ECEFF1" />
      </linearGradient>
      <linearGradient id="fogLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#CFD8DC" stopOpacity="0.2" />
        <stop offset="50%" stopColor="#B0BEC5" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#CFD8DC" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* 3D Cloud */}
    <path
      d="M28 66 H88 C99 66 106 57 104 47 C102 38 94 32 85 33 C80 21 66 15 54 20 C45 12 30 17 27 28 C17 30 12 40 16 50 C12 57 17 66 28 66 Z"
      fill="url(#fogCloudGrad)"
    />
    {/* 3D Fog Mist Layers */}
    <rect x="20" y="76" width="80" height="8" rx="4" fill="url(#fogLineGrad)" />
    <rect x="28" y="90" width="64" height="7" rx="3.5" fill="url(#fogLineGrad)" />
    <rect x="36" y="102" width="48" height="6" rx="3" fill="url(#fogLineGrad)" />
  </svg>
);

export const WEATHER_3D_ICON_MAP = {
  Sun: Sun3D,
  CloudSun: CloudSun3D,
  Cloud: Cloud3D,
  CloudFog: CloudFog3D,
  CloudDrizzle: CloudDrizzle3D,
  CloudRain: CloudRain3D,
  CloudLightning: CloudLightning3D
};
