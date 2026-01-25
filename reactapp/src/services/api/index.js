/**
 * API Services Index
 * Central export for all API services
 */

export { default as apiClient, ApiError, getStoredUser, storeUser, clearAuthData } from './apiClient';
export { default as complaintsService } from './complaintsService';
export { default as usersService } from './usersService';
export { default as departmentsService } from './departmentsService';
export { default as categoriesService } from './categoriesService';
export { default as slaService } from './slaService';
export { default as escalationService } from './escalationService';
export { default as chatService } from './chatService';
export { default as auditService, AUDIT_ACTIONS, ACTOR_TYPES } from './auditService';
export { default as notificationService, NOTIFICATION_TYPES } from './notificationService';

// Resolution & Dispute services
export { default as resolutionProofService } from './resolutionProofService';
export { default as disputeService } from './disputeService';
export { default as signoffService } from './signoffService';
