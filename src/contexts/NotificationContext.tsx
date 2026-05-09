import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSheetData } from '../sheets/api';
import { SHEET_NAMES } from '../sheets/config';
import { PaymentRow, WorkflowStatusRow, ClientRow } from '../sheets/types';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { differenceInDays, parse, isValid } from 'date-fns';

export interface AppNotification {
  id: string;
  clientId: string;
  clientName: string;
  type: 'payment' | 'workflow';
  message: string;
  read: boolean;
  timestamp: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const checkReminders = async () => {
      try {
        const [payments, workflowStatuses, clients] = await Promise.all([
          getSheetData<PaymentRow>(SHEET_NAMES.PAYMENTS),
          getSheetData<WorkflowStatusRow>(SHEET_NAMES.WORKFLOW_STATUS),
          getSheetData<ClientRow>(SHEET_NAMES.CLIENTS)
        ]);

        const clientMap = new Map(clients.map(c => [c.ID, c.Name]));
        const newNotifications: AppNotification[] = [];

        // Check payments
        payments.forEach(payment => {
          if (payment['Payment Status'] !== 'Paid' && payment['Due Date']) {
            const dueDate = parse(payment['Due Date'], 'dd/MM/yyyy', new Date());
            if (isValid(dueDate)) {
              const diff = differenceInDays(dueDate, new Date());
              if (diff <= 3) {
                newNotifications.push({
                  id: `payment-${payment['Client ID']}-${payment['Due Date']}`,
                  clientId: payment['Client ID'],
                  clientName: clientMap.get(payment['Client ID']) || 'Unknown Client',
                  type: 'payment',
                  message: `Payment of ${payment['Pending Amount (₹)']} is due ${diff < 0 ? 'overdue' : `in ${diff} days`}.`,
                  read: false,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        });

        // Check workflow statuses
        workflowStatuses.forEach(ws => {
          if (ws['Updated At']) {
             // Let's assume ISO string or dd/MM/yyyy. Actually schema says Date format: DD/MM/yyyy. 
             // Time might not be parsed easily if it's DD/MM/yyyy. Let's assume ISO for "At" fields to be safe or parse properly.
             const updatedAt = new Date(ws['Updated At']); 
             if (!isNaN(updatedAt.getTime())) {
                const diff = differenceInDays(new Date(), updatedAt);
                if (diff > 7 && ws.Stage !== 'Project Closed') {
                  newNotifications.push({
                    id: `workflow-${ws['Client ID']}-${ws['Updated At']}`,
                    clientId: ws['Client ID'],
                    clientName: clientMap.get(ws['Client ID']) || 'Unknown Client',
                    type: 'workflow',
                    message: `Stuck in stage "${ws.Stage}" for ${diff} days.`,
                    read: false,
                    timestamp: new Date().toISOString()
                  });
                }
             }
          }
        });

        // Simple duplicate removal based on ID
        setNotifications(prev => {
           const existingIds = new Set(prev.map(n => n.id));
           const filteredNew = newNotifications.filter(n => !existingIds.has(n.id));
           
           if (filteredNew.length > 0) {
              if (filteredNew.length > 3) {
                toast(`You have ${filteredNew.length} new reminders`, { description: 'Check your notification panel for details.' });
              } else {
                filteredNew.forEach(n => {
                   toast(`Reminder: ${n.clientName}`, { description: n.message });
                });
              }
           }
           
           return [...filteredNew, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });

      } catch (err) {
        console.error("Failed to check reminders", err);
      }
    };

    checkReminders();
    const intervalId = setInterval(checkReminders, 60000); // Check every 60s
    return () => clearInterval(intervalId);
  }, [user]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
