'use client';

import { useState } from 'react';

interface CardImageProps {
  src: string;
  alt: string;
  fallbackSrc: string;
  className?: string;
}

export default function CardImage({
  src,
  alt,
  fallbackSrc,
  className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
}: CardImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
    />
  );
}
