'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Image from 'next/image';
import MoviePopup from './MoviePopup';

type Industry =
  | 'ALL'
  | 'BOLLYWOOD'
  | 'TOLLYWOOD'
  | 'KOLLYWOOD'
  | 'MOLLYWOOD'
  | 'SANDALWOOD'
  | 'MARATHI'
  | 'PUNJABI'
  | 'BENGALI';

interface Movie {
  id: number;
  title: string;
  year: number;
  rating: number;
  image: string;
  description: string;
  isSubscription: boolean;
  isFollowing: boolean;
  releaseDate?: string | null;
  genre?: string;
}

interface MoviesProps {
  searchTerm?: string;
  selectedYear?: string;     // "2024"
  selectedGenre?: string;    // TMDB genre id like "28"
  itemsPerPage?: number;     // client-side slice size
  currentPage?: number;      // server pagination page
  language?: string;         // e.g., 'en-US' or 'hi-IN'
  industry?: Industry;       // new filter
  selectedRows?: number;     // number of rows to display
  onMovieSelect?: (movieTitle: string) => void;
  selectedMovies?: string[]; // already selected movies
}

function mapIndustry(industry: Industry) {
  switch (industry) {
    case 'BOLLYWOOD':   return { region: 'IN', language: 'hi-IN', wol: 'hi' };
    case 'TOLLYWOOD':   return { region: 'IN', language: 'te-IN', wol: 'te' };
    case 'KOLLYWOOD':   return { region: 'IN', language: 'ta-IN', wol: 'ta' };
    case 'MOLLYWOOD':   return { region: 'IN', language: 'ml-IN', wol: 'ml' };
    case 'SANDALWOOD':  return { region: 'IN', language: 'kn-IN', wol: 'kn' };
    case 'MARATHI':     return { region: 'IN', language: 'mr-IN', wol: 'mr' };
    case 'PUNJABI':     return { region: 'IN', language: 'pa-IN', wol: 'pa' };
    case 'BENGALI':     return { region: 'IN', language: 'bn-IN', wol: 'bn' };
    case 'ALL':
    default:            return { region: '', language: 'en-US', wol: '' };
  }
}

