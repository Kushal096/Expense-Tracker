class LoadingManager {
    constructor() {
        this.isLoading = false;
        this.activeRequests = new Set();
    }

    startLoading(button, originalText = null) {
        if (!button) return;

        if (!originalText && !button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }

        button.disabled = true;
        button.classList.add('loading');

        button.innerHTML = `
            <span class="spinner"></span>
            <span class="loading-text">Processing...</span>
        `;
    }

    stopLoading(button, success = true) {
        if (!button) return;

        button.disabled = false;
        button.classList.remove('loading');

        const originalText = button.dataset.originalText || button.textContent;
        button.textContent = originalText;
    }

    async executeWithLoading(button, asyncFn) {
        try {
            this.startLoading(button);
            const result = await asyncFn();
            this.stopLoading(button, true);
            return result;
        } catch (error) {
            this.stopLoading(button, false);
            throw error;
        }
    }

    canSubmit(button, debounceTime = 300) {
        if (!button || button.disabled) return false;
        
        button.disabled = true;
        setTimeout(() => {
            button.disabled = false;
        }, debounceTime);
        
        return true;
    }
}

const loadingManager = new LoadingManager();
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, duration);

    return notification;
}

function setupNotificationStyles() {
    if (document.getElementById('notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', setupNotificationStyles);
