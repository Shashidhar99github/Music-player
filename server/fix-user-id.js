const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUserId() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    };

    let connection;
    try {
        console.log('🔌 Connecting to MySQL database...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to MySQL database');

        // Check if user_id column exists
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM playlists WHERE Field = 'user_id';
        `);

        if (columns.length > 0) {
            console.log('🔍 Found user_id column in playlists table');
            const column = columns[0];
            
            // Make user_id nullable if it's not already
            if (column.Null === 'NO') {
                console.log('🔧 Making user_id nullable...');
                await connection.query(`
                    ALTER TABLE playlists MODIFY COLUMN user_id INT NULL;
                `);
                console.log('✅ Made user_id nullable');
            } else {
                console.log('✅ user_id is already nullable');
            }
        } else {
            console.log('ℹ️  No user_id column found - table structure is correct');
        }

        // Test inserting a playlist
        console.log('🧪 Testing playlist creation...');
        const [result] = await connection.query(
            'INSERT INTO playlists (name) VALUES (?)',
            ['Test Playlist']
        );
        console.log('✅ Successfully created test playlist with ID:', result.insertId);
        
        // Clean up
        await connection.query('DELETE FROM playlists WHERE id = ?', [result.insertId]);
        console.log('✅ Cleaned up test data');

        console.log('\n✨ Database fix completed successfully!');
    } catch (error) {
        console.error('❌ Error fixing database:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

fixUserId().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
});

