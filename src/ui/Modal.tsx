import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const lockScroll = () => {
      const w = window as any;
      if (typeof w.__solarcrmScrollLockCount !== 'number') {
        w.__solarcrmScrollLockCount = 0;
      }
      if (w.__solarcrmScrollLockCount === 0) {
        w.__solarcrmBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      w.__solarcrmScrollLockCount += 1;
    };

    const unlockScroll = () => {
      const w = window as any;
      if (typeof w.__solarcrmScrollLockCount !== 'number') {
        w.__solarcrmScrollLockCount = 0;
      }
      w.__solarcrmScrollLockCount = Math.max(0, w.__solarcrmScrollLockCount - 1);
      if (w.__solarcrmScrollLockCount === 0) {
        document.body.style.overflow = w.__solarcrmBodyOverflow || '';
      }
    };

    if (isOpen) lockScroll();
    return () => {
      if (isOpen) unlockScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      <div className={cn("relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg", className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
