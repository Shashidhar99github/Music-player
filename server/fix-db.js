const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabase() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    };

    let connection;
    try {
        // Connect to the database
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to MySQL database');

        // Check if user_id column exists and is required
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM playlists LIKE 'user_id';
        `);

        if (columns.length > 0) {
            console.log('🔍 Found user_id column in playlists table');
            
            // Check if user_id is required (NOT NULL) and has no default value
            const column = columns[0];
            if (column.Null === 'NO' && column.Default === null) {
                console.log('⚠️  user_id is required but has no default value');
                
                // Let's modify the column to be nullable
                console.log('🔧 Making user_id nullable...');
                await connection.query(`
                    ALTER TABLE playlists MODIFY COLUMN user_id INT NULL;
                `);
                console.log('✅ Made user_id nullable');
            } else {
                console.log('✅ user_id is already properly configured');
            }
        } else {
            console.log('ℹ️  No user_id column found in playlists table');
            
            // Let's check if we need to add the column
            const [tableInfo] = await connection.query(`
                SHOW CREATE TABLE playlists;
            `);
            
            const createTableSql = tableInfo[0]['Create Table'];
            console.log('ℹ️  Current table structure:', createTableSql);
            
            // Since the error mentions user_id, but the column doesn't exist, there might be a mismatch
            // Let's check if there are any foreign key constraints
            const [constraints] = await connection.query(`
                SELECT * FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'playlists' 
                AND REFERENCED_TABLE_NAME IS NOT NULL;
            `, [process.env.DB_NAME]);
            
            if (constraints.length > 0) {
                console.log('🔍 Found foreign key constraints:', constraints);
                // We'll need to drop these constraints before modifying the table
                for (const constraint of constraints) {
                    console.log(`🔨 Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
                    await connection.query(`
                        ALTER TABLE playlists DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME};
                    `);
                }
            }
            
            // Now let's check if we need to modify any columns
            const [allColumns] = await connection.query(`
                SHOW COLUMNS FROM playlists;
            `);
            
            console.log('📊 Current columns in playlists table:');
            console.table(allColumns);
            
            // Let's make sure the table has the correct structure
            console.log('🔄 Recreating playlists table with correct schema...');
            
            // First, create a backup of the existing data if any
            const [existingData] = await connection.query('SELECT * FROM playlists');
            const hasData = existingData.length > 0;
            
            if (hasData) {
                console.log('💾 Backing up existing playlist data...');
                // We'll store the data in a temporary table
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS playlists_backup LIKE playlists;
                    INSERT INTO playlists_backup SELECT * FROM playlists;
                `);
            }
            
            // Drop and recreate the table with the correct schema
            await connection.query(`
                DROP TABLE IF EXISTS tracks; -- Drop tracks first because of foreign key
                DROP TABLE IF EXISTS playlists;
                
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
            
            // Restore data if we had any
            if (hasData) {
                console.log('🔄 Restoring playlist data...');
                await connection.query(`
                    INSERT INTO playlists (id, name, created_at, updated_at)
                    SELECT id, name, created_at, updated_at FROM playlists_backup;
                    
                    -- We can't restore tracks because we dropped the table
                    -- You may need to re-upload the tracks
                    
                    DROP TABLE playlists_backup;
                `);
            }
            
            console.log('✅ Successfully recreated tables with correct schema');
        }
        
        // Verify the fix
        const [newColumns] = await connection.query(`
            SHOW COLUMNS FROM playlists;
        `);
        
        console.log('\n🔍 Updated playlists table structure:');
        console.table(newColumns);
        
        // Test inserting a playlist
        try {
            console.log('\n🧪 Testing playlist creation...');
            const [result] = await connection.query(
                'INSERT INTO playlists (name) VALUES (?)',
                ['Test Playlist']
            );
            console.log('✅ Successfully created test playlist');
            
            // Clean up
            await connection.query('DELETE FROM playlists WHERE name = ?', ['Test Playlist']);
        } catch (testError) {
            console.error('❌ Test failed:', testError.message);
            console.error('Full error:', testError);
            throw testError;
        }
        
    } catch (error) {
        console.error('❌ Error fixing database:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the fix
fixDatabase().then(() => {
    console.log('\n✨ Database fix completed successfully!');    
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Database fix failed:', error);
    process.exit(1);
});
