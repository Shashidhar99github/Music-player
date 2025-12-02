// Main Application
import { player } from './player.js';
import { playlistsApi, tracksApi } from './api.js';

// DOM Elements
const app = document.getElementById('app');
const loadingElement = document.querySelector('.loading');
let currentPlaylistId = null;

// Initialize the application
async function init() {
    try {
        // Render the app UI
        renderApp();
        
        // Initialize event listeners
        initEventListeners();
        
        // Load playlists
        await loadPlaylists();
        
        // Hide loading state
        loadingElement.classList.add('hidden');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize the application');
    }
}

// Render the main application UI
function renderApp() {
    app.innerHTML = `
        <!-- Header -->
        <header class="app-header">
            <div class="header-left">
                <div class="logo-icon">B</div>
                <div class="header-title-group">
                    <h1>Chemistry Beats</h1>
                    <p>Drop your chemistry songs · Neon visualizer · Persistent storage</p>
                </div>
            </div>
            <div class="header-right">
                <button class="header-dropdown" id="playlist-dropdown">
                    <span id="current-playlist-name">Chemistry Songs</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="header-icon-btn" id="add-playlist-btn" title="Add Playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="header-action-btn" id="upload-btn">
                    <i class="fas fa-plus"></i>
                    <span>Add Songs</span>
                </button>
                <button class="header-action-btn secondary" id="edit-playlist-btn" disabled>
                    <i class="fas fa-pencil-alt"></i>
                    <span>Edit</span>
                </button>
                <button class="header-icon-btn" id="dark-mode-btn" title="Dark Mode">
                    <i class="fas fa-moon"></i>
                </button>
                <button class="header-icon-btn" id="logout-btn" title="Logout">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        </header>
        
        <!-- Main Content Area -->
        <div class="main-content-area">
            <!-- Visualizer Panel -->
            <div class="visualizer-panel">
                <canvas class="visualizer-canvas" id="visualizer-canvas"></canvas>
            </div>
            
            <!-- Song List Panel -->
            <div class="song-list-panel">
                <div class="storage-status">
                    <div class="status-dot"></div>
                    <span>Persistent storage active · Files saved in cloud</span>
                </div>
                <div class="song-list-container">
                    <div class="song-list" id="song-list">
                        <div class="empty-song-list">Add some tracks</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Player Controls -->
        <div class="player-controls">
            <div class="progress-section">
                <span class="time-display current-time">0:00</span>
                <div class="progress-bar-wrapper" id="progress-bar">
                    <div class="progress-bar-fill"></div>
                    <div class="progress-bar-handle"></div>
                </div>
                <span class="time-display duration">0:00</span>
            </div>
            <div class="controls-section">
                <div class="controls-left">
                    <div class="now-playing-info">
                        <div class="now-playing-title">Nuvvena</div>
                        <div class="now-playing-duration">4:53</div>
                    </div>
                </div>
                <div class="controls-center">
                    <button class="control-btn shuffle-btn" aria-label="Shuffle">
                        <i class="fas fa-random"></i>
                    </button>
                    <button class="control-btn" id="prev-btn" aria-label="Previous">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button class="control-btn primary play-pause-btn" aria-label="Play">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="control-btn" id="next-btn" aria-label="Next">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button class="control-btn repeat-btn" aria-label="Repeat">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
                <div class="controls-right">
                    <div class="volume-control">
                        <button class="control-btn volume-btn" aria-label="Volume">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <div class="volume-slider-wrapper" id="volume-slider">
                            <div class="volume-slider-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- File Input (hidden) -->
        <input type="file" id="file-input" accept="audio/*" multiple style="display: none;">
        
        <!-- Playlist Dropdown (hidden by default) -->
        <div class="playlist-dropdown-menu" id="playlist-dropdown-menu" style="display: none;">
            <div class="playlist-list" id="playlist-list">
                <!-- Playlists will be rendered here -->
            </div>
        </div>
        
        <!-- Create Playlist Modal -->
        <div class="modal" id="create-playlist-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Create New Playlist</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="playlist-name" class="form-label">Playlist Name</label>
                        <input type="text" id="playlist-name" class="form-input" placeholder="My Awesome Playlist">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-create-playlist">Cancel</button>
                    <button class="btn btn-primary" id="save-playlist">Create</button>
                </div>
            </div>
        </div>
        
        <!-- Edit Playlist Modal -->
        <div class="modal" id="edit-playlist-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Playlist</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-playlist-name" class="form-label">Playlist Name</label>
                        <input type="text" id="edit-playlist-name" class="form-input">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-edit-playlist">Cancel</button>
                    <button class="btn btn-primary" id="save-edit-playlist">Save Changes</button>
                </div>
            </div>
        </div>
        
        <!-- Upload Progress Modal -->
        <div class="modal" id="upload-progress-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Uploading Tracks</h3>
                </div>
                <div class="modal-body">
                    <div class="upload-progress">
                        <div class="progress-bar-wrapper">
                            <div class="progress-bar-fill" style="width: 0%"></div>
                        </div>
                    </div>
                    <p class="upload-status">Preparing to upload...</p>
                    <ul class="upload-queue" id="upload-queue">
                        <!-- Upload items will be added here -->
                    </ul>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="close-upload-modal" disabled>Done</button>
                </div>
            </div>
        </div>
    `;
    
    // Initialize visualizer after rendering
    initVisualizer();
}

