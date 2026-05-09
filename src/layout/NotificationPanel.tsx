import React, { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-16 z-50 w-80 sm:w-96 rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-solar hover:text-solar-dark font-medium"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No notifications at the moment.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <li 
                key={n.id} 
                className={cn("px-4 py-3 hover:bg-gray-50 transition-colors", {
                  "bg-blue-50/50": !n.read
                })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{n.clientName}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="ml-2 text-gray-400 hover:text-solar"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-2 text-right">
                  <button 
                    onClick={() => {
                      onClose();
                      navigate(`/clients/${n.clientId}`);
                    }}
                    className="text-xs font-medium text-solar hover:text-solar-dark"
                  >
                    Go to Client &rarr;
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
