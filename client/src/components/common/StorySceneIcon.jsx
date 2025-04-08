import React from 'react';

const StorySceneIcon = ({ className }) => {
  return (
    <svg 
      className={className || "h-8 w-8"} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="64" height="64" rx="16" fill="#000000" />
      
      {/* "S" letter with gradient */}
      <text 
        x="12" 
        y="44" 
        fontFamily="Arial" 
        fontWeight="bold" 
        fontSize="48" 
        fill="url(#iconGradient)"
      >
        S
      </text>
      
      {/* Define gradients */}
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25F4EE" />
          <stop offset="100%" stopColor="#FE2C55" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default StorySceneIcon; 