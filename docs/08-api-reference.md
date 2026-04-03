# API Reference

## API Endpoints

### User Management
- `POST /api/users` - Create a new user
- `GET /api/users/{id}` - Retrieve user information

### Authentication
- `POST /api/auth/login` - Authenticate a user and receive a token
- `POST /api/auth/logout` - Logout a user

## WebSocket Events
- `message` - Receive real-time messages
- `user:joined` - Notifications when a user joins

## Example Requests

### Create a User
```bash
curl -X POST http://yourapi.com/api/users \
-H 'Content-Type: application/json' \
-d '{"name": "Jane Doe", "email": "jane@example.com"}'
```

### User Login
```bash
curl -X POST http://yourapi.com/api/auth/login \
-H 'Content-Type: application/json' \
-d '{"email": "jane@example.com", "password": "yourpassword"}'
```
