/**
 * DashboardSection - Reusable Section Component for Dashboards
 * 
 * ARCHITECTURE NOTES:
 * - Role-agnostic wrapper for dashboard content sections
 * - Provides consistent layout and styling
 * - Supports title, description, optional action button
 * - Dashboards compose using this component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import { cn } from '../../lib/utils';

/**
 * DashboardSection Component
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.description - Optional section description
 * @param {React.ReactNode} props.children - Section content
 * @param {React.ReactNode} props.action - Optional action element (button, link)
 * @param {boolean} props.noPadding - Remove content padding
 * @param {string} props.className - Additional CSS classes
 */
const DashboardSection = ({
  title,
  description,
  children,
  action,
  noPadding = false,
  className,
}) => {
  // If no title, just render children in a wrapper
  if (!title) {
    return <div className={cn('space-y-4', className)}>{children}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className={cn(noPadding && 'p-0 pt-0')}>
        {children}
      </CardContent>
    </Card>
  );
};

/**
 * PageHeader - Consistent page header for dashboards
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {React.ReactNode} props.actions - Optional action buttons
 */
export const PageHeader = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

/**
 * StatsGrid - Display stats cards in a grid
 * 
 * @param {Object} props
 * @param {Array} props.stats - Array of { title, value, description?, icon? }
 * @param {number} props.columns - Number of columns (default: 4)
 */
export const StatsGrid = ({ stats, columns = 4 }) => {
  const colClass = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-3 sm:gap-4', colClass[columns] || colClass[4])}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
              {stat.title}
            </CardTitle>
            {stat.icon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{stat.icon}</span>}
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{stat.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * EmptyState - Consistent empty state display
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} props.title - Empty state title
 * @param {string} props.description - Empty state description
 * @param {React.ReactNode} props.action - Optional action button
 */
export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default DashboardSection;
