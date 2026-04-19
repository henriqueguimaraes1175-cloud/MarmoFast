
import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const AppLogo: React.FC<AppLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
     lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-5xl'
  };

  return (
    <div className={`aspect-square bg-slate-950 rounded-[25%] flex items-center justify-center relative overflow-hidden shadow-inner group ${sizeClasses[size]} ${className}`}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      
      {/* "MF" Logo with SVG for custom shape */}
      <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Underline Bar */}
        <rect x="15" y="80" width="70" height="4" fill="white" fillOpacity="0.8" rx="2" />
        
        {/* "M" and "F" Styling */}
        <path 
          d="M20 70V30L40 55L60 30V70H75V60H65V30H80V25H55V25H45V60Z" 
          className="hidden" // Just a reference, using simplified manual paths below
        />
        
        {/* Custom "MF" Path */}
        <g fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
          {/* M - Left part */}
          <path d="M15 75V25H28L42 50L45 45L35 25H48V75H38V42L28 60L15 75Z" className="opacity-95" />
          
          {/* F - Right part */}
          <path d="M52 25H85V35H62V45H80V55H62V75H52V25Z" />
          
          {/* Lightning Bolt connection (Blue accent) */}
          <path d="M42 50L55 35L48 55L52 75L42 50Z" fill="#3B82F6" className="animate-pulse" />
        </g>
      </svg>
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 opacity-50"></div>
    </div>
  );
};

export default AppLogo;
