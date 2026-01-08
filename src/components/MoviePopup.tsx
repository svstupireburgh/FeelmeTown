'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

interface MoviePopupProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onMovieSelect?: (movieTitle: string) => void;
  isFromBooking?: boolean;
}

export default function MoviePopup({ movie, isOpen, onClose, onMovieSelect, isFromBooking = false }: MoviePopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const isMovieEligible = useCallback((releaseDate?: string | null) => {
    if (!releaseDate) return true;

    const parsed = new Date(releaseDate);
    if (Number.isNaN(parsed.getTime())) return true;

    const now = new Date();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return now.getTime() - parsed.getTime() >= THIRTY_DAYS_MS;
  }, []);

  const showRestrictionNotice = useCallback(() => {
    setRestrictionMessage('This movie is not Released in platform this is only for Universal theaters');
  }, []);

  useEffect(() => {
    if (!restrictionMessage) return;

    const timer = window.setTimeout(() => setRestrictionMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [restrictionMessage]);

  const handleMovieSelect = () => {
    if (movie && onMovieSelect) {
      if (!isMovieEligible(movie.releaseDate)) {
        showRestrictionNotice();
        return;
      }
      // Ensure we pass the complete movie title
      const fullMovieTitle = movie.title || 'Unknown Movie';
      console.log('🎬 MoviePopup: Selecting movie with full title:', fullMovieTitle);
      onMovieSelect(fullMovieTitle);
      onClose();
    }
  };

  const handleBookYourShow = () => {
    if (movie) {
      if (!isMovieEligible(movie.releaseDate)) {
        showRestrictionNotice();
        return;
      }
      // Ensure we store the complete movie title
      const fullMovieTitle = movie.title || 'Unknown Movie';
      console.log('🎬 MoviePopup: Storing full movie title in sessionStorage:', fullMovieTitle);
      // Store selected movie in sessionStorage
      sessionStorage.setItem('selectedMovie', fullMovieTitle);
      console.log('🎬 MoviePopup: Redirecting to theater page with full movie title:', fullMovieTitle);
      // Close popup and redirect to theater page
      onClose();
      router.push('/theater?movie=' + encodeURIComponent(fullMovieTitle));
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !movie) return null;


  return (
    <>
    <div className="overlay" onClick={handleOverlayClick}>
      <div className="container">
        {/* Close Button */}
        <button className="close-button" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="content-grid">
          {/* Image Section */}
          <div className="image-section">
            <div className="image-container">
              <Image
                src={movie.image}
                alt={movie.title}
                fill
                className="movie-image"
                style={{ objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/bg.png'; }}
              />
              
              {/* Image Overlay */}
              <div className="image-overlay">
                <div className="badges-container">
                  {/* Rating Badge */}
                  <div className="rating-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="star-icon">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    <span>{movie.rating}</span>
                  </div>
                  
                  {/* Following Badge */}
                  {movie.isFollowing && (
                    <div className="following-badge">
                      Following Now
                    </div>
                  )}
                  
                  {/* Subscription Badge */}
                  {movie.isSubscription && (
                    <div className="subscription-badge">
                      Subscription
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="details-section">
            {/* Header */}
            <div className="header">
              <h1 className="movie-title">
                {movie.title}
              </h1>
              <div className="movie-year">
                ({movie.year})
              </div>
              {movie.genre && (
                <div className="genre-badge">
                  {movie.genre}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="description-section">
              <h3 className="description-title">
                Description
              </h3>
              <p className="description-text">
                {movie.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="buttons-container">
              {/* Select Button (for booking) or Add to List Button */}
              {isFromBooking ? (
                <button className="select-button" onClick={handleMovieSelect}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12L11 14L15 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Select Movie</span>
                </button>
              ) : (
                <button className="book-show-button" onClick={handleBookYourShow}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 11H15M9 15H15M17 21L12 16L7 21V5C7 4.46957 7.21071 3.96086 7.58579 3.58579C7.96086 3.21071 8.46957 3 9 3H15C15.5304 3 16.0391 3.21071 16.4142 3.58579C16.7893 3.96086 17 4.46957 17 5V21Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Book Your Show</span>
                </button>
              )}

              {/* Play Button */}
              <button className="play-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5V19L19 12L8 5Z" />
                </svg>
              </button>
            </div>

            {restrictionMessage && (
              <div className="restriction-message" role="alert">
                {restrictionMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    <style jsx>{`
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(20px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        opacity: ${isVisible ? 1 : 0};
        visibility: ${isVisible ? 'visible' : 'hidden'};
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
      }

      @media (max-width: 768px) {
        .overlay {
          padding: 0.25rem;
          align-items: center;
          padding-top: 1rem;
          padding-bottom: 1rem;
        }
      }

      .container {
        background: linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 50%, #2d2d2d 100%);
        border-radius: 24px;
        border: 2px solid rgba(255, 69, 69, 0.4);
        max-width: 950px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        position: relative;
        transform: ${isVisible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(30px)'};
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 
          0 25px 50px rgba(0, 0, 0, 0.9),
          0 0 100px rgba(255, 69, 69, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      @media (max-width: 768px) {
        .container {
          max-width: 100%;
          max-height: 95vh;
          border-radius: 16px;
          margin: 0 auto;
          overflow: hidden;
        }
      }

      .close-button {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(15px);
        z-index: 10;
      }

      .close-button:hover {
        background: rgba(255, 0, 0, 0.2);
        border-color: rgba(255, 0, 0, 0.5);
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
        transform: scale(1.1) rotate(90deg);
      }

      .content-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 1rem;
      }

      @media (min-width: 768px) {
        .content-grid {
          gap: 1.5rem;
          padding: 1.5rem;
        }
      }

      @media (min-width: 1024px) {
        .content-grid {
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          padding: 2.5rem;
        }
      }

      .image-section {
        position: relative;
      }

      .image-container {
        position: relative;
        width: 100%;
        height: 250px;
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.3s ease;
        border: 3px solid rgba(255, 69, 69, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      }

      @media (min-width: 768px) {
        .image-container {
          height: 300px;
        }
      }

      @media (min-width: 1024px) {
        .image-container {
          height: 450px;
        }
      }

      .image-container:hover {
        transform: translateY(-4px);
        box-shadow: 0 30px 60px rgba(255, 69, 69, 0.2);
        border-color: rgba(255, 69, 69, 0.6);
      }

      .movie-image {
        transition: transform 0.5s ease;
      }

      .movie-image:hover {
        transform: scale(1.05);
      }

      .image-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 1.5rem;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 70%, rgba(0, 0, 0, 0.8) 100%);
      }

      .badges-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: flex-start;
      }

      .rating-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        color: white;
        font-weight: bold;
        font-size: 1.125rem;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(255, 215, 0, 0.3);
        box-shadow: 0 8px 20px rgba(255, 215, 0, 0.2);
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
      }

      .star-icon {
        color: #FFD700;
        filter: drop-shadow(0 0 8px #FFD700);
      }

      .following-badge {
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        color: white;
        font-weight: 600;
        font-size: 0.875rem;
        animation: pulse 2s infinite;
        background: linear-gradient(135deg, #ff4545, #ff2c2c);
        box-shadow: 0 0 20px rgba(255, 69, 69, 0.5);
      }

      .subscription-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        font-size: 0.75rem;
        background: linear-gradient(135deg, #ff6b35, #ff8c42);
        box-shadow: 0 0 15px rgba(255, 107, 53, 0.4);
      }

      .details-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      @media (min-width: 768px) {
        .details-section {
          gap: 1.5rem;
        }
      }

      @media (min-width: 1024px) {
        .details-section {
          gap: 2rem;
        }
      }

      .header {
        text-align: left;
      }

      .movie-title {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1.1;
        margin-bottom: 0.25rem;
        background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
       
      }

      @media (min-width: 768px) {
        .movie-title {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }
      }

      @media (min-width: 1024px) {
        .movie-title {
          font-size: 2.25rem;
        }
      }

      .movie-year {
        color: rgba(255, 255, 255, 0.7);
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 0.25rem;
      }

      @media (min-width: 768px) {
        .movie-year {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
      }

      .genre-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 16px;
        font-size: 0.875rem;
        font-weight: 600;
        background: rgba(255, 69, 69, 0.2);
       
        border: 1px solid rgba(255, 69, 69, 0.4);
      }

      .description-section {
        margin-bottom: 0.5rem;
      }

      .description-title {
        font-size: 1.25rem;
        font-weight: bold;
        color: white;
        margin-bottom: 0.5rem;
        text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
      }

      @media (min-width: 768px) {
        .description-section {
          margin-bottom: 1rem;
        }

        .description-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
      }

      .description-text {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.875rem;
        line-height: 1.5;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      @media (min-width: 768px) {
        .description-text {
          font-size: 1rem;
          line-height: 1.6;
        }
      }

      @media (min-width: 1024px) {
        .description-text {
          font-size: 1.125rem;
        }
      }

      .buttons-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .play-button {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #ff4545 0%, #ff2c2c 100%);
        box-shadow: 0 10px 30px rgba(255, 69, 69, 0.4);
        border: none;
      }

      @media (min-width: 768px) {
        .play-button {
          width: 60px;
          height: 60px;
        }
      }

      .play-button:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .book-show-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        background:rgba(255, 255, 255, 0.28);
        border: none;
        border-radius: 12px;
        color: white;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        height: 50px;
        flex: 1;
        
      }

      @media (min-width: 768px) {
        .book-show-button {
          padding: 1rem 1.5rem;
          font-size: 1rem;
          height: 60px;
        }
      }

      .book-show-button:hover {
        background:rgba(255, 255, 255, 0.56);
        border-color: #ffffff;
        transform: translateY(-3px);
        
      }

      .add-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 50px;
        color: white;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.3s ease;
        width: 80%;
        height: 50px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(15px);
      }

      @media (min-width: 768px) {
        .add-button {
          padding: 1rem 1.5rem;
          font-size: 1rem;
          height: 60px;
        }
      }

      .add-button:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(255, 255, 255, 0.1);
      }

      .select-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 50px;
        color: white;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.3s ease;
        cursor: pointer;
        background: linear-gradient(135deg, #ff3366 0%, #ff1744 100%);
        border: 2px solid rgba(255, 51, 102, 0.3);
        backdrop-filter: blur(15px);
        box-shadow: 0 8px 25px rgba(255, 51, 102, 0.3);
      }

      @media (min-width: 768px) {
        .select-button {
          padding: 1rem 1.5rem;
          font-size: 1rem;
          height: 60px;
        }
      }

      .select-button:hover {
        background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%);
        border-color: rgba(255, 51, 102, 0.6);
        transform: translateY(-3px);
        box-shadow: 0 12px 35px rgba(255, 51, 102, 0.5);
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `}</style>
    </>
  );
}
