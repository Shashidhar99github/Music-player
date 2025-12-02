require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fileUpload = require('./utils/fileUpload');
const playlistsRouter = require('./routes/playlists');
const tracksRouter = require('./routes/tracks');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
const clientPath = path.join(__dirname, '..');
app.use(express.static(clientPath));

// API Routes
app.use('/api/playlists', playlistsRouter);
app.use('/api/tracks', tracksRouter);

// Serve uploaded files - ensure directory exists
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Ignore "Unexpected end of form" errors - these are often harmless multer warnings
    if (err.message && err.message.includes('Unexpected end of form')) {
        console.warn('Multer form warning (can be ignored):', err.message);
        return next(); // Continue to next middleware
    }
    
    console.error('Error:', err);
    console.error('Error stack:', err.stack);
    
    // Handle multer errors (file upload)
    if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
        }
        return res.status(400).json({ 
            error: `Upload error: ${err.message}`,
            code: err.code 
        });
    }
    
    // Handle file type errors
    if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Only audio files'))) {
        return res.status(400).json({ error: err.message });
    }
    
    // Return detailed error in development, generic in production
    res.status(err.status || 500).json({
        error: err.message || 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Upload directory: ${uploadDir}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DB_NAME || 'music_app'} @ ${process.env.DB_HOST || 'localhost'}`);
});

// Handle unhandled promise rejections
const originalConsoleError = console.error;
process.on('unhandledRejection', (err) => {
    // Suppress "Unexpected end of form" errors - they're often harmless
    if (err && err.message && (
        err.message.includes('Unexpected end of form') ||
        err.message.includes('Premature close') ||
        (err.stack && err.stack.includes('multipart.js'))
    )) {
        // Silently ignore - these are busboy warnings when connection closes early
        return;
    }
    originalConsoleError('Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    // Suppress "Unexpected end of form" errors - they're often harmless
    if (err && err.message && (
        err.message.includes('Unexpected end of form') ||
        err.message.includes('Premature close') ||
        (err.stack && err.stack.includes('multipart.js'))
    )) {
        // Silently ignore - these are busboy warnings when connection closes early
        return;
    }
    originalConsoleError('Uncaught Exception:', err);
    process.exit(1);
});
