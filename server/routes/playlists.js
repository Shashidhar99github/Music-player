const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs').promises;

// Create a new playlist
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        const [result] = await db.execute(
            'INSERT INTO playlists (name) VALUES (?)',
            [name.trim()]
        );

        const [newPlaylist] = await db.query(
            'SELECT * FROM playlists WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newPlaylist[0]);
    } catch (error) {
        console.error('Error creating playlist:', error);
        
        // Handle user_id field error
        if (error.code === 'ER_NO_DEFAULT_FOR_FIELD' && error.message.includes('user_id')) {
            return res.status(500).json({ 
                error: 'Database schema issue: user_id field exists. Please run: node fix-user-id.js',
                details: error.message,
                code: error.code
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to create playlist',
            details: error.message,
            code: error.code
        });
    }
});

// Get all playlists
router.get('/', async (req, res) => {
    try {
        const [playlists] = await db.query('SELECT * FROM playlists ORDER BY created_at DESC');
        res.json(playlists);
    } catch (error) {
        console.error('Error fetching playlists:', error);
        console.error('Error code:', error.code);
        console.error('Error sqlState:', error.sqlState);
        
        // Provide specific error messages based on error type
        let errorMessage = 'Failed to fetch playlists';
        let statusCode = 500;
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to database. Please check if MySQL server is running.';
            statusCode = 503;
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            errorMessage = 'Database access denied. Please check your database credentials in .env file.';
            statusCode = 503;
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            errorMessage = 'Database does not exist. Please run: cd server && node setup-db.js';
            statusCode = 503;
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            errorMessage = 'Database tables not found. Please run: cd server && node setup-db.js';
            statusCode = 503;
        } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Cannot reach database server. Please check DB_HOST in .env file.';
            statusCode = 503;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.message,
            code: error.code,
            hint: 'Check server console for more details. Make sure .env file exists in server/ directory with correct database credentials.'
        });
    }
});

// Update a playlist
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        const [result] = await db.execute(
            'UPDATE playlists SET name = ? WHERE id = ?',
            [name.trim(), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const [updatedPlaylist] = await db.query(
            'SELECT * FROM playlists WHERE id = ?',
            [id]
        );
        
        res.json(updatedPlaylist[0]);
    } catch (error) {
        console.error('Error updating playlist:', error);
        res.status(500).json({ 
            error: 'Failed to update playlist',
            details: error.message
        });
    }
});

// Delete a playlist and its tracks
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // First, get all tracks in the playlist to delete their files
        const [tracks] = await db.query(
            'SELECT file_path FROM tracks WHERE playlist_id = ?',
            [id]
        );
        
        // Delete the playlist (this will cascade delete tracks due to foreign key)
        const [result] = await db.execute(
            'DELETE FROM playlists WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        // Delete the track files
        const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
        for (const track of tracks) {
            if (!track.file_path) continue;
            const filePath = path.join(uploadDir, track.file_path);
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
                console.log(`Deleted file: ${filePath}`);
            } catch (err) {
                console.error(`Error deleting file ${filePath}:`, err);
            }
        }
        
        res.status(204).end();
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ 
            error: 'Failed to delete playlist',
            details: error.message
        });
    }
});

module.exports = router;
