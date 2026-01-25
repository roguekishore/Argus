import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, CardContent, Input, Avatar, AvatarFallback, ScrollArea, Separator } from './ui';
import { ThemeToggle } from './theme-toggle';
import { Send, RotateCcw, Building2, User, Bot } from 'lucide-react';

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
    const greeting = {
      type: 'bot',
      text: "Welcome to Municipal Grievance Portal!\n\nI can help you:\n• Report civic issues\n• Track your complaints\n\nLet's get started!",
      timestamp: new Date()
    };
    setMessages([greeting]);
    setQuickReplies([
      { id: 'register', label: 'Register', value: 'I want to register' },
      { id: 'help', label: 'What can you do?', value: 'What can you help me with?' }
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
      const errorMessage = { type: 'bot', text: 'Connection error. Please try again.', timestamp: new Date() };
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
      text: "Welcome to Municipal Grievance Portal!\n\nI can help you:\n• Report civic issues\n• Track your complaints\n\nLet's get started!",
      timestamp: new Date()
    }]);
    setQuickReplies([
      { id: 'register', label: 'Register', value: 'I want to register' },
      { id: 'help', label: 'What can you do?', value: 'What can you help me with?' }
    ]);
    setIsRegistered(false);
    setUserName(null);
    setShowRegistrationForm(false);
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md h-[600px] flex flex-col shadow-lg">
        {/* Header */}
        <CardContent className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-sm">Municipal Grievance Portal</h1>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {isRegistered ? userName : 'Online'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={resetChat} title="New Chat">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'bot' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-1' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      msg.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                  />
                  <span className={`text-[10px] text-muted-foreground mt-1 block ${msg.type === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.type === 'user' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Registration Form Modal */}
        {showRegistrationForm && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-[90%] max-w-sm mx-4">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Quick Registration</h3>
                <form onSubmit={handleRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input
                      placeholder="Enter your full name"
                      value={regForm.name}
                      onChange={(e) => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number *</label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={regForm.phone}
                      onChange={(e) => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {regForm.hasEmail === null && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Do you have an email?</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setRegForm(prev => ({ ...prev, hasEmail: true }))}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setRegForm(prev => ({ ...prev, hasEmail: false }))}
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {regForm.hasEmail === true && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Email Address</label>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setRegForm(prev => ({ ...prev, hasEmail: null, email: '' }))}
                        >
                          Change
                        </Button>
                      </div>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={regForm.email}
                        onChange={(e) => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  )}
                  
                  {regForm.hasEmail === false && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm text-muted-foreground">Continuing without email</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setRegForm(prev => ({ ...prev, hasEmail: null }))}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowRegistrationForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={!regForm.name || !regForm.phone || regForm.hasEmail === null}
                    >
                      Register
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Replies */}
        {quickReplies.length > 0 && !showRegistrationForm && (
          <div className="px-4 py-2 border-t">
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.id}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ChatBot;
