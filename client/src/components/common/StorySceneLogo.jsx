import React from 'react';

const StorySceneLogo = ({ className }) => {
  return (
    <svg 
      className={className || "h-10 w-32"} 
      width="180" 
      height="42" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 180 42"
    >
      <text 
        x="10" 
        y="30" 
        fontFamily="Arial" 
        fontWeight="bold" 
        fontSize="22" 
        fill="#FFFFFF"
      >
        StoryScene
      </text>
      <text 
        x="140" 
        y="30" 
        fontFamily="Arial" 
        fontWeight="bold" 
        fontSize="22" 
        fill="url(#logoGradient)"
      >
        AI
      </text>
      
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25F4EE" />
          <stop offset="100%" stopColor="#FE2C55" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default StorySceneLogo; 