# Movie Ticket Booking System

A complete, production-ready movie ticket booking system with real-time seat allocation and payment integration.

## Features

- **User Authentication**: Secure email/password authentication with JWT
- **Real-time Seat Selection**: Live seat availability updates using WebSockets
- **Payment Integration**: Secure payments with Stripe
- **Movie Management**: Browse movies, showtimes, and theaters
- **Booking System**: Complete booking flow with confirmation
- **Responsive Design**: Works seamlessly on all devices
- **Race Condition Prevention**: Prevents double bookings with seat locking

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Socket.IO client for real-time updates
- React Hook Form for form handling

**Backend:**
- Node.js with Express
- TypeScript for type safety
- Socket.IO for real-time communication
- Stripe for payment processing
- JWT for authentication
- Supabase (PostgreSQL) for database

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)
- Stripe account (for payments)

### Setup

1. **Clone and install dependencies:**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

2. **Environment Setup:**
```bash
# Copy environment files
cp .env.example .env
cd backend
cp .env.example .env
cd ..
```

3. **Configure Environment Variables:**

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Backend `.env`:
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. **Database Setup:**

The application uses Supabase. Click "Connect to Supabase" in the top right corner to set up your database, then the migrations will be applied automatically.

5. **Start Development:**

```bash
# Start backend (from backend directory)
cd backend
npm run dev

# Start frontend (from root directory)
npm run dev
```

## Database Schema

The system uses the following main tables:

- **users**: User authentication and profiles
- **movies**: Movie catalog with details
- **theaters**: Theater information
- **showtimes**: Movie showtimes at specific theaters
- **seats**: Seat configuration for theaters
- **bookings**: Booking records
- **booking_seats**: Seat reservations for bookings
- **payments**: Payment transaction records

## Real-time Features

### Seat Locking Mechanism

The system implements a sophisticated seat locking mechanism to prevent race conditions:

1. **Temporary Locks**: When a user selects seats, they're temporarily locked for 10 minutes
2. **Real-time Updates**: Other users see locked seats immediately via WebSocket
3. **Auto-release**: Locks are automatically released if payment isn't completed
4. **Conflict Prevention**: Database constraints prevent double bookings

### WebSocket Events

- `seat:select` - User selects/deselects seats
- `seat:lock` - Seats are temporarily locked
- `seat:release` - Seats are released
- `seat:book` - Seats are permanently booked
- `showtime:update` - Seat availability updates

## Payment Flow

1. User selects seats (seats are temporarily locked)
2. Payment intent is created with Stripe
3. User completes payment on frontend
4. Stripe webhook confirms payment
5. Seats are permanently booked
6. Confirmation email is sent

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Movies & Showtimes
- `GET /api/movies` - List all movies
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/:id/showtimes` - Get movie showtimes

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - User's bookings
- `GET /api/bookings/:id` - Booking details

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook handler

## Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
npm test
```

## Production Deployment

The application is ready for production deployment. Key considerations:

- Use environment-specific configuration
- Enable HTTPS for all endpoints
- Configure CORS properly
- Set up proper logging
- Use production database
- Configure Stripe webhooks for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.