import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

const API_URL = 'http://localhost:8080/api/chat';

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [userName, setUserName] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', hasEmail: null });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Initial greeting
    const greeting = {
      type: 'bot',
      text: "👋 **Welcome to Municipal Grievance Portal!**\n\nI can help you:\n• 📝 Report civic issues\n• 🔍 Track your complaints\n\nLet's get started!",
      timestamp: new Date()
    };
    setMessages([greeting]);
    setQuickReplies([
      { id: 'register', label: '📝 Register', value: 'I want to register' },
      { id: 'help', label: '❓ What can you do?', value: 'What can you help me with?' }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    const userMessage = { type: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setQuickReplies([]);

    try {
      const response = await fetch(`${API_URL}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text })
      });

      const data = await response.json();
      
      setSessionId(data.sessionId);
      setIsRegistered(data.registered);
      setUserName(data.userName);
      setQuickReplies(data.quickReplies || []);
      
      const botMessage = { type: 'bot', text: data.message, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { type: 'bot', text: '❌ Connection error. Please try again.', timestamp: new Date() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply) => {
    if (reply.id === 'register') {
      setShowRegistrationForm(true);
      return;
    }
    if (reply.id === 'has_email') {
      setRegForm(prev => ({ ...prev, hasEmail: true }));
      return;
    }
    if (reply.id === 'no_email') {
      setRegForm(prev => ({ ...prev, hasEmail: false, email: '' }));
      return;
    }
    sendMessage(reply.value);
  };

  const handleRegistration = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      alert('Name and Phone are required!');
      return;
    }
    
    let message = `My name is ${regForm.name} and my phone number is ${regForm.phone}`;
    if (regForm.hasEmail && regForm.email.trim()) {
      message += ` and my email is ${regForm.email}`;
    } else {
      message += '. I don\'t have an email';
    }
    
    setShowRegistrationForm(false);
    setRegForm({ name: '', phone: '', email: '', hasEmail: null });
    sendMessage(message);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = async () => {
    try {
      await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (e) {}
    
    setSessionId(null);
    setMessages([{
      type: 'bot',
      text: "👋 **Welcome to Municipal Grievance Portal!**\n\nI can help you:\n• 📝 Report civic issues\n• 🔍 Track your complaints\n\nLet's get started!",
      timestamp: new Date()
    }]);
    setQuickReplies([
      { id: 'register', label: '📝 Register', value: 'I want to register' },
      { id: 'help', label: '❓ What can you do?', value: 'What can you help me with?' }
    ]);
    setIsRegistered(false);
    setUserName(null);
    setShowRegistrationForm(false);
  };

  const formatMessage = (text) => {
    // Convert markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="chatbot-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-info">
          <div className="header-icon">🏛️</div>
          <div>
            <h1>Municipal Grievance Portal</h1>
            <span className="status">
              {isRegistered ? `✅ ${userName}` : '🔵 Online'}
            </span>
          </div>
        </div>
        <button className="reset-btn" onClick={resetChat} title="New Chat">
          🔄
        </button>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div 
              className="message-content"
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
            />
            <span className="message-time">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot">
            <div className="message-content typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <div className="registration-overlay">
          <div className="registration-form">
            <h3>📝 Quick Registration</h3>
            <form onSubmit={handleRegistration}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={regForm.name}
                  onChange={(e) => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={regForm.phone}
                  onChange={(e) => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
              
              {regForm.hasEmail === null && (
                <div className="form-group">
                  <label>Do you have an email?</label>
                  <div className="email-options">
                    <button 
                      type="button" 
                      className="option-btn yes"
                      onClick={() => setRegForm(prev => ({ ...prev, hasEmail: true }))}
                    >
                      ✅ Yes, I have email
                    </button>
                    <button 
                      type="button" 
                      className="option-btn no"
                      onClick={() => setRegForm(prev => ({ ...prev, hasEmail: false }))}
                    >
                      ❌ No email
                    </button>
                  </div>
                </div>
              )}
              
              {regForm.hasEmail === true && (
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <button 
                    type="button" 
                    className="change-email-btn"
                    onClick={() => setRegForm(prev => ({ ...prev, hasEmail: null, email: '' }))}
                  >
                    Change
                  </button>
                </div>
              )}
              
              {regForm.hasEmail === false && (
                <div className="form-group">
                  <p className="no-email-msg">✓ Continuing without email</p>
                  <button 
                    type="button" 
                    className="change-email-btn"
                    onClick={() => setRegForm(prev => ({ ...prev, hasEmail: null }))}
                  >
                    Change
                  </button>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowRegistrationForm(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={!regForm.name || !regForm.phone || regForm.hasEmail === null}
                >
                  Register →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Replies */}
      {quickReplies.length > 0 && !showRegistrationForm && (
        <div className="quick-replies">
          {quickReplies.map((reply) => (
            <button
              key={reply.id}
              className="quick-reply-btn"
              onClick={() => handleQuickReply(reply)}
            >
              {reply.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button 
          className="send-btn" 
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatBot;
