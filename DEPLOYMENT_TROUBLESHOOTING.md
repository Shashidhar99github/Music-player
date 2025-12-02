# Deployment Troubleshooting Guide

## Common "Failed to create playlist" Issues

### Issue: Works locally but fails in deployment

This usually indicates a configuration difference between local and production environments.

## Checklist

### 1. Environment Variables

**Problem:** Environment variables not set in deployment platform.

**Solution:**
- Set the following environment variables in your deployment platform (Heroku, Railway, Vercel, etc.):
  ```
  DB_HOST=your_database_host
  DB_USER=your_database_user
  DB_PASSWORD=your_database_password
  DB_NAME=music_app
  PORT=3000 (or let platform assign)
  ```

**Where to set:**
- **Heroku:** Settings → Config Vars
- **Railway:** Variables tab
- **Vercel:** Settings → Environment Variables
- **DigitalOcean:** App Settings → Environment Variables

### 2. Database Host

**Problem:** Using `localhost` in production.

**Solution:**
- In deployment, `DB_HOST` should be your database server's public IP or hostname
- NOT `localhost` (localhost in deployment refers to the container, not your database)
- Examples:
  - Remote MySQL: `your-db.example.com`
  - Cloud provider: `database.cloudprovider.com`
  - IP address: `123.45.67.89`

### 3. Database Accessibility

**Problem:** Database server not accessible from deployment.

**Solution:**
- Ensure database allows connections from deployment IP
- Check firewall rules
- Verify database is publicly accessible (or use VPN/tunnel)
- Check security groups (AWS) or firewall rules (other providers)

### 4. Database Not Created

**Problem:** Database or tables don't exist in production.

**Solution:**
1. Connect to your production database
2. Run the setup script:
   ```bash
   node server/setup-db.js
   ```
   
   Or manually create:
   ```sql
   CREATE DATABASE IF NOT EXISTS music_app;
   USE music_app;
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
   ```

### 5. Database Permissions

**Problem:** Database user doesn't have necessary permissions.

**Solution:**
```sql
GRANT ALL PRIVILEGES ON music_app.* TO 'your_user'@'%';
FLUSH PRIVILEGES;
```

### 6. Connection Pool Issues

**Problem:** Too many connections or connection timeout.

**Solution:**
- Check your database connection limits
- Adjust pool size in `server/db.js` if needed
- Ensure connections are properly closed

## Debugging Steps

### 1. Check Server Logs

Look at your deployment platform's logs for:
- Database connection errors
- Error codes (ECONNREFUSED, ER_ACCESS_DENIED, etc.)
- SQL errors

### 2. Test Database Connection

Create a test endpoint to verify database connection:

```javascript
// Add to server.js temporarily
app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./db');
        const [result] = await db.query('SELECT 1 as test');
        res.json({ status: 'OK', database: 'connected' });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            error: error.message,
            code: error.code 
        });
    }
});
```

Visit: `https://your-app.com/api/test-db`

### 3. Verify Environment Variables

Add temporary logging (remove after debugging):

```javascript
// In server.js
console.log('Environment check:', {
    DB_HOST: process.env.DB_HOST ? 'SET' : 'MISSING',
    DB_USER: process.env.DB_USER ? 'SET' : 'MISSING',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'MISSING',
    DB_NAME: process.env.DB_NAME ? 'SET' : 'MISSING'
});
```

### 4. Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `ECONNREFUSED` | Can't connect to database | Check DB_HOST and database server status |
| `ER_ACCESS_DENIED_ERROR` | Wrong credentials | Verify DB_USER and DB_PASSWORD |
| `ER_BAD_DB_ERROR` | Database doesn't exist | Create database or check DB_NAME |
| `ER_NO_SUCH_TABLE` | Tables don't exist | Run setup-db.js |
| `ENOTFOUND` | Hostname not found | Check DB_HOST value |
| `ETIMEDOUT` | Connection timeout | Check network/firewall rules |

## Quick Fix Script

Create a file `test-deployment.js` in server directory:

```javascript
require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    console.log('Testing deployment configuration...');
    console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
    console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
    console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        
        console.log('✅ Database connection successful!');
        await connection.end();
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
    }
}

test();
```

Run: `node server/test-deployment.js`

## Still Having Issues?

1. Check browser console (F12) for detailed error messages
2. Check deployment platform logs for server errors
3. Verify all environment variables are set correctly
4. Test database connection from deployment environment
5. Ensure database allows external connections

