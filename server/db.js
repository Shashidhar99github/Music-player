const mysql = require('mysql2/promise');
require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('📝 Please create a .env file in the server/ directory with the following variables:');
    console.error('   DB_HOST=localhost');
    console.error('   DB_USER=root');
    console.error('   DB_PASSWORD=your_password');
    console.error('   DB_NAME=music_app');
    console.error('💡 You can copy .env.example to .env and update the values');
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'music_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Add connection error handling
    reconnect: true
});

// Test connection on startup
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connection established');
        connection.release();
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error.message);
        console.error('🔍 Error code:', error.code);
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure MySQL server is running');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Check your database credentials in .env file');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('💡 Database does not exist. Run: cd server && node setup-db.js');
        }
    });

module.exports = pool;
