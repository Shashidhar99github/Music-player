// Player Service - Handles audio playback functionality
class Player {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentTrack = null;
        this.playlist = [];
        this.currentTrackIndex = -1;
        this.isPlaying = false;
        this.volume = 0.7;
        this.shuffle = false;
        this.repeat = false;
        this.audio.volume = this.volume;

        // Event listeners
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onTrackEnd());
        this.audio.addEventListener('error', (e) => this.onError(e));
    }

    // Load a track
    loadTrack(track, autoplay = true) {
        if (!track) return;

        this.currentTrack = track;
        this.audio.src = `/uploads/${track.file_path}`;
        
        if (autoplay) {
            this.play().catch(error => {
                console.error('Error playing track:', error);
                this.showToast('Error playing track', 'error');
            });
        }

        // Update UI
        this.updateNowPlayingUI();
        this.highlightCurrentTrack();
    }

    // Play the current track
    async play() {
        if (!this.currentTrack) return;

        try {
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayPauseButton();
        } catch (error) {
            console.error('Playback error:', error);
            throw error;
        }
    }

    // Pause the current track
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    // Toggle play/pause
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play().catch(console.error);
        }
    }

    // Play next track
    next() {
        if (this.playlist.length === 0) return;

        if (this.shuffle) {
            this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        }

        this.loadTrack(this.playlist[this.currentTrackIndex]);
    }

    // Play previous track
    prev() {
        if (this.playlist.length === 0) return;

        if (this.shuffle) {
            this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        }

        this.loadTrack(this.playlist[this.currentTrackIndex]);
    }

    // Set volume (0-1)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.volume;
        this.updateVolumeUI();
    }

    // Toggle shuffle
    toggleShuffle() {
        this.shuffle = !this.shuffle;
        document.querySelector('.shuffle-btn').classList.toggle('active', this.shuffle);
    }

    // Toggle repeat
    toggleRepeat() {
        this.repeat = !this.repeat;
        document.querySelector('.repeat-btn').classList.toggle('active', this.repeat);
    }

    // Seek to a specific time in the track
    seekTo(time) {
        this.audio.currentTime = time;
    }

    // Format time (seconds to MM:SS)
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Event handlers
    onTimeUpdate() {
        const progress = (this.audio.currentTime / this.audio.duration) * 100 || 0;
        const progressFill = document.querySelector('.progress-bar-fill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        // Update time display
        const currentTimeEl = document.querySelector('.current-time');
        const durationEl = document.querySelector('.duration');
        if (currentTimeEl) currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        if (durationEl) durationEl.textContent = this.formatTime(this.audio.duration || 0);
    }

    onTrackEnd() {
        if (this.repeat) {
            this.audio.currentTime = 0;
            this.play().catch(console.error);
        } else {
            this.next();
        }
    }

    onError(error) {
        console.error('Audio error:', error);
        this.showToast('Error playing track', 'error');
    }

    // UI Update methods
    updateNowPlayingUI() {
        if (!this.currentTrack) return;

        // Update track info in player controls
        const titleEl = document.querySelector('.now-playing-title');
        const durationEl = document.querySelector('.now-playing-duration');
        
        if (titleEl) titleEl.textContent = this.currentTrack.title;
        if (durationEl) {
            const duration = this.formatTime(this.currentTrack.duration || this.audio.duration || 0);
            durationEl.textContent = duration;
        }
    }

    updatePlayPauseButton() {
        const playPauseBtn = document.querySelector('.play-pause-btn');
        if (this.isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.setAttribute('aria-label', 'Play');
        }
    }

    updateVolumeUI() {
        const volumeSliderFill = document.querySelector('.volume-slider-fill');
        const volumeIcon = document.querySelector('.volume-btn i');
        
        if (volumeSliderFill) {
            volumeSliderFill.style.width = `${this.volume * 100}%`;
        }
        
        if (volumeIcon) {
            if (this.volume === 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (this.volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        }
    }

    highlightCurrentTrack() {
        // Remove active class from all songs
        document.querySelectorAll('.song-item').forEach(el => {
            el.classList.remove('active');
        });

        // Add active class to current track
        if (this.currentTrack) {
            const songElement = document.querySelector(`.song-item[data-id="${this.currentTrack.id}"]`);
            if (songElement) {
                songElement.classList.add('active');
                songElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <div class="toast-content">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto-remove after delay
        const timer = setTimeout(() => {
            toast.remove();
        }, 5000);
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(timer);
            toast.remove();
        });
    }
}

// Create and export a singleton instance
export const player = new Player();
