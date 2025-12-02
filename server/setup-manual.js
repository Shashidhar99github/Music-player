const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    console.log('🚀 Starting database setup...');
    
    // Configuration without database name first
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    };
    
    let connection;
    
    try {
        // 1. Connect to MySQL server
        console.log('🔌 Connecting to MySQL server...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to MySQL server');
        
        // 2. Create database if it doesn't exist
        console.log(`📦 Creating database '${process.env.DB_NAME}' if it doesn't exist...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`✅ Database '${process.env.DB_NAME}' is ready`);
        
        // 3. Switch to the database
        await connection.query(`USE \`${process.env.DB_NAME}\``);
        
        // 4. Drop existing tables if they exist
        console.log('🗑️  Dropping existing tables if they exist...');
        await connection.query(`
            SET FOREIGN_KEY_CHECKS = 0;
            DROP TABLE IF EXISTS tracks;
            DROP TABLE IF EXISTS playlists;
            SET FOREIGN_KEY_CHECKS = 1;
        `);
        
        // 5. Create tables with proper structure
        console.log('🔨 Creating tables...');
        await connection.query(`
            CREATE TABLE playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            
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
            );
        `);
        
        console.log('✅ Tables created successfully');
        
        // 6. Verify the setup
        console.log('\n🔍 Verifying setup...');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`✅ Found ${tables.length} tables in the database`);
        
        // 7. Test insert
        console.log('\n🧪 Testing playlist creation...');
        const [result] = await connection.query(
            'INSERT INTO playlists (name) VALUES (?)',
            ['Test Playlist']
        );
        console.log('✅ Successfully created test playlist with ID:', result.insertId);
        
        // 8. Clean up
        await connection.query('DELETE FROM playlists WHERE id = ?', [result.insertId]);
        console.log('✅ Cleaned up test data');
        
        console.log('\n✨ Database setup completed successfully! 🎉');
        
    } catch (error) {
        console.error('\n❌ Error during database setup:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL:', error.sql);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the setup
setupDatabase().catch(console.error);