// Initialize event listeners
function initEventListeners() {
    // Playlist actions
    document.getElementById('add-playlist-btn')?.addEventListener('click', showCreatePlaylistModal);
    document.getElementById('playlist-dropdown')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('playlist-dropdown-menu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    });
    document.getElementById('save-playlist')?.addEventListener('click', createPlaylist);
    document.getElementById('cancel-create-playlist')?.addEventListener('click', () => {
        document.getElementById('create-playlist-modal').classList.remove('active');
    });
    
    // Edit playlist
    document.getElementById('edit-playlist-btn')?.addEventListener('click', showEditPlaylistModal);
    document.getElementById('save-edit-playlist')?.addEventListener('click', updatePlaylist);
    document.getElementById('cancel-edit-playlist')?.addEventListener('click', () => {
        document.getElementById('edit-playlist-modal').classList.remove('active');
    });
    
    // Upload
    document.getElementById('upload-btn')?.addEventListener('click', () => {
        if (!currentPlaylistId) {
            showError('Please select a playlist first');
            return;
        }
        document.getElementById('file-input').click();
    });
    
    document.getElementById('file-input')?.addEventListener('change', handleFileUpload);
    
    // Player controls
    document.querySelector('.play-pause-btn')?.addEventListener('click', () => player.togglePlay());
    document.getElementById('prev-btn')?.addEventListener('click', () => player.prev());
    document.getElementById('next-btn')?.addEventListener('click', () => player.next());
    document.querySelector('.shuffle-btn')?.addEventListener('click', () => player.toggleShuffle());
    document.querySelector('.repeat-btn')?.addEventListener('click', () => player.toggleRepeat());
    
    // Volume control
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('click', (e) => {
            const rect = volumeSlider.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            player.setVolume(Math.max(0, Math.min(1, pos)));
        });
    }
    
    // Progress bar seeking
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (player.audio.duration) {
                player.seekTo(pos * player.audio.duration);
            }
        });
    }
    
    // Close modals when clicking outside or on close button
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Explicit close button handlers
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeBtn.closest('.modal')?.classList.remove('active');
        });
    });
    
    // Close modals with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('playlist-dropdown-menu');
        const dropdownBtn = document.getElementById('playlist-dropdown');
        if (dropdown && dropdownBtn && !dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Load playlists from the server
async function loadPlaylists() {
    try {
        const playlists = await playlistsApi.getAll();
        renderPlaylists(playlists);
    } catch (error) {
        console.error('Failed to load playlists:', error);
        showError('Failed to load playlists');
    }
}

// Render playlists in the dropdown
function renderPlaylists(playlists) {
    const playlistList = document.getElementById('playlist-list');
    if (!playlistList) return;
    
    if (playlists.length === 0) {
        playlistList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <p>No playlists yet</p>
                <button id="create-first-playlist" class="btn btn-primary" style="margin-top: 12px;">Create your first playlist</button>
            </div>
        `;
        
        // Re-attach event listener
        document.getElementById('create-first-playlist')?.addEventListener('click', () => {
            document.getElementById('playlist-dropdown-menu').style.display = 'none';
            showCreatePlaylistModal();
        });
        return;
    }
    
    playlistList.innerHTML = playlists.map(playlist => `
        <div class="playlist-dropdown-item ${currentPlaylistId === playlist.id ? 'active' : ''}" 
             data-id="${playlist.id}"
             style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.2s;">
            <span>${escapeHtml(playlist.name)}</span>
        </div>
    `).join('');
    
    // Add click event listeners to playlist items
    document.querySelectorAll('.playlist-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            loadPlaylist(item.dataset.id);
            document.getElementById('playlist-dropdown-menu').style.display = 'none';
        });
        item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--surface)';
        });
        item.addEventListener('mouseleave', () => {
            if (!item.classList.contains('active')) {
                item.style.background = 'transparent';
            }
        });
    });
}

// Show create playlist modal
function showCreatePlaylistModal() {
    const modal = document.getElementById('create-playlist-modal');
    const input = document.getElementById('playlist-name');
    
    if (modal && input) {
        input.value = '';
        modal.classList.add('active');
        input.focus();
    }
}

// Create a new playlist
async function createPlaylist() {
    const nameInput = document.getElementById('playlist-name');
    const name = nameInput?.value.trim();
    
    if (!name) {
        showError('Please enter a playlist name');
        nameInput?.focus();
        return;
    }
    
    try {
        const newPlaylist = await playlistsApi.create(name);
        await loadPlaylists();
        
        // Close the modal
        document.getElementById('create-playlist-modal')?.classList.remove('active');
        
        // Load the new playlist
        loadPlaylist(newPlaylist.id);
        
        // Show success message
        player.showToast(`Playlist "${escapeHtml(name)}" created`, 'success');
    } catch (error) {
        console.error('Failed to create playlist:', error);
        showError('Failed to create playlist');
    }
}

// Show edit playlist modal
function showEditPlaylistModal() {
    if (!currentPlaylistId) return;
    
    const modal = document.getElementById('edit-playlist-modal');
    const input = document.getElementById('edit-playlist-name');
    const currentPlaylistName = document.getElementById('current-playlist-name')?.textContent;
    
    if (modal && input && currentPlaylistName) {
        input.value = currentPlaylistName;
        modal.classList.add('active');
        input.focus();
    }
}

// Update playlist
async function updatePlaylist() {
    const nameInput = document.getElementById('edit-playlist-name');
    const name = nameInput?.value.trim();
    
    if (!name || !currentPlaylistId) {
        showError('Please enter a playlist name');
        nameInput?.focus();
        return;
    }
    
    try {
        await playlistsApi.update(currentPlaylistId, name);
        await loadPlaylists();
        
        // Close the modal
        document.getElementById('edit-playlist-modal')?.classList.remove('active');
        
        // Update the current playlist title in header
        if (currentPlaylistId) {
            document.getElementById('current-playlist-name').textContent = name;
        }
        
        // Show success message
        player.showToast('Playlist updated', 'success');
    } catch (error) {
        console.error('Failed to update playlist:', error);
        showError('Failed to update playlist');
    }
}

// Confirm delete playlist
function confirmDeletePlaylist() {
    if (!currentPlaylistId) return;
    
    const playlistItem = document.querySelector(`.playlist-item[data-id="${currentPlaylistId}"]`);
    const playlistName = playlistItem?.querySelector('span')?.textContent || 'this playlist';
    
    if (confirm(`Are you sure you want to delete "${playlistName}"? This cannot be undone.`)) {
        deletePlaylist();
    }
}

// Delete playlist
async function deletePlaylist() {
    if (!currentPlaylistId) return;
    
    try {
        await playlistsApi.delete(currentPlaylistId);
        await loadPlaylists();
        
        // Reset the view
        currentPlaylistId = null;
        document.getElementById('current-playlist-name').textContent = 'Chemistry Songs';
        document.getElementById('song-list').innerHTML = `<div class="empty-song-list">Add some tracks</div>`;
        
        // Disable edit button
        document.getElementById('edit-playlist-btn')?.setAttribute('disabled', 'true');
        
        // Show success message
        player.showToast('Playlist deleted', 'success');
    } catch (error) {
        console.error('Failed to delete playlist:', error);
        showError('Failed to delete playlist');
    }
}

// Load a playlist and its tracks
async function loadPlaylist(playlistId) {
    if (!playlistId) return;
    
    try {
        currentPlaylistId = playlistId;
        
        // Update UI
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === playlistId);
        });
        
        // Enable edit/delete buttons
        document.getElementById('edit-playlist-btn')?.removeAttribute('disabled');
        document.getElementById('delete-playlist-btn')?.removeAttribute('disabled');
        
        // Load tracks
        const tracks = await tracksApi.getByPlaylist(playlistId);
        renderTracks(tracks);
        
        // Update the player's playlist
        player.playlist = tracks;
        
        // Update the current playlist title in header
        const playlistItem = document.querySelector(`.playlist-dropdown-item[data-id="${playlistId}"]`);
        if (playlistItem) {
            const playlistName = playlistItem.querySelector('span').textContent;
            document.getElementById('current-playlist-name').textContent = playlistName;
        }
        
        // Update playlist dropdown items
        document.querySelectorAll('.playlist-dropdown-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === playlistId);
            if (item.classList.contains('active')) {
                item.style.background = 'var(--surface)';
            } else {
                item.style.background = 'transparent';
            }
        });
    } catch (error) {
        console.error('Failed to load playlist:', error);
        showError('Failed to load playlist');
    }
}

// Render tracks in the song list
function renderTracks(tracks) {
    const songList = document.getElementById('song-list');
    if (!songList) return;
    
    if (!tracks || tracks.length === 0) {
        songList.innerHTML = `<div class="empty-song-list">Add some tracks</div>`;
        return;
    }
    
    songList.innerHTML = tracks.map((track, index) => {
        const initials = track.title.substring(0, 2).toUpperCase();
        const duration = formatDuration(track.duration || 0);
        
        return `
            <div class="song-item ${player.currentTrack?.id === track.id ? 'active' : ''}" 
                 data-id="${track.id}" 
                 data-index="${index}">
                <div class="song-icon">${initials}</div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(track.title)}</div>
                    <div class="song-meta">
                        <span>${duration}</span>
                        <span>·</span>
                        <span>#${index + 1}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click event listeners to songs
    document.querySelectorAll('.song-item').forEach(songEl => {
        songEl.addEventListener('click', () => {
            const trackId = songEl.dataset.id;
            const trackIndex = parseInt(songEl.dataset.index);
            const track = player.playlist[trackIndex];
            
            if (track) {
                player.currentTrackIndex = trackIndex;
                player.loadTrack(track);
            }
        });
    });
}

// Handle file upload
async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (!currentPlaylistId) {
        showError('Please select a playlist first');
        return;
    }
    
    const modal = document.getElementById('upload-progress-modal');
    const overallProgressBar = modal?.querySelector('.upload-progress .progress-bar-fill');
    const statusText = modal?.querySelector('.upload-status');
    const uploadQueue = document.getElementById('upload-queue');
    
    if (!modal || !overallProgressBar || !statusText || !uploadQueue) {
        showError('Error initializing upload');
        return;
    }
    
    // Show the upload modal
    modal.classList.add('active');
    uploadQueue.innerHTML = '';
    
    // Create upload queue items
    const uploadItems = files.map(file => {
        const item = document.createElement('li');
        item.className = 'upload-item';
        item.innerHTML = `
            <div class="upload-item-name">${escapeHtml(file.name)}</div>
            <div class="upload-item-status">
                <div class="upload-progress-bar">
                    <div class="upload-progress-fill" style="width: 0%"></div>
                </div>
                <span class="upload-percentage">0%</span>
            </div>
        `;
        uploadQueue.appendChild(item);
        
        return {
            file,
            element: item,
            progress: 0
        };
    });
    
    // Upload files one by one
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const progressFill = item.element.querySelector('.upload-progress-fill');
        const percentageText = item.element.querySelector('.upload-percentage');
        
        try {
            statusText.textContent = `Uploading ${i + 1} of ${uploadItems.length}: ${item.file.name}`;
            
            // Update overall progress
            updateOverallProgress();
            
            // Upload the file
            await tracksApi.upload(currentPlaylistId, item.file, {
                title: item.file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
                // You could add more metadata extraction here if needed
            }, (progressEvent) => {
                // Update individual file progress
                if (progressEvent.lengthComputable) {
                    const percentComplete = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    item.progress = percentComplete;
                    if (progressFill) progressFill.style.width = `${percentComplete}%`;
                    if (percentageText) percentageText.textContent = `${percentComplete}%`;
                    
                    // Update overall progress
                    updateOverallProgress();
                }
            });
            
            // Mark as complete
            item.element.classList.add('success');
            if (progressFill) progressFill.style.width = '100%';
            if (percentageText) percentageText.textContent = '100%';
            successCount++;
            
        } catch (error) {
            console.error(`Error uploading ${item.file.name}:`, error);
            item.element.classList.add('error');
            
            // Show detailed error message
            const errorMsg = error.message || 'Upload failed';
            if (percentageText) percentageText.textContent = 'Error';
            
            // Add error message below the file name
            const errorDiv = document.createElement('div');
            errorDiv.className = 'upload-error-message';
            errorDiv.textContent = errorMsg;
            item.element.appendChild(errorDiv);
            
            errorCount++;
        }
    }
    
    // Update status
    statusText.textContent = `Upload complete: ${successCount} succeeded, ${errorCount} failed`;
    document.getElementById('close-upload-modal')?.removeAttribute('disabled');
    
    // Reload the track list
    if (successCount > 0) {
        loadPlaylist(currentPlaylistId);
    }
    
    // Close the modal when the close button is clicked
    document.getElementById('close-upload-modal')?.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    function updateOverallProgress() {
        const totalProgress = uploadItems.reduce((sum, item) => sum + item.progress, 0) / uploadItems.length;
        if (overallProgressBar) {
            overallProgressBar.style.width = `${totalProgress}%`;
        }
    }
}

