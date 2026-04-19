
import React from 'react';
import AppLogo from './AppLogo';

export const ImagemMaterial: React.FC<{ url?: string, alt: string, className?: string }> = ({ url, alt, className }) => {
  if (!url) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center text-slate-300 ${className}`}>
        <AppLogo size="sm" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={`object-cover ${className}`} referrerPolicy="no-referrer" />;
};
