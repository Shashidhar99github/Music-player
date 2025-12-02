const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const upload = require('../utils/fileUpload');

// Get all tracks for a playlist
router.get('/playlist/:playlistId', async (req, res) => {
    try {
        const { playlistId } = req.params;
        
        // First verify the playlist exists
        const [playlist] = await db.query(
            'SELECT id FROM playlists WHERE id = ?',
            [playlistId]
        );
        
        if (playlist.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        const [tracks] = await db.query(
            'SELECT * FROM tracks WHERE playlist_id = ? ORDER BY created_at DESC',
            [playlistId]
        );
        
        res.json(tracks);
    } catch (error) {
        console.error('Error fetching tracks:', error);
        res.status(500).json({ 
            error: 'Failed to fetch tracks',
            details: error.message
        });
    }
});

// Upload a new track - handle multer errors with better error handling
const uploadMiddleware = upload.single('audio');

router.post('/', (req, res, next) => {
    // Set timeout to prevent hanging requests
    req.setTimeout(5 * 60 * 1000); // 5 minutes
    
    // Add error handlers to catch busboy errors early
    let uploadComplete = false;
    let formError = null;
    
    req.on('error', (err) => {
        if (err.message && err.message.includes('Unexpected end of form')) {
            formError = err;
            // Don't log this - it's often harmless if file was uploaded
            if (req.file) {
                uploadComplete = true;
            }
        }
    });
    
    uploadMiddleware(req, res, (err) => {
        // If we got a form error but file was uploaded, ignore it
        if (formError && req.file) {
            console.log('File uploaded successfully despite form warning');
            formError = null; // Clear the error
        }
        
        if (err) {
            // Handle "Unexpected end of form" errors - these are often harmless
            if (err.message && (err.message.includes('Unexpected end of form') || err.message.includes('Premature close'))) {
                // Check if file was actually uploaded despite the error
                if (req.file) {
                    console.log('File was uploaded successfully despite form warning, continuing...');
                    return next(); // File was uploaded, continue processing
                }
                // No file uploaded, return appropriate error
                return res.status(400).json({ 
                    error: 'Upload failed: The upload was interrupted. Please try again.',
                    details: 'Please ensure your connection is stable and try uploading again.'
                });
            }
            
            console.error('Multer error:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ 
                        error: 'File too large. Maximum size is 50MB.' 
                    });
                }
                return res.status(400).json({ 
                    error: `Upload error: ${err.message}`,
                    code: err.code
                });
            }
            // File filter error
            if (err.message && err.message.includes('Invalid file type')) {
                return res.status(400).json({ 
                    error: err.message 
                });
            }
            return next(err);
        }
        next();
    });
}, async (req, res) => {
    let file;
    
    try {
        const { playlistId, title, artist, album } = req.body;
        file = req.file;
        
        if (!playlistId || !title || !file) {
            // Clean up the uploaded file if validation fails
            if (file) {
                await fs.unlink(file.path).catch(console.error);
            }
            return res.status(400).json({ 
                error: 'Playlist ID, title, and file are required',
                received: { playlistId: !!playlistId, title: !!title, file: !!file }
            });
        }
        
        // Verify playlist exists
        const [playlist] = await db.query(
            'SELECT id FROM playlists WHERE id = ?',
            [playlistId]
        );
        
        if (playlist.length === 0) {
            await fs.unlink(file.path).catch(console.error);
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        // Get file info - use just the filename for relative path
        const fileName = path.basename(file.path);
        const filePath = fileName;
        
        console.log('Upload details:', {
            originalName: file.originalname,
            fileName: fileName,
            filePath: filePath,
            fullPath: file.path,
            size: file.size,
            mimetype: file.mimetype,
            playlistId,
            title
        });
        
        // Insert track into database
        const [result] = await db.execute(
            'INSERT INTO tracks (playlist_id, title, artist, album, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                playlistId,
                title.trim(),
                artist ? artist.trim() : null,
                album ? album.trim() : null,
                filePath,
                file.size,
                file.mimetype
            ]
        );
        
        const [rows] = await db.query(
            'SELECT * FROM tracks WHERE id = ?',
            [result.insertId]
        );
        
        if (!rows || rows.length === 0) {
            throw new Error('Failed to retrieve the created track');
        }
        
        const newTrack = rows[0];
        res.status(201).json(newTrack);
        
    } catch (error) {
        console.error('Error uploading track:', error);
        console.error('Error stack:', error.stack);
        
        // Clean up the uploaded file if there was an error
        if (file) {
            await fs.unlink(file.path).catch(console.error);
        }
        
        // Check if it's a database error
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ 
                error: 'Database table not found. Please run database setup.',
                details: error.message
            });
        }
        
        // Return detailed error message
        const errorMessage = error.message || 'Failed to upload track';
        console.error('Upload error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            errno: error.errno
        });
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.sqlMessage || error.message,
            code: error.code || error.errno
        });
    }
});

// Delete a track
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // First get the track to delete its file
        const [tracks] = await db.query(
            'SELECT file_path FROM tracks WHERE id = ?',
            [id]
        );
        
        if (tracks.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }
        
        // Delete the track from the database
        const [result] = await db.execute(
            'DELETE FROM tracks WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }
        
        // Delete the track file
        const filePath = path.join(__dirname, '../uploads', tracks[0].file_path);
        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
        } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err);
        }
        
        res.status(204).end();
        
    } catch (error) {
        console.error('Error deleting track:', error);
        res.status(500).json({ 
            error: 'Failed to delete track',
            details: error.message,
            code: error.code
        });
    }
});

module.exports = router;
