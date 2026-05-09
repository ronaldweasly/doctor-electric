import React from 'react';
import { FileQuestion } from 'lucide-react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-gray-300 bg-gray-50", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
        {icon || <FileQuestion className="h-6 w-6 text-gray-400" />}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
