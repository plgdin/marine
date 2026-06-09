import { useEffect, useState } from 'react';

const ArrowIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="white" xmlns="http://www.w3.org/2400/svg">
    <path d="M1 1L16 14.5L10 15L13.5 21.5L10.5 22.5L7 16L1 21V1Z" />
  </svg>
);

const HandIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2400/svg">
    <path d="M10 2C8.9 2 8 2.9 8 4V10.2L7.4 9.6C6.6 8.8 5.4 8.8 4.6 9.6L4 10.2L9.6 18C10.4 19 11.6 19.6 13 19.6H16.5C18.4 19.6 20 18 20 16.1V10.1C20 9 19.1 8.1 18 8.1C17.8 8.1 17.7 8.1 17.5 8.2C17.3 7.1 16.4 6.3 15.3 6.3C15.1 6.3 15 6.3 14.8 6.4C14.6 5.3 13.7 4.5 12.6 4.5C12.4 4.5 12.3 4.5 12.1 4.6C11.9 3.5 11 2.6 9.9 2.6V2H10Z" />
  </svg>
);

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      // Check if hovering over a clickable element or maplibre pointer
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'button' ||
        target.tagName.toLowerCase() === 'a' ||
        target.closest('button') ||
        target.closest('a') ||
        // Check map container for pointer logic
        (target.classList.contains('maplibregl-canvas') && target.style.cursor === 'pointer')
      ) {
        setIsPointer(true);
      } else {
        setIsPointer(false);
      }
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', updatePosition);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        mixBlendMode: 'difference',
        // Offset so the arrow/hand tip matches exactly the mouse coordinate
        transform: `translate3d(${position.x - (isPointer ? 8 : 1)}px, ${position.y - (isPointer ? 2 : 1)}px, 0)`,
      }}
    >
      {isPointer ? <HandIcon /> : <ArrowIcon />}
    </div>
  );
}
