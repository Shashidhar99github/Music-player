const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetDatabase() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    };

    let connection;
    try {
        console.log('🔌 Connecting to MySQL server...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to MySQL server');

        // Drop and recreate the database
        console.log('🔄 Resetting database...');
        await connection.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
        await connection.query(`CREATE DATABASE \`${process.env.DB_NAME}\``);
        await connection.query(`USE \`${process.env.DB_NAME}\``);
        console.log('✅ Database reset successfully');

        // Create tables
        console.log('🔨 Creating tables...');
        await connection.query(`
            CREATE TABLE playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE tracks (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tables created successfully');

        // Test insert
        console.log('🧪 Testing with sample data...');
        const [playlistResult] = await connection.query(
            'INSERT INTO playlists (name) VALUES (?), (?), (?)',
            ['My Favorites', 'Workout Mix', 'Chill Vibes']
        );
        
        console.log(`✅ Created test playlists`);
        console.log('\n✨ Database reset and initialized successfully!');
        
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

resetDatabase().catch(console.error);
