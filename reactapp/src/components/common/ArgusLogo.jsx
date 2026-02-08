import React from 'react';

/**
 * ArgusLogo - Custom SVG logo for Argus application
 * 
 * @param {Object} props
 * @param {string} props.className - Tailwind classes for sizing and colors
 */
const ArgusLogo = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className}
    viewBox="-4.8 -4.8 57.60 57.60" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.448"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="24" cy="24" r="21.5"/>
    <path d="M7.1562,37.3617c6.68-13.4223,19.09-20.5881,21.4016-19.1306,1.6952,1.1638,2.6641,14.5061-2.9941,27.212"/>
    <path d="M3.9276,16.2961c.9415-1.7942,1.9659-3.5009,3.0476-3.5325,1.0453-.0307,4.8246,5.95,7.35,14.23"/>
    <path d="M20.0551,21.7892c-.0775-3.1524-1.3462-7.1971-2.2507-7.41-1.4-.33-4.8277,2.1706-6.5654,4.6194"/>
    <path d="M28.7362,35.6317c3.5856.8641,8.4094,3.8208,8.3376,4.3269a6.1365,6.1365,0,0,1-2.287,2.64"/>
    <path d="M34.4259,38.0126c4.0153-4.2419,4.7524-9.2731,4.2931-9.8636s-4.5346-.73-8.93-.1143"/>
    <path d="M15.9921,25.2789s1.92-1.6241,2.595-1.388c.6932.2427,3.48,10.3376.4987,21.04"/>
  </svg>
);

export default ArgusLogo;
