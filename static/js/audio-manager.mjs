// Audio management module
export class AudioManager {
    constructor(isHost = false) {
        this.currentPlayer = null;
        this.currentFadeInterval = null;
        this.songMap = {};
        this.availableSongs = [];
        this.isPlaying = false;
        this.isHost = isHost;
    }

    async initializeSongs() {
        try {
            const response = await fetch('/api/songs');
            const data = await response.json();
            this.availableSongs = data.songs;
            
            // Create audio elements for each song
            this.availableSongs.forEach((songUrl, index) => {
                const audio = document.createElement('audio');
                audio.id = `song${index}`;
                audio.preload = 'auto';
                audio.loop = true;
                
                const source = document.createElement('source');
                source.src = songUrl;
                source.type = 'audio/mpeg';
                
                audio.appendChild(source);
                document.body.appendChild(audio);
                
                this.songMap[songUrl] = audio;
            });
            
            console.log('[Audio] Initialized songs:', this.availableSongs);
        } catch (error) {
            console.error('[Audio] Failed to load songs:', error);
        }
    }

    updateMusicState(playing, startTime, songUrl, hasHosts = false) {
        console.log('[Audio] State update:', { playing, songUrl, startTime, isHost: this.isHost, hasHosts });
        this.isPlaying = playing;
        
        // Play music logic:
        // - If there are no hosts in the room, all devices play music
        // - If there are hosts in the room, only host devices play music
        if (playing) {
            const shouldPlay = !hasHosts || this.isHost;
            if (shouldPlay) {
                this.startMusic(startTime, songUrl);
            } else {
                console.log('[Audio] Non-host client with hosts present - not playing audio');
            }
        } else {
            this.stopMusic();
        }
    }

    startMusic(startTime, songUrl) {
        console.log('[Audio] Starting music:', songUrl);
        this.stopMusic();
        
        this.currentPlayer = this.songMap[songUrl];
        if (!this.currentPlayer) {
            console.error('[Audio] Unknown song:', songUrl);
            console.log('[Audio] Available songs:', Object.keys(this.songMap));
            return;
        }
        
        this.currentPlayer.currentTime = 0;
        this.currentPlayer.volume = 0; // Start at volume 0
        
        if (startTime) {
            const elapsed = (Date.now() - startTime) / 1000;
            const seekTime = elapsed % this.currentPlayer.duration || 0;
            console.log('[Audio] Seeking to time:', seekTime, 'seconds');
            this.currentPlayer.currentTime = seekTime;
        }
        
        console.log('[Audio] Attempting to play...');
        this.currentPlayer.play().then(() => {
            console.log('[Audio] Playback started successfully');
            this.fadeInVolume(this.currentPlayer);
        }).catch(error => {
            console.error('[Audio] Failed to play:', error);
            document.getElementById('status').textContent = 'Failed to play - User interaction required';
        });
    }

    stopMusic() {
        if (this.currentPlayer) {
            console.log('[Audio] Stopping music');
            
            // Clear any ongoing fade-in
            if (this.currentFadeInterval) {
                clearInterval(this.currentFadeInterval);
                this.currentFadeInterval = null;
                console.log('[Audio] Cleared fade-in interval');
            }
            
            this.fadeOutVolume(this.currentPlayer).then(() => {
                this.currentPlayer.pause();
                this.currentPlayer.currentTime = 0;
                this.currentPlayer.volume = 1; // Reset volume for next play
                this.currentPlayer = null; // Reset player reference
                console.log('[Audio] All state reset');
            });
        }
    }

    fadeInVolume(audio) {
        console.log('[Audio] Fading in volume');
        
        // Clear any existing fade interval
        if (this.currentFadeInterval) {
            clearInterval(this.currentFadeInterval);
        }
        
        const fadeInDuration = 20000; // 20 seconds
        const steps = 100;
        const stepTime = fadeInDuration / steps;
        const volumeStep = 1 / steps;
        
        let currentStep = 0;
        
        this.currentFadeInterval = setInterval(() => {
            if (currentStep >= steps || !this.isPlaying) {
                clearInterval(this.currentFadeInterval);
                this.currentFadeInterval = null;
                if (this.isPlaying) {
                    audio.volume = 1;
                    console.log('[Audio] Fade in complete');
                }
                return;
            }
            
            currentStep++;
            audio.volume = Math.min(currentStep * volumeStep, 1);
        }, stepTime);
    }

    fadeOutVolume(audio) {
        console.log('[Audio] Fading out volume');
        return new Promise((resolve) => {
            const fadeOutDuration = 1000; // 1 second
            const steps = 50;
            const stepTime = fadeOutDuration / steps;
            const initialVolume = audio.volume;
            const volumeStep = initialVolume / steps;
            
            let currentStep = 0;
            
            const fadeInterval = setInterval(() => {
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    audio.volume = 0;
                    console.log('[Audio] Fade out complete');
                    resolve();
                    return;
                }
                
                currentStep++;
                audio.volume = Math.max(initialVolume - (currentStep * volumeStep), 0);
            }, stepTime);
        });
    }

    // Debug functionality
    testPlaySong(songUrl) {
        // Stop any currently playing test audio
        this.stopAllTestAudio();
        
        const audio = this.songMap[songUrl];
        if (!audio) {
            console.error('[Audio Debug] Song not found:', songUrl);
            return;
        }
        
        console.log('[Audio Debug] Playing test song:', songUrl);
        audio.currentTime = 0;
        audio.volume = 0; // Start at volume 0 for test too
        audio.play().then(() => {
            console.log('[Audio Debug] Test playback started successfully');
            this.fadeInVolume(audio);
        }).catch(error => {
            console.error('[Audio Debug] Test playback failed:', error);
        });
    }

    stopAllTestAudio() {
        console.log('[Audio Debug] Stopping all test audio with fade out');
        Object.values(this.songMap).forEach(audio => {
            if (!audio.paused) {
                this.fadeOutVolume(audio).then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1; // Reset volume
                });
            }
        });
    }
}