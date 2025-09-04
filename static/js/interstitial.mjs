// Interstitial component to handle user interaction requirement for audio playback
export class Interstitial {
    constructor(roomInfo) {
        this.roomInfo = roomInfo;
        this.overlay = null;
        this.hasInteracted = false;
    }

    show() {
        if (this.hasInteracted) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.createOverlay();
            this.onJoin = resolve;
        });
    }

    createOverlay() {
        // Create overlay div
        this.overlay = document.createElement('div');
        this.overlay.className = 'interstitial-overlay';
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'container';

        // Create title
        const title = document.createElement('h1');
        title.textContent = '🎵 Wrap It Up!';

        const displayName = this.roomInfo.roomId === 'default' ? 'Lobby' : this.roomInfo.roomId;

        // Create host indicator if applicable
        const hostIndicator = document.createElement('div');
        hostIndicator.className = 'interstitial-host-indicator';
        if (this.roomInfo.isHost) {
            hostIndicator.textContent = '👑 Host Mode';
        }

        // Create join button
        const joinButton = document.createElement('button');
        joinButton.className = 'play-button';
        joinButton.textContent = `Join ${displayName}`;
        
        joinButton.addEventListener('click', () => {
            this.handleJoin();
        });

        // Assemble content
        content.appendChild(title);
        if (this.roomInfo.isHost) {
            content.appendChild(hostIndicator);
        }
        content.appendChild(joinButton);

        this.overlay.appendChild(content);
        document.body.appendChild(this.overlay);

        // Add CSS styles
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .interstitial-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }



            .interstitial-host-indicator {
                font-size: 1rem;
                color: white;
                margin-bottom: 2rem;
                font-weight: 500;
                opacity: 0.8;
            }

        `;
        document.head.appendChild(style);
    }

    handleJoin() {
        this.hasInteracted = true;
        
        // Remove overlay with animation
        this.overlay.style.opacity = '0';
        this.overlay.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }, 300);

        // Resolve the promise to continue app initialization
        if (this.onJoin) {
            this.onJoin();
        }
    }

    static hasRequiredInteraction() {
        // Check if user has already interacted with the page
        return document.body.getAttribute('data-user-interacted') === 'true';
    }

    static markInteraction() {
        // Mark that user has interacted with the page
        document.body.setAttribute('data-user-interacted', 'true');
    }
}