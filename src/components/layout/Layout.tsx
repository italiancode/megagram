'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    setMounted(true);
    
    // Check for mobile viewport
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Fix iOS 100vh issue with CSS variables
    const setVhVariable = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVhVariable();
    window.addEventListener('resize', setVhVariable);
    
    // Clean up particles and event listeners on unmount
    return () => {
      particlesRef.current.forEach(particle => {
        particle.remove();
      });
      particlesRef.current = [];
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', setVhVariable);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !mounted) return;

    const container = containerRef.current;
    const createParticle = () => {
      // Don't create particles if component is unmounted
      if (!mounted) return;
      
      // Limit particles on mobile
      if (isMobile && particlesRef.current.length > 5) return;
      
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random position
      const x = Math.random() * 100; // 0-100% horizontally
      const y = Math.random() * 100; // 0-100% vertically
      
      // Random size (smaller for more subtle effect)
      const size = Math.random() * 3 + 1; // 1-4px
      
      // Random opacity and duration for more natural look
      const opacity = Math.random() * 0.25 + 0.1; // 0.1-0.35
      const duration = Math.random() * 15 + 10; // 10-25s
      
      // Apply styles
      Object.assign(particle.style, {
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity.toString(),
        animation: `float ${duration}s linear infinite`
      });
      
      // Add to container and track
      container.appendChild(particle);
      particlesRef.current.push(particle);
      
      // Remove after a while to prevent too many particles
      setTimeout(() => {
        if (particle.parentNode) {
          particle.remove();
          particlesRef.current = particlesRef.current.filter(p => p !== particle);
        }
      }, duration * 1000);
    };
    
    // Create particles at intervals - less frequent on mobile
    const interval = setInterval(createParticle, isMobile ? 2500 : 1000);
    
    // Seed initial particles - fewer on mobile
    const initialCount = isMobile ? 5 : 15;
    for (let i = 0; i < initialCount; i++) {
      createParticle();
    }
    
    return () => clearInterval(interval);
  }, [mounted, isMobile]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white relative overflow-hidden">
      <div 
        ref={containerRef}
        className="particles-container absolute inset-0 pointer-events-none z-0"
      />
      
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800/80 z-0" />
      
      <Header />
      
      <main className="flex-1 relative z-10 overflow-hidden w-full max-w-full mt-auto">
        {children}
      </main>
      
      <footer className="relative z-20 py-1.5 sm:py-2 px-2 sm:px-4 text-center text-[10px] sm:text-xs text-gray-500 bg-gray-800/90 border-t border-gray-700/50">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <div className="inline-flex items-center gap-1 sm:gap-1.5">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Network Connected</span>
          </div>
          <span>•</span>
          <span>MegaETH v0.1.0</span>
        </div>
      </footer>
      
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-30px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(15px);
          }
          100% {
            transform: translateY(0) translateX(0);
          }
        }
        
        .particle {
          position: absolute;
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
