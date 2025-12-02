# Database Setup Guide

## Quick Setup

### 1. Create `.env` File

Create a file named `.env` in the `server/` directory with your database configuration:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=music_app
PORT=3000
```

**Note:** Replace `your_mysql_password` with your actual MySQL root password.

### 2. Setup Database

Run the setup script to create the database and tables:

```bash
cd server
node setup-db.js
```

Or use the check script which will verify and fix any issues:

```bash
cd server
node check-db.js
```

### 3. Start the Server

```bash
cd server
npm start
```

## Troubleshooting

### Error: "Failed to load playlists"

1. **Check if `.env` file exists:**
   - Location: `server/.env`
   - Copy `server/.env.example` to `server/.env` and update values

2. **Check MySQL is running:**
   ```bash
   # Windows
   net start MySQL
   
   # Linux/Mac
   sudo systemctl start mysql
   ```

3. **Verify database connection:**
   ```bash
   cd server
   node check-db.js
   ```

4. **Create database manually:**
   ```bash
   cd server
   node setup-db.js
   ```

### Common Errors

#### "ECONNREFUSED"
- MySQL server is not running
- Solution: Start MySQL service

#### "ER_ACCESS_DENIED_ERROR"
- Wrong database credentials
- Solution: Check username/password in `.env` file

#### "ER_BAD_DB_ERROR"
- Database does not exist
- Solution: Run `node setup-db.js`

#### "ER_NO_SUCH_TABLE"
- Tables don't exist
- Solution: Run `node setup-db.js`

## Database Location

Your database configuration is in:
- **Config file:** `server/db.js`
- **Environment variables:** `server/.env` (you need to create this)
- **Example file:** `server/.env.example`

The database itself is stored in your MySQL server (not in a file in this project).

## Database Structure

- **Database name:** `music_app` (configurable in `.env`)
- **Tables:**
  - `playlists` - Stores playlist information
  - `tracks` - Stores track/song information

