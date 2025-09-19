import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, MapPin } from 'lucide-react';
import { apiService } from '../services/api';
import { Movie } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const Home: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/movies');
      setMovies(response.movies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch movies');
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={fetchMovies}
            className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent mb-4">
          Now Showing
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Book your favorite movies with ease. Real-time seat selection and secure payments.
        </p>
      </div>

      {/* Movies Grid */}
      {movies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-2xl font-semibold text-gray-300 mb-2">No Movies Available</h3>
          <p className="text-gray-400">Check back soon for new releases!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

const MovieCard: React.FC<{ movie: Movie }> = ({ movie }) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
      <div className="relative">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-white text-sm font-medium">{movie.rating}</span>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-white group-hover:text-red-400 transition-colors">
          {movie.title}
        </h3>
        
        <p className="text-gray-300 text-sm mb-4 line-clamp-3">
          {movie.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-2" />
            <span>{formatDuration(movie.duration)}</span>
            <span className="mx-2">•</span>
            <span className="bg-gray-700 px-2 py-1 rounded text-xs">{movie.genre}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(movie.release_date)}</span>
          </div>
        </div>

        <Link
          to={`/movies/${movie.id}`}
          className="block w-full bg-red-600 hover:bg-red-700 text-white text-center py-3 px-4 rounded-md font-medium transition-colors duration-200"
        >
          Book Tickets
        </Link>
      </div>
    </div>
  );
};

export default Home;