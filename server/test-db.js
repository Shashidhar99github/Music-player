const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('Testing database connection...');
    
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    try {
        // Test connection
        const connection = await mysql.createConnection(config);
        console.log('✅ Successfully connected to MySQL database!');
        
        // Check if tables exist
        const [tables] = await connection.execute(
            `SHOW TABLES LIKE 'playlists'`
        );
        
        if (tables.length === 0) {
            console.log('❌ The "playlists" table does not exist. Running setup...');
            await setupDatabase(connection);
        } else {
            console.log('✅ "playlists" table exists');
        }
        
        // Test insert
        try {
            const [result] = await connection.execute(
                'INSERT INTO playlists (name) VALUES (?)',
                ['Test Playlist']
            );
            console.log('✅ Successfully inserted test playlist');
            
            // Clean up
            await connection.execute('DELETE FROM playlists WHERE name = ?', ['Test Playlist']);
        } catch (err) {
            console.error('❌ Error inserting test playlist:', err.message);
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('The playlists table might not exist. Running setup...');
                await setupDatabase(connection);
            }
        }
        
        await connection.end();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('The database does not exist. Creating it now...');
            await createDatabase();
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('Access denied. Please check your database credentials in the .env file.');
            console.log('Current configuration:', {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                database: process.env.DB_NAME
            });
        }
    }
}

async function createDatabase() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    };
    
    try {
        const connection = await mysql.createConnection(config);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`✅ Database "${process.env.DB_NAME}" created or already exists`);
        await connection.end();
        
        // Now run the setup
        await setupDatabase();
    } catch (error) {
        console.error('❌ Failed to create database:', error.message);
    }
}

async function setupDatabase(connection) {
    let conn = connection;
    let shouldCloseConnection = false;
    
    if (!connection) {
        const config = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        };
        conn = await mysql.createConnection(config);
        shouldCloseConnection = true;
    }
    
    try {
        console.log('Setting up database tables...');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS tracks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                playlist_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                artist VARCHAR(100),
                album VARCHAR(100),
                duration INT DEFAULT 0,
                file_path VARCHAR(500) NOT NULL,
                file_size INT,
                file_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            );
        `);
        
        console.log('✅ Database tables created successfully');
        
        // Test insert
        const [result] = await conn.execute(
            'INSERT INTO playlists (name) VALUES (?)',
            ['Test Playlist']
        );
        console.log('✅ Test playlist created successfully');
        
        // Clean up
        await conn.execute('DELETE FROM playlists WHERE name = ?', ['Test Playlist']);
        
    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
    } finally {
        if (shouldCloseConnection && conn) {
            await conn.end();
        }
    }
}

// Run the test
testConnection().catch(console.error);
