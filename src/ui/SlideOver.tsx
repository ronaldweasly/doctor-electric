import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export function SlideOver({ isOpen, onClose, title, children, fullHeight = false }: SlideOverProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.classList.add('hide-bottom-nav');
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      document.body.classList.remove('hide-bottom-nav');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/40 transition-opacity backdrop-blur-sm" 
          onClick={onClose}
        />
        
        {/* Slide panel */}
        <div className="pointer-events-none fixed inset-0 flex flex-col-reverse sm:flex-col sm:inset-y-0 sm:right-0 sm:max-w-full">
          <div className="pointer-events-auto w-full h-full sm:h-auto sm:w-screen sm:max-w-2xl flex flex-col transform transition-transform duration-300 ease-in-out rounded-t-2xl sm:rounded-none">
            {/* Mobile header bar for dragging */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Actual content container */}
            <div className="flex flex-col h-full sm:h-screen bg-white shadow-2xl sm:shadow-xl rounded-t-2xl sm:rounded-none overflow-hidden">
              
              {/* Header */}
              {title && (
                <div className="px-4 py-3 sm:py-4 sm:px-6 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate flex-1">{title}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              )}

              {/* Content area - scrollable */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
