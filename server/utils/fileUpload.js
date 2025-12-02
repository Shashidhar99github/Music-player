const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure upload directory exists - use absolute path relative to server directory
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'audio/mpeg', 
        'audio/wav', 
        'audio/ogg', 
        'audio/mp3',
        'audio/x-m4a',
        'audio/aac',
        'audio/mp4',
        'audio/x-mpeg',
        'audio/mpeg3'
    ];
    
    // Also check file extension as a fallback
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.mp4'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only audio files are allowed. Got: ${file.mimetype || 'unknown'}`), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 50 * 1024 * 1024, // 50MB
        fieldSize: 10 * 1024 * 1024, // 10MB for non-file fields
        fields: 10, // Max number of non-file fields
        files: 1 // Max number of files
    },
    fileFilter: fileFilter
});

module.exports = upload;
