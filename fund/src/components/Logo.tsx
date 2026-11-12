import React from 'react';
import logoSrc from '../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({
  className = 'w-9 h-9',
  size,
  alt = 'Jivan Chit Funds Logo',
  style
}) => {
  const sizeStyle: React.CSSProperties = size ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`jivan-logo-img object-contain inline-block shrink-0 ${className}`}
      style={{
        ...sizeStyle,
        ...style,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
      loading="eager"
      decoding="sync"
    />
  );
};
