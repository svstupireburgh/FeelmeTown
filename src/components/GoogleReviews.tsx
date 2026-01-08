'use client';

import React, { useState, useEffect } from 'react';

// TypeScript interfaces
interface Review {
  id: number;
  name: string;
  photo: string;
  rating: number;
  message: string;
  time?: string;
}

const GoogleReviews = () => {
  // State for Google Maps reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSource, setReviewSource] = useState<'google' | 'database'>('google');

  const [lastSignature, setLastSignature] = useState<string>('');

  // Fetch reviews (Database only - Google disabled)
  const fetchGoogleReviews = async () => {
    try {
      setLoading(true);
      
      // Google Maps API disabled - directly fetch database testimonials
      console.log('Google Maps API disabled - fetching database testimonials');
      await fetchDatabaseTestimonials();
      
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError((err as Error).message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch database testimonials as fallback
  const fetchDatabaseTestimonials = async () => {
    try {
      console.log('🗺️ Fetching Google Reviews from feedback database...');
      const response = await fetch('/api/feedback', { cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.feedback && data.feedback.length > 0) {
          const signature = data.feedback
            .map((t: any) => t.feedbackId || t._id || t.mongoId || '')
            .filter((id: string) => id)
            .join('|');

          if (signature === lastSignature) {
            return;
          }

          const formattedTestimonials = data.feedback.map((testimonial: any, index: number) => ({
            id: index + 1,
            name: testimonial.name || 'Anonymous',
            photo: testimonial.avatar || '/images/Avatars/FMT.svg', // Use avatar
            rating: testimonial.rating || 5,
            message: testimonial.message || testimonial.feedback || '',
            time: testimonial.socialPlatform
              ? `${String(testimonial.socialPlatform).charAt(0).toUpperCase() + String(testimonial.socialPlatform).slice(1)} User`
              : 'FeelME Town Customer'
          }));
          
          setReviews(formattedTestimonials);
          setLastSignature(signature);
          setReviewSource('google'); // Show as Google Reviews
          console.log(`✅ Loaded ${formattedTestimonials.length} Google Reviews from feedback database`);
        } else {
          console.warn('⚠️ No testimonials found in database');
          setReviews([]);
          setError('No reviews available in database');
        }
      } else {
        throw new Error('Failed to fetch testimonials from database');
      }
    } catch (dbErr) {
      console.error('❌ Error fetching Google Reviews from database:', dbErr);
      setError('Failed to load reviews from database');
      setReviews([]);
    }
  };

  // Fetch reviews on component mount
  useEffect(() => {
    fetchGoogleReviews();

    const interval = setInterval(() => {
      fetchDatabaseTestimonials();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // State for current review
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const currentReview = reviews[currentReviewIndex];

  // Auto-change reviews every 2 seconds
  useEffect(() => {
    if (reviews.length === 0) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
        setIsAnimating(false);
      }, 300); // Animation duration
      
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, [reviews.length]);

  // Navigation functions (if needed)
  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  return (
    <>
      <style jsx>{`
        @keyframes fadeInScale {
          0% { 
            opacity: 0; 
            transform: scale(0.8) translateY(30px); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }

        

        @media (max-width: 768px) {
          .google-image {
            width: 100vw !important;
            height: 100vh !important;
          }
        }

        @media (max-width: 480px) {
          .google-image {
            width: 100rem !important;
            
          }
        }

        .nav-button:hover {
          background: rgba(237, 32, 36, 0.9) !important;
          border-color: #ED2024 !important;
          transform: scale(1.1) !important;
          box-shadow: 0 4px 12px rgba(237, 32, 36, 0.4) !important;
        }

        .nav-button:active {
          transform: scale(0.95) !important;
        }

        .three-dots:hover {
          background-color: rgba(0, 0, 0, 0.1) !important;
        }

        @keyframes slideInCard {
          0% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.8); 
          }
          100% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
          }
        }

        @keyframes slideRightToLeft {
          0% { 
            transform: translate(50%, -50%);
          }
          100% { 
            transform: translate(-150%, -50%);
          }
        }

        @keyframes fadeContent {
          0% { 
            opacity: 1;
            transform: translateY(0);
          }
          50% { 
            opacity: 0;
            transform: translateY(-10px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .content-animate {
          animation: fadeContent 0.6s ease-in-out;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Google Reviews Section - Only Image */}
      <div style={styles.googleReviewsSection}>
        <div style={styles.mainImageContainer}>
          <img 
            src="/googlereview.svg" 
            alt="Google Reviews" 
            className="google-image"
            style={styles.mainGoogleImage}
          />
          
          {/* Center Review Card */}
          {loading ? (
            <div style={styles.centerCard}>
              <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <p style={styles.loadingText}>
                  Loading Google Reviews...
                </p>
              </div>
            </div>
          ) : currentReview ? (
            <div style={styles.centerCard} key={currentReview.id}>
              <div 
                className={isAnimating ? 'content-animate' : ''} 
                style={styles.reviewerInfo}
              >
                {/* Profile Photo and Name with Stars */}
                <div style={styles.photoNameRow}>
                  <img 
                    src={currentReview.photo} 
                    alt={currentReview.name} 
                    style={styles.profilePhoto}
                  />
                  <div style={styles.nameStarsContainer}>
                    <h3 style={styles.reviewerName}>{currentReview.name}</h3>
                    {/* Rating Stars directly below name */}
                    <div style={styles.ratingContainer}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{...styles.star, color: i < currentReview.rating ? '#FFD700' : '#E0E0E0'}}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Review Message */}
                <p style={styles.reviewMessage}>
                  {currentReview.message}
                </p>
                
                {/* Review Source Indicator */}
                <div style={styles.sourceIndicator}>
                  <span style={styles.sourceText}>
                    📍 Google Reviews
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.centerCard}>
              <div style={styles.errorContainer}>
                <p style={styles.errorText}>No reviews available</p>
              </div>
            </div>
          )}

          
        </div>
      </div>
    </>
  );
};

const styles = {
  googleReviewsSection: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    paddingLeft: '5rem',
    paddingRight: '5rem',
    overflow: 'hidden',
  },
  mainImageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
  },
  mainGoogleImage: {
    width: '100vw',
    height: '100vh',
    objectFit: 'contain' as const,
    animation: 'fadeInScale 1.2s ease-out',
    transition: 'transform 0.3s ease',
   
  },
  navigationContainer: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '200px',
    pointerEvents: 'none' as const,
  },
  navButton: {
    position: 'absolute' as const,
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    pointerEvents: 'auto' as const,
    outline: 'none',
  },
  topButton: {
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  leftButton: {
    top: '50%',
    left: '0',
    transform: 'translateY(-50%)',
  },
  rightButton: {
    top: '50%',
    right: '0',
    transform: 'translateY(-50%)',
  },
  bottomButton: {
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  // Center Review Card Styles
  centerCard: {
    position: 'absolute' as const,
    top: '51%',
    left: '50.1%',
    transform: 'translate(-50%, -50%)',
    width: '20rem',
    height: '14rem',
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    animation: 'slideInCard 1s ease-out',
  },
  reviewerInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '0.75rem',
    width: '100%',
  },
  photoNameRow: {
    display: 'flex',
    alignItems: 'flex-start',
    
    width: '100%',
    gap: '0.75rem',
  },
  nameStarsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  profilePhoto: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    
  },
  reviewerName: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#333333',
    margin: '0',
  },
  ratingContainer: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '0',
  },
  star: {
    fontSize: '1rem',
  },
  reviewMessage: {
    fontSize: '0.9rem',
    color: '#666666',
    lineHeight: '1.4',
    margin: '0',
    textAlign: 'center' as const,
  },
  // Three Dots Menu Styles
  threeDots: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease',
  },
  dot: {
    fontSize: '1rem',
    color: '#999999',
    lineHeight: '0.3',
    fontWeight: 'bold',
  },
  // Loading and Error Styles
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #ED2024',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '1rem',
    color: '#666666',
    margin: '0',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: '1rem',
    color: '#999999',
    margin: '0',
  },
  // Source Indicator Styles
  sourceIndicator: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '0.5rem',
  },
  sourceText: {
    fontSize: '0.8rem',
    color: '#888888',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontWeight: '500',
  },
};

export default GoogleReviews;