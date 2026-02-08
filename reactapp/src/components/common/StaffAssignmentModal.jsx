/**
 * StaffAssignmentModal - Modal for selecting staff to assign to a complaint
 * 
 * Used by Department Heads to assign/reassign complaints to staff members.
 * Shows a list of department staff with name, email, and current workload.
 */

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  X, 
  User, 
  Mail, 
  Phone,
  CheckCircle2, 
  Search,
  Loader2,
  UserCheck
} from 'lucide-react';
import { cn, maskPhoneNumber } from '../../lib/utils';

/**
 * StaffAssignmentModal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onAssign - Callback when staff is selected (receives staffId)
 * @param {Array} props.staffList - List of staff members [{ id, name, email, ... }]
 * @param {Object} props.complaint - The complaint being assigned
 * @param {boolean} props.isLoading - Loading state for the assignment action
 */
const StaffAssignmentModal = ({
  isOpen,
  onClose,
  onAssign,
  staffList = [],
  complaint,
  isLoading = false,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter staff based on search query (name, email, or phone)
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    
    const query = searchQuery.toLowerCase();
    return staffList.filter(staff => 
      staff.name?.toLowerCase().includes(query) ||
      staff.email?.toLowerCase().includes(query) ||
      staff.mobile?.toLowerCase().includes(query) ||
      staff.phone?.toLowerCase().includes(query)
    );
  }, [staffList, searchQuery]);

  // Handle assignment
  const handleAssign = () => {
    if (selectedStaffId && onAssign) {
      onAssign(selectedStaffId);
    }
  };

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedStaffId(null);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  const complaintId = complaint?.complaintId || complaint?.id;
  const currentStaffId = complaint?.staffId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <Card className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {currentStaffId ? 'Reassign Complaint' : 'Assign Complaint'}
            </CardTitle>
            <CardDescription className="mt-1">
              {complaintId && `Complaint #${complaintId}`}
              {complaint?.title && ` - ${complaint.title}`}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No staff matching your search.' : 'No staff members available.'}
              </div>
            ) : (
              filteredStaff.map((staff) => {
                // Backend returns userId, not id
                const staffId = staff.userId || staff.id;
                const isSelected = selectedStaffId === staffId;
                const isCurrentAssignee = currentStaffId === staffId;
                
                const handleStaffClick = () => {
                  if (!isLoading && !isCurrentAssignee) {
                    setSelectedStaffId(staffId);
                  }
                };
                
                return (
                  <div
                    key={staffId}
                    onClick={handleStaffClick}
                    className={cn(
                      'flex items-center justify-between p-3 border rounded-lg transition-colors',
                      !isCurrentAssignee && 'cursor-pointer',
                      isSelected && 'border-primary bg-primary/5',
                      isCurrentAssignee && 'border-dashed opacity-60 cursor-not-allowed',
                      !isSelected && !isCurrentAssignee && 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar/Icon */}
                      <div className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <User className="h-5 w-5" />
                      </div>
                      
                      {/* Staff Info */}
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          {staff.name}
                          {isCurrentAssignee && (
                            <Badge variant="secondary" className="text-xs">
                              Currently Assigned
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {staff.email}
                        </p>
                        {(staff.mobile || staff.phone) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {maskPhoneNumber(staff.mobile || staff.phone)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedStaffId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Assign to Staff
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default StaffAssignmentModal;
