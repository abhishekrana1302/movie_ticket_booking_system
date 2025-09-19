import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Star, MapPin, Ticket } from 'lucide-react';
import { apiService } from '../services/api';
import { Movie, Showtime } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const MovieDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchMovieDetails();
    }
  }, [id]);

  const fetchMovieDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/movies/${id}`);
      setMovie(response.movie);
      setShowtimes(response.showtimes);
      
      // Set first available date as selected
      if (response.showtimes.length > 0) {
        const firstDate = response.showtimes[0].show_date;
        setSelectedDate(firstDate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch movie details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-300">{error || 'Movie not found'}</p>
          <Link
            to="/"
            className="inline-block mt-4 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-md transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get unique dates from showtimes
  const availableDates = [...new Set(showtimes.map(st => st.show_date))];
  
  // Filter showtimes by selected date
  const filteredShowtimes = showtimes.filter(st => st.show_date === selectedDate);
  
  // Group showtimes by theater
  const showtimesByTheater = filteredShowtimes.reduce((acc, showtime) => {
    const theaterId = showtime.theaters.id;
    if (!acc[theaterId]) {
      acc[theaterId] = {
        theater: showtime.theaters,
        times: []
      };
    }
    acc[theaterId].times.push(showtime);
    return acc;
  }, {} as Record<string, { theater: any; times: Showtime[] }>);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-96 md:h-[500px]">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-8">
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-48 h-72 object-cover rounded-lg shadow-2xl hidden md:block"
              />
              
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {movie.title}
                </h1>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-white font-medium">{movie.rating}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="h-5 w-5 text-gray-300" />
                    <span className="text-gray-300">{formatDuration(movie.duration)}</span>
                  </div>
                  
                  <span className="bg-red-600 px-3 py-1 rounded-full text-sm font-medium text-white">
                    {movie.genre}
                  </span>
                </div>

                <p className="text-gray-200 text-lg leading-relaxed max-w-3xl">
                  {movie.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showtimes Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-white mb-8">Book Tickets</h2>

        {showtimes.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Showtimes Available</h3>
            <p className="text-gray-400">Check back soon for available showtimes.</p>
          </div>
        ) : (
          <>
            {/* Date Selection */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Select Date</h3>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 px-4 py-2 rounded-md font-medium transition-colors ${
                      selectedDate === date
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>
            </div>

            {/* Theater Showtimes */}
            <div className="space-y-6">
              {Object.entries(showtimesByTheater).map(([theaterId, { theater, times }]) => (
                <div key={theaterId} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{theater.name}</h3>
                      <div className="flex items-center text-gray-300 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{theater.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {times.map((showtime) => (
                      <Link
                        key={showtime.id}
                        to={`/booking/${showtime.id}`}
                        className="block bg-gray-700 hover:bg-red-600 text-center py-3 px-4 rounded-md transition-colors group"
                      >
                        <div className="text-white font-medium group-hover:text-white">
                          {formatTime(showtime.show_time)}
                        </div>
                        <div className="text-sm text-gray-300 group-hover:text-gray-100">
                          ${showtime.price}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;