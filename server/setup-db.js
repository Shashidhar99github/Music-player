const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    // Create a connection to MySQL server without specifying the database
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    try {
        console.log('Setting up database...');

        // Create the database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`Database '${process.env.DB_NAME}' is ready`);

        // Switch to the database
        await connection.query(`USE \`${process.env.DB_NAME}\``);

        // Create tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log('Created playlists table');

        await connection.query(`
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
        console.log('Created tracks table');

        console.log('\n✅ Database setup completed successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

setupDatabase();