// Card
const MovieCard = memo(function MovieCard({ movie, onCardClick, isSelected = false }: { movie: Movie; onCardClick: (movie: Movie) => void; isSelected?: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = useCallback(() => {
    onCardClick(movie);
  }, [movie, onCardClick]);

  return (
    <div
      className={`movie-card ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="card-image-container">
        <Image
          src={movie.image}
          alt={movie.title}
          fill
          priority={isSelected}
          loading="eager"
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 33vw, 25vw"
          className="card-image"
          style={{ objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/bg.png'; }}
        />
        <div className="gradient-overlay"></div>
        <div className="rating-corner">
          <div className="rating">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span>{movie.rating}</span>
          </div>
        </div>
        {isSelected && (
          <div className="selected-indicator">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
        )}
         <div className="movie-title-overlay">
           <h3 className="movie-title" title={movie.title}>{movie.title}</h3>
           <p className="movie-year">({movie.year})</p>
         </div>
        <button className="play-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5V19L19 12L8 5Z" />
          </svg>
        </button>
        {movie.isFollowing && <div className="following-badge">Following Now</div>}
        {movie.isSubscription && <div className="subscription-badge">Subscription</div>}
      </div>

      <style jsx>{`
        .movie-card{background:#000;border-radius:16px;overflow:hidden;transition:.4s;border:1px solid rgba(139,69,255,.1);position:relative;cursor:pointer;height:280px}
        .movie-card:hover{transform:translateY(-8px) scale(1.02);border-color:rgba(139,69,255,.3);box-shadow:0 20px 40px rgba(0,0,0,.3)}
        .movie-card.selected{border-color:#28a745;border-width:2px;box-shadow:0 0 20px rgba(40,167,69,.3)}
        .movie-card.selected:hover{border-color:#20c997;box-shadow:0 0 25px rgba(40,167,69,.4)}
        .selected-indicator{position:absolute;top:16px;left:16px;z-index:3;background:#28a745;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 2px 8px rgba(40,167,69,.4)}
        .selected-indicator svg{width:16px;height:16px}
        .card-image-container{position:relative;width:100%;height:100%}
        .card-image{transition:transform .4s ease}
        .movie-card:hover .card-image{transform:scale(1.1)}
        .gradient-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.3) 50%,rgba(0,0,0,.8));z-index:1}
        .rating-corner{position:absolute;top:16px;right:16px;z-index:3}
        .rating{display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.7);padding:6px 10px;border-radius:20px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2)}
        .rating svg{color:#FFD700}
        .rating span{color:#fff;font-size:.9rem;font-weight:600;font-family:'Paralucent-Medium',Arial,sans-serif}
        .movie-title-overlay{position:absolute;bottom:60px;left:16px;right:16px;z-index:3}
        .movie-title{color:#fff;font-size:1.1rem;font-weight:600;font-family:'Paralucent-DemiBold',Arial,sans-serif;line-height:1.3;text-shadow:2px 2px 4px rgba(0,0,0,.8);margin:0 0 4px}
        .movie-year{color:rgba(255,255,255,.8);font-size:.9rem;font-weight:400;margin:0;text-shadow:1px 1px 2px rgba(0,0,0,.8)}
        .play-button{position:absolute;bottom:16px;right:16px;background:rgba(255,255,255,.9);border:none;border-radius:50%;width:50px;height:50px;display:flex;align-items:center;justify-content:center;color:#000;cursor:pointer;transition:.3s;box-shadow:0 4px 15px rgba(0,0,0,.3);z-index:3}
        .play-button:hover{background:#fff;transform:scale(1.1);box-shadow:0 6px 20px rgba(0,0,0,.4)}
        .following-badge{position:absolute;top:16px;left:16px;background:linear-gradient(135deg,#8b45ff,#6b2cff);color:#fff;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;font-family:'Paralucent-Medium',Arial,sans-serif;z-index:3;animation:pulse 2s infinite}
        .subscription-badge{position:absolute;top:50px;left:16px;background:linear-gradient(135deg,#ff6b35,#ff8c42);color:#fff;padding:4px 8px;border-radius:12px;font-size:.7rem;font-weight:600;font-family:'Paralucent-Medium',Arial,sans-serif;z-index:3}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.8}}
         @media (max-width:768px){
           .movie-card{height:8rem}
           .card-image-container{height:8rem}
           .movie-title{font-size:0.75rem;bottom:2.5rem;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
           .movie-year{font-size:0.6rem}
           .rating{font-size:0.6rem;padding:3px 6px}
           .rating span{font-size:0.6rem}
           .play-button{width:28px;height:28px;bottom:0.8rem;right:0.8rem}
           .following-badge{display:none}
           .subscription-badge{display:none}
           .rating-corner{top:0.6rem;right:0.6rem}
           .movie-title-overlay{bottom:2.5rem;left:0.8rem;right:0.8rem}
         }
      `}</style>
    </div>
  );
});

export default function Movies({
  searchTerm = '',
  selectedYear = '',
  selectedGenre = '',
  itemsPerPage = 20,
  currentPage = 1,
  language,                 // optional override
  industry = 'ALL',
  selectedRows = 3,
  onMovieSelect,
  selectedMovies = [],
}: MoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [visibleMovies, setVisibleMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  const handleCardClick = (movie: Movie) => {
    
    setSelectedMovie(movie);
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedMovie(null);
  };

  const fetchMovies = useCallback(async () => {
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        setIsLoading(true);
        setError(null);
        
        if (retryCount > 0) {
          
        }

        const map = mapIndustry(industry);
        const params = new URLSearchParams({
          page: String(currentPage),
          language: language || map.language || 'en-US',
          // Show newest movies first
          sortBy: 'primary_release_date.desc',
        });

        // Industry-only filters when not searching
        if (!searchTerm && map.region) params.set('region', map.region);
        if (!searchTerm && map.wol) params.set('wol', map.wol); // server maps to with_original_language

        // Search or Discover filters
        if (searchTerm) params.set('query', searchTerm);
        if (!searchTerm && selectedYear) params.set('year', selectedYear);
        if (!searchTerm && selectedGenre) params.set('genre', selectedGenre);

        // Add cache-busting parameter if retrying
        if (retryCount > 0) {
          params.set('_cb', Date.now().toString());
        }

        const response = await fetch(`/api/tmdb?${params.toString()}`, {
          // Increase timeout for more reliable fetching
          signal: AbortSignal.timeout(10000 + (retryCount * 5000))
        });
        
        if (!response.ok) throw new Error(`Failed to fetch movies: ${response.status}`);

        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid API response format');
        }

        const transformed: Movie[] = (data.results ?? []).map((m: unknown, index: number) => {
          const movie = m as {
            id: number;
            title?: string;
            name?: string;
            release_date?: string;
            first_air_date?: string;
            vote_average?: number;
            poster_path?: string;
            overview?: string;
            genre_ids?: number[];
          };
          return {
            id: movie.id,
            title: movie.title ?? movie.name ?? 'Untitled',
            year: movie.release_date
              ? new Date(movie.release_date).getFullYear()
              : (movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : 2023),
            rating: parseFloat(((movie.vote_average ?? 0) / 2).toFixed(1)), // 10 -> 5 scale
            image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/bg.png',
            description: movie.overview || 'No description available',
            isSubscription: Math.random() > 0.6,
            isFollowing: index < 3,
            releaseDate: movie.release_date || movie.first_air_date || null,
            genre: Array.isArray(movie.genre_ids) && movie.genre_ids.length ? String(movie.genre_ids) : 'Action',
          };
        });

        setMovies(transformed);
        setHasInitialLoad(true);
        success = true;
      } catch (err) {
        
        retryCount++;
        
        if (retryCount >= maxRetries) {
          setError(`फिल्में लोड करने में समस्या हुई। कृपया कुछ देर बाद पुनः प्रयास करें।`);
          setMovies((prev) =>
            prev.length
              ? prev
              : [{
                  id: 1, 
                  title: 'Fallback Movie', 
                  year: 2023, 
                  rating: 4.2,
                  image: '/bg.png', 
                  description: 'Fallback description.',
                  isSubscription: true, 
                  isFollowing: true,
                  releaseDate: '2023-01-01',
                }]
          );
          setHasInitialLoad(true);
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      } finally {
        if (success || retryCount >= maxRetries) {
          setIsLoading(false);
        }
      }
    }
  }, [currentPage, searchTerm, selectedYear, selectedGenre, industry, language]);

  // Single useEffect to handle all movie fetching and filtering
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);
  
  // Show loading indicator while fetching
  useEffect(() => {
    if (isLoading) {
      
    }
  }, [isLoading]);

  // Memoized filtering logic for better performance
  const filteredMoviesData = useMemo(() => {
    // Get current year for filtering
    const currentYear = new Date().getFullYear();
    
    // Log for debugging
    
    
    const filtered = movies.filter((movie) => {
      // Convert everything to lowercase for case-insensitive comparison
      const titleLower = movie.title.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Basic search - check if title contains search term
      const matchesSearch = searchTerm === '' || titleLower.includes(searchLower);
      
      // Year filter - if "All Years" or empty, show all years
      const matchesYear = !selectedYear || selectedYear === 'All Years' || movie.year.toString() === selectedYear;
      
      // Genre filter - if empty, show all genres
      const matchesGenre = !selectedGenre || movie.genre === selectedGenre;
      
      // Filter out future movies
      const isNotFutureMovie = movie.year <= currentYear;
      
      // Debug log for first few movies
      if (movies.indexOf(movie) < 5) {
        
      }
      
      return matchesSearch && matchesYear && matchesGenre && isNotFutureMovie;
    });
    
    
    
    // Sort by year (newest first) for better organization
    filtered.sort((a, b) => b.year - a.year);
    
    // Only show what's needed for current view (virtual rendering)
    const startIndex = 0;
    const endIndex = Math.min(itemsPerPage, filtered.length);
    const currentMovies = filtered.slice(startIndex, endIndex);
    
    return { filtered, currentMovies };
  }, [movies, searchTerm, selectedYear, selectedGenre, itemsPerPage]);
  
  // Update state based on memoized calculations
  useEffect(() => {
    setFilteredMovies(filteredMoviesData.filtered);
    setVisibleMovies(filteredMoviesData.currentMovies);
  }, [filteredMoviesData]);

  // Calculate dynamic container height based on selected rows
  const getContainerHeight = () => {
    // Base heights for different screen sizes
    const desktopCardHeight = 350; // px
    const mobileCardHeight = 160; // 10rem = 160px
    const desktopGap = 24; // px
    const mobileGap = 8; // px
    
    return {
      desktop: (desktopCardHeight * selectedRows) + (desktopGap * (selectedRows - 1)),
      mobile: (mobileCardHeight * selectedRows) + (mobileGap * (selectedRows - 1))
    };
  };

  const containerHeight = getContainerHeight();

  if (error) {
    return (
       <div className="error-container">
         <div className="error-message">
           <h3>Oops! कुछ गलत हो गया</h3>
           <p>{error}</p>
           <button onClick={() => fetchMovies()} className="retry-button">पुनः प्रयास करें</button>
         </div>
         <style jsx>{`
           .error-container { display: flex; justify-content: center; align-items: center; min-height: 400px; padding: 2rem; }
           .error-message { text-align: center; color: #ffffff; background: rgba(255, 69, 69, 0.1); padding: 2rem; border-radius: 16px; border: 1px solid rgba(255, 69, 69, 0.2); max-width: 500px; }
           .error-message h3 { margin: 0 0 1rem 0; color: #ff4545; font-size: 1.5rem; }
           .retry-button { background: linear-gradient(135deg, #8b45ff 0%, #6b2cff 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 1rem; transition: all 0.3s ease; }
           .retry-button:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(139, 69, 255, 0.3); }
         `}</style>
       </div>
    );
  }

  if (isLoading && !hasInitialLoad) {
    return (
       <div className="loading-grid" style={{ height: `${containerHeight.desktop}px` }}>
         <div className="loading-center">
           <div className="loading-spinner"></div>
           <p className="loading-text">Movies loading...</p>
         </div>
         {Array.from({ length: itemsPerPage }).map((_, index) => (
           <div key={index} className="loading-card">
             <div className="loading-shimmer"></div>
           </div>
         ))}
         <style jsx>{`
           .loading-grid { 
             display: grid; 
             grid-template-columns: repeat(3, 1fr); 
             gap: 24px; 
             max-width: 1400px; 
             margin: 0 auto; 
             padding: 0 1rem; 
             grid-template-rows: repeat(${selectedRows}, 280px);
             overflow: hidden;
             position: relative;
           }
           .loading-center {
             position: absolute;
             top: 50%;
             left: 50%;
             transform: translate(-50%, -50%);
             z-index: 10;
             display: flex;
             flex-direction: column;
             align-items: center;
             background: rgba(0,0,0,0.7);
             padding: 2rem;
             border-radius: 16px;
             backdrop-filter: blur(10px);
           }
           .loading-spinner {
             width: 50px;
             height: 50px;
             border: 4px solid rgba(139, 69, 255, 0.3);
             border-top: 4px solid #8b45ff;
             border-radius: 50%;
             animation: spin 1s linear infinite;
           }
           .loading-text {
             margin-top: 1rem;
             color: white;
             font-weight: 600;
           }
           @keyframes spin {
             0% { transform: rotate(0deg); }
             100% { transform: rotate(360deg); }
           }
           .loading-card { background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; height: 280px; overflow: hidden; position: relative; opacity: 0.3; }
           .loading-shimmer { position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(139,69,255,0.1), transparent); animation: shimmer 1s infinite; will-change: transform; }
           @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
           @media (min-width: 1200px) { 
             .loading-grid { 
               grid-template-columns: repeat(4, 1fr); 
               height: ${containerHeight.desktop}px !important;
             } 
           }
           @media (max-width: 1200px) and (min-width: 769px) { 
             .loading-grid { 
               grid-template-columns: repeat(3, 1fr); 
               height: ${containerHeight.desktop}px !important;
             } 
           }
           @media (max-width: 768px) { 
             .loading-grid { 
               grid-template-columns: repeat(3, 1fr) !important; 
               gap: 8px; 
               padding: 0 0.5rem; 
               grid-template-rows: repeat(${selectedRows}, 8rem);
               height: ${containerHeight.mobile}px !important;
             }
             .loading-card { height: 10rem; }
             .loading-center {
               padding: 1rem;
             }
             .loading-spinner {
               width: 30px;
               height: 30px;
             }
           }
         `}</style>
       </div>
    );
  }

  return (
    <>
      <div className="movie-grid-container" style={{ height: `${containerHeight.desktop}px` }}>
        <div className="movie-grid">
          {visibleMovies.length === 0 ? (
            <div className="no-results">
              <h3>No movies found</h3>
              <p>Try adjusting your search criteria</p>
            </div>
          ) : (
            visibleMovies.map((movie, index) => (
              <div
                key={movie.id}
                className="movie-item"
                style={{
                  // Faster animations with shorter delays
                  animationName: 'fadeInUp',
                  animationDuration: '0.3s',
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'forwards',
                  animationDelay: `${index * 0.03}s`,
                  // Hide items beyond the selected rows
                  display: index >= (selectedRows * 4) ? 'none' : 'block'
                }}
              >
                <MovieCard 
                  movie={movie} 
                  onCardClick={handleCardClick} 
                  isSelected={selectedMovies.includes(movie.title)}
                />
              </div>
             ))
           )}
        </div>
      </div>

      <MoviePopup 
        movie={selectedMovie} 
        isOpen={isPopupOpen} 
        onClose={handleClosePopup}
        onMovieSelect={onMovieSelect}
        isFromBooking={!!onMovieSelect}
      />

      <style jsx>{`
        .movie-grid-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1rem;
          overflow: hidden;
          transition: height 0.3s ease;
        }

        .movie-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 24px; 
          grid-template-rows: repeat(${selectedRows}, 280px);
          height: 100%;
        }
        
        .movie-item { 
          opacity: 0; 
          transform: translateY(30px);
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-font-smoothing: subpixel-antialiased;
        }
        
        @keyframes fadeInUp { 
          to { 
            opacity: 1; 
            transform: translateY(0); 
          } 
        }
        
        .no-results { 
          grid-column: 1 / -1; 
          text-align: center; 
          color: rgba(255,255,255,0.7); 
          padding: 3rem; 
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
        
        .no-results h3 { 
          margin: 0 0 1rem 0; 
          font-size: 1.5rem; 
        }
        
        @media (min-width: 1200px) { 
          .movie-grid { 
            grid-template-columns: repeat(4, 1fr); 
          }
          .movie-grid-container {
            height: ${containerHeight.desktop}px !important;
          }
          .movie-item {
            display: ${`calc(var(--index, 0) >= ${selectedRows * 4}) ? 'none' : 'block'`} !important;
          }
        }
        
        @media (max-width: 1200px) and (min-width: 769px) { 
          .movie-grid { 
            grid-template-columns: repeat(3, 1fr); 
          }
          .movie-grid-container {
            height: ${containerHeight.desktop}px !important;
          }
          .movie-item {
            display: ${`calc(var(--index, 0) >= ${selectedRows * 3}) ? 'none' : 'block'`} !important;
          }
        }
        
        @media (max-width: 768px) { 
          .movie-grid { 
            grid-template-columns: repeat(3, 1fr) !important; 
            gap: 8px; 
            grid-template-rows: repeat(${selectedRows}, 10rem);
          }
          
          .movie-grid-container {
            padding: 0 0.5rem;
            height: ${containerHeight.mobile}px !important;
          }
          
          .movie-item {
            min-width: 0;
            display: ${`calc(var(--index, 0) >= ${selectedRows * 3}) ? 'none' : 'block'`} !important;
          }
        }
        
        @media (max-width: 480px) { 
          .movie-grid { 
            grid-template-columns: repeat(3, 1fr) !important; 
            gap: 6px; 
            grid-template-rows: repeat(${selectedRows}, 10rem);
          }
          
          .movie-grid-container {
            padding: 0 0.5rem;
            height: ${containerHeight.mobile}px !important;
          }
          
          .movie-item {
            min-width: 0;
            display: ${`calc(var(--index, 0) >= ${selectedRows * 3}) ? 'none' : 'block'`} !important;
          }
        }
      `}</style>
    </>
  );
}
