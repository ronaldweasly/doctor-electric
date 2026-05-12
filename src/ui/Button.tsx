import React from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed',
          'active:scale-95 sm:active:scale-100',
          'touch-manipulation select-none',
          {
            // Primary variant
            'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-sm shadow-blue-200': 
              variant === 'primary',
            // Secondary variant
            'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-500 shadow-none': 
              variant === 'secondary',
            // Outline variant
            'border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:ring-slate-500': 
              variant === 'outline',
            // Ghost variant
            'text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-500': 
              variant === 'ghost',
            // Danger variant
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm shadow-red-200': 
              variant === 'danger',
            
            // Size variants - with better touch targets
            'h-8 px-3 text-xs': size === 'sm',
            'h-12 px-4 py-2 text-base': size === 'md',  // Mobile minimum 44px tap target
            'h-14 px-6 text-lg': size === 'lg',  // Comfortable touch target
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);
Button.displayName = 'Button';
