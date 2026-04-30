class LoadingManager {
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

    stopLoading(button) {
        if (!button) return;

        button.disabled = false;
        button.classList.remove('loading');
        button.textContent = button.dataset.originalText || button.textContent;
    }

    async executeWithLoading(button, asyncFn) {
        try {
            this.startLoading(button);
            const result = await asyncFn();
            this.stopLoading(button);
            return result;
        } catch (error) {
            this.stopLoading(button);
            throw error;
        }
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

function showLoading() {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-circle"></div>
                <p>Loading...</p>
            </div>
        `;
        document.body.appendChild(overlay);

        if (!document.getElementById('loading-overlay-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-overlay-styles';
            style.textContent = `
                #global-loading-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .loading-spinner {
                    text-align: center;
                }

                .spinner-circle {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #333;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .loading-spinner p {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 14px;
                    color: #333;
                }
            `;
            document.head.appendChild(style);
        }
    }

    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}