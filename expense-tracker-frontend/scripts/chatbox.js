/**
 * Chatbox Component
 * Modular AI chat interface that integrates with the financial assistant API
 */

class Chatbox {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.conversationId = this.generateConversationId();
    this.isLoading = false;
    this.overlay = null;
    this.messagesContainer = null;
    this.inputField = null;
    this.sendBtn = null;
    this.triggerBtn = null;
    this.init();
  }

  /**
   * Generate a stable conversation id for backend chat continuity
   */
  generateConversationId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `chat-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  /**
   * Initialize the chatbox by creating DOM elements and setting up event listeners
   */
  init() {
    this.createChatboxHTML();
    this.cacheElements();
    this.attachEventListeners();
    this.displayWelcomeMessage();
  }

  /**
   * Create the chatbox HTML structure
   */
  createChatboxHTML() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'chatbox-overlay';
    overlay.id = 'chatboxOverlay';

    // Create chatbox container
    const container = document.createElement('div');
    container.className = 'chatbox-container';

    // Header
    const header = document.createElement('div');
    header.className = 'chatbox-header';
    header.innerHTML = `
      <div class="chatbox-header-icon">
        <i class="fa-duotone fa-solid fa-message-bot"></i>
        <h2>AI ADVISOR</h2>
      </div>
      <div class="chatbox-header-controls">
        <button class="chatbox-reset-btn" id="chatboxResetBtn" title="Clear chat history">
          <i class="fa-solid fa-arrow-rotate-right"></i>
        </button>
        <button class="chatbox-close-btn" id="chatboxCloseBtn">×</button>
      </div>
    `;

    // Messages area
    const messages = document.createElement('div');
    messages.className = 'chatbox-messages';
    messages.id = 'chatboxMessages';

    // Empty state
    messages.innerHTML = `
      <div class="chatbox-empty">
        <i class="fa-duotone fa-solid fa-wand-magic-sparkles"></i>
        <p>START A CONVERSATION</p>
      </div>
    `;

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'chatbox-input-area';
    inputArea.innerHTML = `
      <input 
        type="text" 
        class="chatbox-input-field" 
        id="chatboxInput" 
        placeholder="Ask about your finances..."
      />
      <button class="chatbox-send-btn" id="chatboxSendBtn">
        <i class="fa-solid fa-paper-plane"></i>
      </button>
    `;

    // Assemble chatbox
    container.appendChild(header);
    container.appendChild(messages);
    container.appendChild(inputArea);
    overlay.appendChild(container);

    // Add to DOM
    document.body.appendChild(overlay);
  }

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.overlay = document.getElementById('chatboxOverlay');
    this.messagesContainer = document.getElementById('chatboxMessages');
    this.inputField = document.getElementById('chatboxInput');
    this.sendBtn = document.getElementById('chatboxSendBtn');
    this.closeBtn = document.getElementById('chatboxCloseBtn');
    this.resetBtn = document.getElementById('chatboxResetBtn');
  }

  /**
   * Initialize trigger button and attach listeners
   */
  attachEventListeners() {
    // Find the trigger button by ID
    this.triggerBtn = document.getElementById('aiAssistantTrigger');
    if (this.triggerBtn) {
      this.triggerBtn.addEventListener('click', () => this.toggle());
      this.triggerBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    // Close button
    this.closeBtn.addEventListener('click', () => this.close());

    this.resetBtn.addEventListener('click', () => this.handleReset());

    // 
    // Overlay click to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Input field
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isLoading) {
        this.sendMessage();
      }
    });

    // Send button
    this.sendBtn.addEventListener('click', () => {
      if (!this.isLoading) {
        this.sendMessage();
      }
    });
  }

  /**
   * Display welcome message
   */
  displayWelcomeMessage() {
    const welcome = `Welcome to your AI Financial Advisor! I can help you understand your spending patterns, provide savings recommendations, and answer questions about your finances. What would you like to know?`;
    this.addAssistantMessage(welcome);
  }

  /**
   * Toggle chatbox open/close
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open the chatbox
   */
  open() {
    this.isOpen = true;
    this.overlay.classList.add('active');
    this.inputField.focus();
  }

  /**
   * Close the chatbox
   */
  close() {
    this.isOpen = false;
    this.overlay.classList.remove('active');
  }

  /**
   * Send a message to the AI
   */
  async sendMessage() {
    const message = this.inputField.value.trim();

    if (!message) return;

    const history = this.messages
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .map((item) => ({
        role: item.role,
        content: item.content
      }));

    // Add user message to UI
    this.addUserMessage(message);

    // Clear input
    this.inputField.value = '';

    // Disable send button and show loading
    this.setLoading(true);

    try {
      // Call AI API
      const response = await apiCall('/ai/chat', 'POST', {
        message: message,
        history: history,
        conversation_id: this.conversationId
      });

      // Add assistant response
      if (response.response) {
        this.addAssistantMessage(response.response);
      } else {
        this.addAssistantMessage('I apologize, but I could not process your request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addAssistantMessage(
        `Error: ${error.message}. Please try again or rephrase your question.`
      );
    } finally {
      this.setLoading(false);
      this.scrollToBottom();
    }
  }

  /**
   * Add user message to chat
   */
  addUserMessage(text) {
    // Clear empty state if this is the first real message
    if (this.messages.length === 0) {
      this.messagesContainer.innerHTML = '';
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble user';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    bubble.appendChild(content);
    this.messagesContainer.appendChild(bubble);

    this.messages.push({
      role: 'user',
      content: text,
      timestamp: new Date()
    });

    this.scrollToBottom();
  }

  /**
   * Add assistant message to chat
   */
  addAssistantMessage(text) {
    // Clear empty state if this is the first real message
    if (this.messages.length === 0) {
      this.messagesContainer.innerHTML = '';
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble assistant';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    bubble.appendChild(content);
    this.messagesContainer.appendChild(bubble);

    this.messages.push({
      role: 'assistant',
      content: text,
      timestamp: new Date()
    });

    this.scrollToBottom();
  }

  /**
   * Show loading indicator
   */
  addLoadingIndicator() {
    if (this.isLoading) {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble assistant';

      const loading = document.createElement('div');
      loading.className = 'message-loading';
      loading.innerHTML = '<span></span><span></span><span></span>';

      bubble.appendChild(loading);
      this.messagesContainer.appendChild(bubble);

      this.scrollToBottom();
    }
  }

  /**
   * Set loading state
   */
  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.sendBtn.disabled = isLoading;
    this.inputField.disabled = isLoading;

    if (isLoading) {
      this.addLoadingIndicator();
    } else {
      // Remove loading indicator
      const loading = this.messagesContainer.querySelector('.message-loading');
      if (loading) {
        loading.closest('.message-bubble').remove();
      }
    }
  }

  /**
   * Scroll messages to bottom
   */
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.messages = [];
    this.conversationId = this.generateConversationId();
    this.messagesContainer.innerHTML = `
      <div class="chatbox-empty">
        <i class="fa-duotone fa-solid fa-wand-magic-sparkles"></i>
        <p>START A CONVERSATION</p>
      </div>
    `;
  }

  /**
   * Handle reset button click with confirmation
   */
  handleReset() {
    if (this.messages.length === 0) {
      return; // Nothing to clear
    }

    if (confirm('Clear all messages? This cannot be undone.')) {
      this.clearHistory();
      this.displayWelcomeMessage();
    }
  }
}

// Initialize chatbox when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chatbox = new Chatbox();
});
