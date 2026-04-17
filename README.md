# URL Shortener with Backend

A full-stack URL shortener application with user authentication and backend database storage.

## Features

- User registration and login with JWT authentication
- Create and manage shortened URLs
- Track click counts for each shortened URL
- Search and filter URL history
- Secure password hashing with bcryptjs
- Persistent data storage with SQLite

## Project Structure

```
urlshortner/
├── index.html          # Frontend HTML
├── app.js              # Frontend JavaScript
├── style.css           # Frontend styles
├── server.js           # Express backend server
├── package.json        # Node dependencies
├── .env                # Environment variables
├── .gitignore          # Git ignore rules
└── data/
    └── database.db     # SQLite database (created on first run)
```

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Navigate to the project directory:
```bash
cd urlshortner
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Update the JWT_SECRET in `.env` for production:
```
JWT_SECRET=your-very-secure-secret-key
```

## Running the Server

Start the development server:
```bash
npm start
```

Or, with auto-reload on file changes:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

Access the application at: `http://localhost:3000/urlshortner`

## API Endpoints

### Authentication

- **POST** `/api/auth/register` - Register a new user
  - Body: `{ email: string, password: string }`
  - Returns: `{ token: string, user: { id, email } }`

- **POST** `/api/auth/login` - Login user
  - Body: `{ email: string, password: string }`
  - Returns: `{ token: string, user: { id, email } }`

- **POST** `/api/auth/verify` - Verify JWT token
  - Headers: `Authorization: Bearer {token}`
  - Returns: `{ valid: boolean, user: { id, email } }`

### URL Management

- **POST** `/api/urls/shorten` - Create shortened URL
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ originalUrl: string, shortCode: string }`
  - Returns: `{ id, short_code, original_url, click_count }`

- **GET** `/api/urls` - Get user's shortened URLs
  - Headers: `Authorization: Bearer {token}`
  - Returns: `[ { id, short_code, original_url, click_count, created_at } ]`

- **GET** `/api/urls/redirect/:shortCode` - Get original URL and increment clicks
  - Returns: `{ original_url: string }`

- **PUT** `/api/urls/:shortCode/click` - Increment click count for a URL
  - Returns: `{ success: true }`

- **DELETE** `/api/urls/:shortCode` - Delete shortened URL
  - Headers: `Authorization: Bearer {token}`
  - Returns: `{ success: true }`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### URLs Table
```sql
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## How to Use

1. **Register**: Click "Login" button, then "Register" to create a new account
2. **Enter email and password** (password must be at least 6 characters)
3. **Shorten URLs**: After login, paste a long URL and click "Shorten URL"
4. **Copy shortened link**: Click the "Copy" button to copy the shortened URL
5. **Track clicks**: View your URL history with click counts
6. **Test URLs**: Click the test button (🔗) to open the original URL

## Security Notes

- Passwords are hashed using bcryptjs with 10 salt rounds
- JWT tokens expire after 30 days
- **For production**: 
  - Change the JWT_SECRET in .env
  - Use HTTPS
  - Set secure environment variables
  - Use a production database (PostgreSQL, MySQL, etc.)
  - Add rate limiting
  - Add CSRF protection
  - Enable CORS appropriately

## Troubleshooting

### Port already in use
If port 3000 is already in use, change it in `.env`:
```
PORT=3001
```

### Database errors
Delete the `data/` directory to reset the database:
```bash
rm -r data/
npm start
```

### CORS errors
Make sure the frontend is accessing the correct API URL. Check that `API_BASE_URL` in `app.js` matches your server address.

## Future Enhancements

- Add URL expiration
- Add QR code generation
- Add analytics dashboard
- Add custom short codes
- Add URL preview before redirecting
- Add rate limiting
- Add email verification
- Add password reset functionality
- Add two-factor authentication

## License

ISC
