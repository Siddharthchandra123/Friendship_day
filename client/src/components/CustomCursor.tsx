import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const CustomCursor: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Motion values for the mouse position
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics configuration for the trailing follower
  const springConfig = { damping: 30, stiffness: 300, mass: 0.6 };
  const trailingX = useSpring(mouseX, springConfig);
  const trailingY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Disable custom cursor on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);
    document.body.classList.add('custom-cursor-active');

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    // Setup hover listeners for interactive elements
    const addHoverListeners = () => {
      const interactives = document.querySelectorAll(
        'button, a, input, textarea, select, [role="button"], .glass-card, .btn-primary, .btn-secondary'
      );
      
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', () => setIsHovered(true));
        el.addEventListener('mouseleave', () => setIsHovered(false));
      });
    };

    // Listeners for mouse actions
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Initial setup and observer for dynamically added DOM elements
    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      observer.disconnect();
    };
  }, [mouseX, mouseY]);

  if (!isVisible) return null;

  return (
    <>
      {/* 1. Fast Inner Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
          scale: isClicked ? 0.8 : 1,
        }}
        className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-50 bg-[var(--primary)] transition-transform duration-100 ease-out shadow-sm"
      />

      {/* 2. Smooth Spring Outer Follower Ring */}
      <motion.div
        style={{
          x: trailingX,
          y: trailingY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovered ? 48 : 28,
          height: isHovered ? 48 : 28,
          borderColor: isHovered ? 'var(--primary)' : 'rgba(168, 85, 247, 0.4)',
          backgroundColor: isHovered ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0)',
          scale: isClicked ? 0.9 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 28,
        }}
        className="fixed top-0 left-0 rounded-full border border-[var(--primary)] pointer-events-none z-50 mix-blend-screen shadow-md"
      />
    </>
  );
};
export default CustomCursor;



