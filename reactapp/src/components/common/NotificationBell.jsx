/**
 * NotificationBell - Trigger component for notifications
 * 
 * ARCHITECTURE NOTES:
 * - Self-contained: fetches its own data via useNotifications hook
 * - Displays bell icon with unread badge
 * - Opens NotificationPanel dropdown on click
 * - Handles notification click → mark as read
 * 
 * DESIGN:
 * - Uses Popover pattern for dropdown
 * - Calm, non-intrusive design
 * - Badge only shows when unread > 0
 */

import React, { useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../../hooks';

/**
 * Custom dropdown wrapper since we're keeping it simple
 * without adding new shadcn components
 */
const NotificationDropdown = ({ 
  isOpen, 
  onClose, 
  children,
  className,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className={cn(
        'absolute right-0 top-full mt-2 z-50',
        'w-80 sm:w-96',
        'bg-background rounded-lg shadow-lg border border-border',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}>
        {children}
      </div>
    </>
  );
};

/**
 * NotificationBell Component
 * 
 * @param {Object} props
 * @param {Function} props.onNavigateToComplaint - Callback to navigate to complaint detail
 * @param {string} props.className - Additional CSS classes
 */
const NotificationBell = ({ 
  onNavigateToComplaint,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({ autoFetch: true });

  /**
   * Toggle dropdown
   */
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  /**
   * Close dropdown
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle notification click
   * Marks as read and optionally navigates
   */
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  }, [markAsRead]);

  /**
   * Handle navigation to complaint
   * Closes dropdown and triggers navigation callback
   */
  const handleNavigateToComplaint = useCallback((complaintId) => {
    handleClose();
    onNavigateToComplaint?.(complaintId);
  }, [handleClose, onNavigateToComplaint]);

  /**
   * Handle mark all as read
   */
  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className={cn('relative', className)}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1',
            'h-4 min-w-4 px-1',
            'rounded-full',
            'bg-destructive text-destructive-foreground',
            'text-[10px] font-medium',
            'flex items-center justify-center',
            'animate-in zoom-in-50 duration-200'
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      <NotificationDropdown isOpen={isOpen} onClose={handleClose}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Panel */}
        <NotificationPanel
          notifications={notifications}
          isLoading={isLoading}
          error={error}
          unreadCount={unreadCount}
          onNotificationClick={handleNotificationClick}
          onNavigateToComplaint={handleNavigateToComplaint}
          onMarkAllRead={handleMarkAllRead}
          onRetry={refresh}
        />
      </NotificationDropdown>
    </div>
  );
};

export default NotificationBell;
