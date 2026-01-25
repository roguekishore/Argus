/**
 * Chat Service
 * 
 * AI Chatbot API calls
 * Uses ONLY endpoints defined in ENDPOINTS.md
 */

import apiClient from './apiClient';

const chatService = {
  /**
   * Send a message to the AI chatbot
   * POST /api/chat/message
   * @param {Object} messageData - { message, sessionId? }
   */
  sendMessage: (message, sessionId = null) => {
    return apiClient.post('/chat/message', { message, sessionId });
  },

  /**
   * Reset chat session
   * POST /api/chat/reset
   * @param {string} sessionId 
   */
  reset: (sessionId = null) => {
    return apiClient.post('/chat/reset', { sessionId });
  },
};

export default chatService;
