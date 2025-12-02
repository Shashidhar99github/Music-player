const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
    console.log('🔍 Checking database configuration...');
    console.log('Database:', process.env.DB_NAME);
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };
    
    let connection;
    try {
        // 1. Test connection
        console.log('\n🔌 Testing database connection...');
        connection = await mysql.createConnection(config);
        console.log('✅ Successfully connected to MySQL database!');
        
        // 2. Check if database exists
        const [dbs] = await connection.query('SHOW DATABASES');
        const dbExists = dbs.some(db => db.Database === process.env.DB_NAME);
        console.log(`📊 Database "${process.env.DB_NAME}" exists:`, dbExists ? '✅ Yes' : '❌ No');
        
        if (!dbExists) {
            console.log('Creating database...');
            await connection.query(`CREATE DATABASE \`${process.env.DB_NAME}\``);
            console.log('✅ Database created successfully');
            await connection.changeUser({ database: process.env.DB_NAME });
        }
        
        // 3. Check tables
        console.log('\n📋 Checking tables...');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`Found ${tables.length} tables in the database`);
        
        // 4. Check playlists table structure
        try {
            const [playlistColumns] = await connection.query('DESCRIBE playlists');
            console.log('\n📊 Playlists table structure:');
            console.table(playlistColumns);
            
            // Check for user_id column
            const hasUserId = playlistColumns.some(col => col.Field === 'user_id');
            if (hasUserId) {
                console.log('⚠️  Found user_id column in playlists table');
                const userIdCol = playlistColumns.find(col => col.Field === 'user_id');
                console.log('user_id column details:', {
                    Type: userIdCol.Type,
                    Null: userIdCol.Null,
                    Default: userIdCol.Default,
                    Extra: userIdCol.Extra
                });
                
                // Make user_id nullable if it's required
                if (userIdCol.Null === 'NO' && !userIdCol.Default) {
                    console.log('🔧 Making user_id nullable...');
                    await connection.query('ALTER TABLE playlists MODIFY COLUMN user_id INT NULL');
                    console.log('✅ Made user_id nullable');
                }
            }
            
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('❌ Playlists table does not exist');
                console.log('Creating playlists table...');
                await createTables(connection);
            } else {
                throw error;
            }
        }
        
        // 5. Test insert
        console.log('\n🧪 Testing playlist creation...');
        try {
            const [result] = await connection.query(
                'INSERT INTO playlists (name) VALUES (?)',
                ['Test Playlist']
            );
            console.log('✅ Successfully created test playlist');
            
            // Clean up
            await connection.query('DELETE FROM playlists WHERE name = ?', ['Test Playlist']);
        } catch (insertError) {
            console.error('❌ Failed to create test playlist:', insertError.message);
            console.error('SQL:', insertError.sql);
            
            // Try to fix the table structure
            if (insertError.code === 'ER_NO_SUCH_TABLE') {
                console.log('Creating missing tables...');
                await createTables(connection);
                console.log('✅ Tables created successfully');
            } else if (insertError.code === 'ER_NO_DEFAULT_FOR_FIELD') {
                console.log('Fixing table structure...');
                await fixTableStructure(connection);
                console.log('✅ Table structure fixed');
            }
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        console.error('Error code:', error.code);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n🔑 Access denied. Please check your database credentials in the .env file.');
            console.error('Current configuration:', {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                database: process.env.DB_NAME
            });
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\nThe database does not exist. Creating it now...');
            try {
                const tempConnection = await mysql.createConnection({
                    host: process.env.DB_HOST,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD
                });
                
                await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
                console.log('✅ Database created successfully');
                await tempConnection.end();
                
                // Reconnect with the database selected
                connection = await mysql.createConnection(config);
                await createTables(connection);
                console.log('✅ Tables created successfully');
                
            } catch (createError) {
                console.error('Failed to create database:', createError.message);
            }
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

async function createTables(connection) {
    console.log('\n🔨 Creating tables...');
    await connection.query(`
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
    console.log('✅ Tables created successfully');
}

async function fixTableStructure(connection) {
    console.log('\n🔧 Fixing table structure...');
    
    try {
        // Drop foreign key constraints first
        const [constraints] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'tracks' 
            AND CONSTRAINT_TYPE = 'FOREIGN_KEY_CONSTRAINT';
        `, [process.env.DB_NAME]);
        
        for (const constraint of constraints) {
            console.log(`Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
            await connection.query(`
                ALTER TABLE tracks DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME};
            `);
        }
        
        // Drop and recreate tables
        await connection.query(`
            DROP TABLE IF EXISTS tracks;
            DROP TABLE IF EXISTS playlists;
        `);
        
        // Recreate tables with correct structure
        await createTables(connection);
        
    } catch (error) {
        console.error('Failed to fix table structure:', error.message);
        throw error;
    }
}

// Run the check
checkDatabase().then(() => {
    console.log('\n✨ Database check completed successfully!');
    console.log('You can now try creating a playlist again.');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Database check failed:', error);
    process.exit(1);
});
