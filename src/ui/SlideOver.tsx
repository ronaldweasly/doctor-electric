import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SlideOver({ isOpen, onClose, title, children }: SlideOverProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        <div className="pointer-events-none fixed inset-0 sm:inset-y-0 sm:right-0 sm:max-w-full flex sm:pl-10">
          <div className="pointer-events-auto w-full sm:w-screen sm:max-w-md transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl rounded-t-lg sm:rounded-none">
              <div className="px-4 py-4 sm:py-6 sm:px-6 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h2>
                  <div className="flex h-7 items-center flex-shrink-0">
                    <button
                      type="button"
                      className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-solar focus:ring-offset-2"
                      onClick={onClose}
                    >
                      <span className="absolute -inset-2.5" />
                      <span className="sr-only">Close panel</span>
                      <X className="h-5 h-5 sm:h-6 sm:w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative flex-1 px-4 py-4 sm:py-6 sm:px-6 overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