// Helper function to format duration (seconds to MM:SS)
function formatDuration(seconds) {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Show error message
function showError(message) {
    player.showToast(message, 'error');
}

// Initialize visualizer
function initVisualizer() {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const panel = canvas.parentElement;
    
    function resizeCanvas() {
        canvas.width = panel.clientWidth;
        canvas.height = panel.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create animated neon circles
    const circles = [];
    const numCircles = 8;
    
    for (let i = 0; i < numCircles; i++) {
        circles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 40 + Math.random() * 60,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            hue: 240 + Math.random() * 60, // Blue to purple range
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        circles.forEach(circle => {
            circle.x += circle.speedX;
            circle.y += circle.speedY;
            
            // Bounce off edges
            if (circle.x < 0 || circle.x > canvas.width) circle.speedX *= -1;
            if (circle.y < 0 || circle.y > canvas.height) circle.speedY *= -1;
            
            // Keep in bounds
            circle.x = Math.max(circle.radius, Math.min(canvas.width - circle.radius, circle.x));
            circle.y = Math.max(circle.radius, Math.min(canvas.height - circle.radius, circle.y));
            
            // Draw with glow effect
            const gradient = ctx.createRadialGradient(
                circle.x, circle.y, 0,
                circle.x, circle.y, circle.radius
            );
            gradient.addColorStop(0, `hsla(${circle.hue}, 70%, 70%, 0.8)`);
            gradient.addColorStop(0.5, `hsla(${circle.hue}, 70%, 60%, 0.4)`);
            gradient.addColorStop(1, `hsla(${circle.hue}, 70%, 50%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Initialize the app when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
