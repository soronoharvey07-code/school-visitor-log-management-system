import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface VisitorAvatarProps {
  src?: string | null;
  alt?: string;
  iconSize?: number;
  className?: string;
}

export function VisitorAvatar({
  src,
  alt = 'Visitor',
  iconSize = 20,
  className = 'w-10 h-10'
}: VisitorAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div className={`${className} bg-app-bg border border-app-border rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-inner`}>
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <User size={iconSize} className="text-slate-400 dark:text-slate-500" />
      )}
    </div>
  );
}
