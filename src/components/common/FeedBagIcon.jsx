import React from 'react';

export const FeedBagIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Feed Bag / Sack Outline */}
    <path d="M6 7.5L7.5 3.5h9L18 7.5v12a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19.5v-12z" />
    {/* Top tied rim */}
    <path d="M6 7.5h12" />
    <path d="M10 3.5l2 4 2-4" />
    {/* Wheat / grain mark on bag */}
    <circle cx="12" cy="14" r="2" />
    <path d="M12 11.5v5" />
  </svg>
);
