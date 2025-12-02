// API Service - Handles all API calls to the backend
// Use relative URL for deployment compatibility
const API_BASE_URL = '/api';

// Helper function to handle API responses
async function handleResponse(response) {
    if (!response.ok) {
        let errorMessage = 'Something went wrong';
        let errorHint = '';
        
        try {
            const error = await response.json();
            errorMessage = error.error || error.message || error.details || errorMessage;
            errorHint = error.hint || '';
            
            // Add status code info for debugging
            if (response.status === 404) {
                errorMessage = 'Resource not found. Please check your connection.';
            } else if (response.status === 503) {
                // Service unavailable - likely database connection issue
                errorMessage = errorMessage || 'Database connection failed. Please check server configuration.';
                if (errorHint) {
                    errorMessage += ' ' + errorHint;
                }
            } else if (response.status === 500) {
                errorMessage = errorMessage || 'Server error. Please try again later.';
                if (error.code) {
                    console.error('Server error code:', error.code);
                }
            } else if (response.status === 0 || response.status === 'NetworkError') {
                errorMessage = 'Network error. Please check if the server is running and accessible.';
            }
        } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || `HTTP ${response.status} error`;
        }
        
        const fullError = new Error(errorMessage);
        if (errorHint) {
            fullError.hint = errorHint;
        }
        throw fullError;
    }
    return response.json();
}

// Playlist API
const playlistsApi = {
    // Get all playlists
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/playlists`);
        return handleResponse(response);
    },

    // Create a new playlist
    create: async (name) => {
        const response = await fetch(`${API_BASE_URL}/playlists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });
        return handleResponse(response);
    },

    // Update a playlist
    update: async (id, name) => {
        const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });
        return handleResponse(response);
    },

    // Delete a playlist
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};

// Tracks API
const tracksApi = {
    // Get all tracks for a playlist
    getByPlaylist: async (playlistId) => {
        const response = await fetch(`${API_BASE_URL}/tracks/playlist/${playlistId}`);
        return handleResponse(response);
    },

    // Upload a new track
    upload: async (playlistId, file, metadata = {}, onProgress) => {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('playlistId', playlistId);
        
        // Add metadata if provided
        if (metadata.title) formData.append('title', metadata.title);
        if (metadata.artist) formData.append('artist', metadata.artist);
        if (metadata.album) formData.append('album', metadata.album);

        // Use XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (onProgress && e.lengthComputable) {
                    onProgress(e);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject(new Error('Invalid response from server'));
                    }
                } else {
                    let errorMsg = `Upload failed with status ${xhr.status}`;
                    try {
                        const error = JSON.parse(xhr.responseText);
                        errorMsg = error.error || error.message || error.details || errorMsg;
                        console.error('Upload error response:', error);
                    } catch (e) {
                        console.error('Failed to parse error response:', xhr.responseText);
                        errorMsg = xhr.responseText || errorMsg;
                    }
                    reject(new Error(errorMsg));
                }
            });
            
            xhr.addEventListener('error', () => {
                let errorMsg = 'Network error during upload. Please check:';
                errorMsg += '\n1. Your internet connection';
                errorMsg += '\n2. The server is running and accessible';
                errorMsg += '\n3. CORS settings allow uploads';
                reject(new Error(errorMsg));
            });
            
            xhr.addEventListener('abort', () => {
                reject(new Error('Upload was cancelled'));
            });
            
            // Handle timeout
            xhr.timeout = 10 * 60 * 1000; // 10 minutes timeout
            xhr.addEventListener('timeout', () => {
                reject(new Error('Upload timeout. The file may be too large or connection is slow.'));
            });
            
            xhr.open('POST', `${API_BASE_URL}/tracks`);
            
            // Ensure the request completes properly
            try {
                xhr.send(formData);
            } catch (sendError) {
                reject(new Error(`Failed to send upload request: ${sendError.message}`));
            }
        });
    },

    // Delete a track
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/tracks/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};

// Export the API methods
export { playlistsApi, tracksApi };
