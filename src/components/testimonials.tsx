import React, { useState, useEffect, useRef, useCallback } from 'react';
import GoogleReviews from './GoogleReviews';

interface Testimonial {
  id: string;
  name: string;
  position?: string;
  image: string;
  rating: number;
  text: string;
  email?: string;
  socialHandle?: string;
  socialPlatform?: string;
  submittedAt?: string;
}

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2000, suffix = '', prefix = '' }: { 
  end: number; 
  duration?: number; 
  suffix?: string; 
  prefix?: string; 
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const startValue = 0;
    const endValue = end;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      
      // Handle decimal numbers properly
      if (end % 1 !== 0) {
        setCount(Number(currentValue.toFixed(1)));
      } else {
        setCount(Math.floor(currentValue));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <div ref={counterRef}>
      {prefix}{count}{suffix}
    </div>
  );
};

const TestimonialPage = () => {
  const ballRef = useRef<HTMLDivElement>(null);
  const animationFrame = useRef<number | null>(null);
  const targetPosition = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: 0, y: 0 });
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);
  const [isLoadingGoogleReviews, setIsLoadingGoogleReviews] = useState(true);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const lastTestimonialsSignatureRef = useRef<string>('');

  // Fetch testimonials from database
  useEffect(() => {
    const fetchTestimonials = async (opts?: { showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) {
          setIsLoading(true);
        }
        console.log('📝 Fetching testimonials from database...');
        
        const response = await fetch('/api/feedback', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success && Array.isArray(data.feedback) && data.feedback.length > 0) {
          const transformedTestimonials: Testimonial[] = data.feedback.map((feedback: any) => ({
            id: feedback.feedbackId || feedback._id || feedback.mongoId || Date.now().toString(),
            name: feedback.name || 'Anonymous',
            position: feedback.socialPlatform
              ? `${String(feedback.socialPlatform).charAt(0).toUpperCase() + String(feedback.socialPlatform).slice(1)} User`
              : 'FeelME Town Customer',
            image: feedback.avatar || '/images/Avatars/FMT.svg',
            rating: feedback.rating || 5,
            text: feedback.message || '',
            email: feedback.email,
            socialHandle: feedback.socialHandle,
            socialPlatform: feedback.socialPlatform,
            submittedAt: feedback.submittedAt
          }));

          const signature = transformedTestimonials.map((t) => t.id).join('|');
          if (signature !== lastTestimonialsSignatureRef.current) {
            lastTestimonialsSignatureRef.current = signature;
            setTestimonials(transformedTestimonials);
          }
          
          console.log(`✅ Loaded ${transformedTestimonials.length} testimonials from database`);
        } else {
          console.warn('⚠️ No testimonials found in database');
          setTestimonials([]);
          setError('No testimonials available in database');
        }
      } catch (error) {
        console.error('❌ Error fetching testimonials:', error);
        setError('Failed to load testimonials');
        
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials({ showLoading: true });
    const interval = setInterval(() => {
      fetchTestimonials({ showLoading: false });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch Google Maps Reviews
  useEffect(() => {
    const fetchGoogleReviews = async () => {
      try {
        setIsLoadingGoogleReviews(true);
        console.log('🗺️ Fetching Google Maps reviews...');
        
        

      

      } catch (error) {
        console.error('❌ Error fetching Google reviews:', error);
        setIsLoadingGoogleReviews(false);
      }
    };

    fetchGoogleReviews();
  }, []);

  // Auto-rotate Google Reviews every 4 seconds
  useEffect(() => {
    if (googleReviews.length > 1) {
      const interval = setInterval(() => {
        setCurrentReviewIndex((prevIndex) => 
          (prevIndex + 1) % googleReviews.length
        );
      }, 4000); // Change every 4 seconds

      return () => clearInterval(interval);
    }
  }, [googleReviews.length]);

  

  // Triple testimonials for better infinite scroll effect
  const extendedTestimonials = [...testimonials, ...testimonials, ...testimonials];

  // Smooth mouse tracking with lerp (linear interpolation)
  const lerp = (start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
  };

  const updateBallPosition = useCallback(() => {
    const lerpFactor = 0.1;
    
    currentPosition.current.x = lerp(currentPosition.current.x, targetPosition.current.x, lerpFactor);
    currentPosition.current.y = lerp(currentPosition.current.y, targetPosition.current.y, lerpFactor);

    if (ballRef.current) {
      ballRef.current.style.transform = `translate(${currentPosition.current.x - 15}px, ${currentPosition.current.y - 15}px)`;
    }

    animationFrame.current = requestAnimationFrame(updateBallPosition);
  }, []);

  // Mouse tracking effect for CTA section
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPosition.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Start the animation loop
    updateBallPosition();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [updateBallPosition]);

  const ContactPopup = () => (
    <div style={styles.contactPopupOverlay} onClick={() => setShowContactPopup(false)}>
      <div style={styles.contactPopup} onClick={(e) => e.stopPropagation()}>
        <div style={styles.contactPopupHeader}>
          <h3 style={styles.contactPopupTitle}>Contact FeelMe Town</h3>
          <button 
            className="close-button"
            style={styles.closeButton}
            onClick={() => setShowContactPopup(false)}
          >
            ×
          </button>
        </div>
        
        <div style={styles.contactButtons}>
          <a 
            href="tel:+918700671099" 
            className="contact-button call-button"
            style={styles.contactButton}
            onClick={() => setShowContactPopup(false)}
          >
            <div style={styles.contactIcon}>
              <svg 
                style={{
                  animation: 'phoneShake 1.5s ease-in-out infinite',
                  transformOrigin: 'center'
                }}
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 14 14" 
                fill="none"
              >
                <path d="M11.2188 14C10.6087 14 9.75188 13.7794 8.46875 13.0625C6.90844 12.1875 5.70156 11.3797 4.14969 9.83189C2.65344 8.33658 1.92531 7.36845 0.90625 5.51408C-0.245 3.42033 -0.0487499 2.32283 0.170625 1.85377C0.431875 1.29314 0.8175 0.957828 1.31594 0.625015C1.59905 0.439526 1.89865 0.280521 2.21094 0.150015C2.24219 0.136578 2.27125 0.123765 2.29719 0.112203C2.45188 0.0425152 2.68625 -0.0627973 2.98313 0.0497027C3.18125 0.124078 3.35813 0.276265 3.635 0.549703C4.20281 1.1097 4.97875 2.35689 5.265 2.96939C5.45719 3.3822 5.58438 3.6547 5.58469 3.96033C5.58469 4.31814 5.40469 4.59408 5.18625 4.89189C5.14531 4.94783 5.10469 5.00127 5.06531 5.05314C4.8275 5.36564 4.77531 5.45595 4.80969 5.6172C4.87938 5.94127 5.39906 6.90595 6.25313 7.75814C7.10719 8.61033 8.04406 9.0972 8.36938 9.16658C8.5375 9.20251 8.62969 9.14814 8.95219 8.90189C8.99844 8.86658 9.04594 8.83002 9.09562 8.79345C9.42875 8.54564 9.69188 8.37033 10.0413 8.37033H10.0431C10.3472 8.37033 10.6075 8.5022 11.0387 8.7197C11.6012 9.00345 12.8859 9.76939 13.4494 10.3378C13.7234 10.6141 13.8762 10.7903 13.9509 10.9881C14.0634 11.286 13.9575 11.5194 13.8884 11.6756C13.8769 11.7016 13.8641 11.73 13.8506 11.7616C13.7191 12.0733 13.5591 12.3723 13.3728 12.6547C13.0406 13.1516 12.7041 13.5363 12.1422 13.7978C11.8537 13.9343 11.5379 14.0035 11.2188 14Z" fill="white"/>
              </svg>
            </div>
            <div style={styles.contactText}>
              <div style={styles.contactLabel}>Call Us</div>
            </div>
          </a>
          
          <a 
            href="https://wa.me/+918700671099" 
            target="_blank" 
            rel="noopener noreferrer"
            className="contact-button"
            style={styles.contactButton}
            onClick={() => setShowContactPopup(false)}
          >
            <div style={styles.contactIcon}>
              <svg 
                style={{
                  animation: 'phoneShake 1.5s ease-in-out infinite',
                  transformOrigin: 'center'
                }}
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 128 129" 
                fill="none"
              >
                <g clipPath="url(#clip0_34_4)">
                  <path d="M2.7315 63.728C2.7285 74.5665 5.5605 85.1495 10.9455 94.4775L2.2165 126.349L34.8325 117.797C43.8537 122.707 53.9612 125.281 64.2325 125.282H64.2595C98.167 125.282 125.768 97.69 125.783 63.7765C125.789 47.343 119.396 31.89 107.779 20.264C96.1635 8.63901 80.716 2.23351 64.257 2.22601C30.3455 2.22601 2.746 29.816 2.732 63.728" fill="url(#paint0_linear_34_4)"/>
                  <path d="M0.535 63.708C0.5315 74.9365 3.465 85.898 9.042 95.56L0 128.574L33.7855 119.715C43.0945 124.79 53.5755 127.466 64.2405 127.47H64.268C99.392 127.47 127.985 98.8865 128 63.759C128.006 46.735 121.382 30.7265 109.35 18.684C97.3165 6.643 81.3165 0.007 64.268 0C29.138 0 0.549 28.58 0.535 63.708ZM20.6555 93.896L19.394 91.8935C14.091 83.4615 11.292 73.7175 11.296 63.712C11.307 34.5145 35.069 10.76 64.288 10.76C78.438 10.766 91.736 16.282 101.738 26.29C111.739 36.299 117.243 49.604 117.24 63.755C117.227 92.9525 93.464 116.71 64.268 116.71H64.247C54.7405 116.705 45.417 114.152 37.286 109.327L35.351 108.18L15.302 113.437L20.6555 93.896Z" fill="url(#paint1_linear_34_4)"/>
                  <path d="M48.339 37.074C47.146 34.4225 45.8905 34.369 44.756 34.3225C43.827 34.2825 42.765 34.2855 41.704 34.2855C40.642 34.2855 38.9165 34.685 37.458 36.2775C35.998 37.8715 31.884 41.7235 31.884 49.558C31.884 57.3925 37.5905 64.9645 38.386 66.028C39.1825 67.0895 49.4025 83.6815 65.5885 90.0645C79.0405 95.369 81.778 94.314 84.6975 94.048C87.6175 93.783 94.1195 90.197 95.446 86.4785C96.7735 82.7605 96.7735 79.5735 96.3755 78.9075C95.9775 78.244 94.9155 77.8455 93.323 77.0495C91.7305 76.2535 83.901 72.4005 82.4415 71.869C80.9815 71.338 79.92 71.073 78.858 72.6675C77.796 74.2595 74.7465 77.8455 73.817 78.9075C72.8885 79.972 71.959 80.1045 70.367 79.308C68.7735 78.509 63.645 76.8295 57.5605 71.405C52.8265 67.184 49.6305 61.9715 48.7015 60.377C47.7725 58.785 48.602 57.922 49.4005 57.1285C50.116 56.415 50.9935 55.269 51.7905 54.3395C52.5845 53.4095 52.8495 52.746 53.3805 51.684C53.912 50.621 53.646 49.691 53.2485 48.8945C52.8495 48.098 49.755 40.2225 48.339 37.074Z" fill="white"/>
                </g>
                <defs>
                  <linearGradient id="paint0_linear_34_4" x1="6180.54" y1="12414.5" x2="6180.54" y2="2.22601" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1FAF38"/>
                    <stop offset="1" stopColor="#60D669"/>
                  </linearGradient>
                  <linearGradient id="paint1_linear_34_4" x1="6400" y1="12857.4" x2="6400" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F9F9F9"/>
                    <stop offset="1" stopColor="white"/>
                  </linearGradient>
                  <clipPath id="clip0_34_4">
                    <rect width="128" height="129" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div style={styles.contactText}>
              <div style={styles.contactLabel}>WhatsApp</div>
              <div style={styles.contactSubtext}>Chat with us</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );

  const TestimonialCard = ({ testimonial, index }: { testimonial: Testimonial, index: number }) => (
    <div style={styles.testimonialCard} key={`card-${index}`}>
      <div style={styles.cardHeader}>
        <img
          src={testimonial.image}
          alt={testimonial.name}
          style={styles.profileImage}
        />
        <div style={styles.userInfo}>
          <h3 style={styles.userName}>{testimonial.name}</h3>
          <p style={styles.userPosition}>{testimonial.position}</p>
        </div>
        <div style={styles.quoteIcon}>&quot;</div>
      </div>
      
      <div style={styles.starsContainer}>
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            style={{
              ...styles.star,
              color: i < testimonial.rating ? '#FFD700' : '#666'
            }}
          >
            ★
          </span>
        ))}
      </div>
      
      <p style={styles.testimonialText}>{testimonial.text}</p>
    </div>
  );

  const GoogleReviewCard = ({ review, index }: { review: any, index: number }) => (
    <div style={styles.googleReviewCard}>
      {/* Google Reviews Header - Fixed */}
      <div style={styles.googleCardTopHeader}>
        <div style={styles.googleLogoContainer}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
        <span style={styles.googleReviewsHeaderText}>Google Reviews</span>
      </div>

      {/* Main Content Area - Animated */}
      <div style={styles.googleMainContent} key={`content-${review.id}`}>
        {/* Customer Name - Animated */}
        <h3 style={styles.googleCustomerName} key={`name-${review.id}`}>
          {review.author_name}
        </h3>
        
        {/* Review Message - Animated */}
        <p style={styles.googleReviewMessage} key={`message-${review.id}`}>
          {review.text}
        </p>
      </div>

      {/* Rating Section - Animated */}
      <div style={styles.googleRatingSection} key={`rating-${review.id}`}>
        <div style={styles.googleStarsContainer}>
          {[...Array(5)].map((_, i) => (
            <span
              key={`star-${review.id}-${i}`}
              style={{
                ...styles.googleStar,
                color: i < review.rating ? '#FFD700' : '#E0E0E0',
                animationDelay: `${i * 0.1}s`
              }}
            >
              ★
            </span>
          ))}
        </div>
        <span style={styles.googleRatingText}>Rating</span>
      </div>
    </div>
  );

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
        
        @keyframes scrollRTL {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scrollLTR {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        .contact-button:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3) !important;
        }
        
        .close-button:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          transform: scale(1.1) !important;
        }
        
        @keyframes phoneShake {
          0% { transform: rotate(0deg) scale(1); }
          10% { transform: rotate(-10deg) scale(1.1); }
          20% { transform: rotate(10deg) scale(1.1); }
          30% { transform: rotate(-10deg) scale(1.1); }
          40% { transform: rotate(10deg) scale(1.1); }
          50% { transform: rotate(-5deg) scale(1.05); }
          60% { transform: rotate(5deg) scale(1.05); }
          70% { transform: rotate(-3deg) scale(1.02); }
          80% { transform: rotate(3deg) scale(1.02); }
          90% { transform: rotate(-1deg) scale(1.01); }
          100% { transform: rotate(0deg) scale(1); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          0% { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes slideInContent {
          0% { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes slideInFromLeft {
          0% { 
            opacity: 0; 
            transform: translateX(-50px); 
          }
          100% { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        @keyframes slideInFromRight {
          0% { 
            opacity: 0; 
            transform: translateX(50px); 
          }
          100% { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        @keyframes slideInFromBottom {
          0% { 
            opacity: 0; 
            transform: translateY(40px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes starPop {
          0% { 
            transform: scale(0) rotate(0deg); 
            opacity: 0; 
          }
          50% { 
            transform: scale(1.2) rotate(180deg); 
            opacity: 1; 
          }
          100% { 
            transform: scale(1) rotate(360deg); 
            opacity: 1; 
          }
        }

        .scrollRow:hover .scrollRowRTL,
        .scrollRow:hover .scrollRowLTR {
          animation-play-state: paused !important;
        }
        
        .call-icon {
          animation: phoneShake 1.5s ease-in-out infinite !important;
          transform-origin: center !important;
        }
        
        .call-icon-container {
          animation: phoneShake 1.5s ease-in-out infinite !important;
          transform-origin: center !important;
        }

        @media (max-width: 768px) {
          .googleReviewsHeader {
            flex-direction: column !important;
            text-align: center !important;
          }
          
          .googleReviewsGrid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          
          .googleReviewCard {
            padding: 1.5rem !important;
          }
          
          .googleTitle {
            font-size: 2rem !important;
          }
        }
      `}</style>
      <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          Customer <span style={styles.titleAccent}>Reviews</span>
        </h1>
        <p style={styles.subtitle}>
          Hear our customers' real experiences and find out why FeelMe Town delivers the best movie experience.
        </p>
        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>
              <AnimatedCounter end={1000} suffix="+" duration={2500} />
            </div>
            <div style={styles.statLabel}>Happy Customers</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>
              <AnimatedCounter end={4.8} suffix="/5" duration={2000} />
            </div>
            <div style={styles.statLabel}>Average Rating</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>
              <AnimatedCounter end={98} suffix="%" duration={2200} />
            </div>
            <div style={styles.statLabel}>Satisfaction Rate</div>
          </div>
        </div>
      </div>

      {/* Infinite Scroll Testimonials */}
      <div style={styles.testimonialsContainer}>
        {isLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Loading testimonials from database...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>⚠️ {error}</p>
            <p style={styles.errorSubtext}>Showing fallback testimonials</p>
          </div>
        ) : (
          <>
            {/* Top Row - Right to Left */}
            <div style={styles.scrollRow}>
              <div style={{
                ...styles.scrollRowRTL,
                width: `${extendedTestimonials.length * 22}rem`,
              }}>
                {extendedTestimonials.map((testimonial, index) => (
                  <TestimonialCard key={`top-${index}`} testimonial={testimonial} index={index} />
                ))}
              </div>
            </div>

            {/* Bottom Row - Left to Right */}
            <div style={styles.scrollRow}>
              <div style={{
                ...styles.scrollRowLTR,
                width: `${extendedTestimonials.length * 22}rem`,
              }}>
                {[...extendedTestimonials].reverse().map((testimonial, index) => (
                  <TestimonialCard key={`bottom-${index}`} testimonial={testimonial} index={index} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
     
      
      {/* <div style={styles.ctaSection}>
       
        <div style={styles.ctaSectionShimmer}></div>
        
        
        <div 
          ref={ballRef}
          style={styles.redBall}
        ></div>
        
        <h2 style={styles.ctaTitle}>Ready to Experience FeelMe Town?</h2>
        <p style={styles.ctaSubtitle}>
        You too can enjoy our amazing movie experience. Book your tickets today!
        </p>
        <div style={styles.ctaButtons}>
          <a href="/theater" style={{ textDecoration: 'none' }}>
            <button style={styles.primaryButton}>
              Book Tickets Now
            </button>
          </a>
          <button 
            style={styles.secondaryButton}
            onClick={() => setShowContactPopup(true)}
          >
            Contact Us
          </button>
        </div>
      </div> */}

      
      {showContactPopup && <ContactPopup />}

    </div>
    </>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#000000',
    color: '#ffffff',
    fontFamily: "'Arial', sans-serif",
  },
  header: {
    textAlign: 'center' as const,
    padding: '4rem 1rem',
  },
  title: {
    fontSize: '3rem',
    fontWeight: '700',
    fontFamily: "'Arial', sans-serif",
    color: '#ffffff',
    margin: '0 0 1rem 0',
  },
  titleAccent: {
    color: '#ED2024',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: 'rgba(255, 255, 255, 0.8)',
    maxWidth: '48rem',
    margin: '0 auto 2rem auto',
    lineHeight: '1.6',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '2rem',
    marginTop: '2rem',
    flexWrap: 'wrap' as const,
  },
  statItem: {
    textAlign: 'center' as const,
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#ED2024',
    margin: '0 0 0.5rem 0',
  },
  statLabel: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  testimonialsContainer: {
    position: 'relative' as const,
    overflow: 'hidden',
    padding: '0rem 0',
  },
  scrollRow: {
    marginBottom: '2rem',
    overflow: 'hidden',
  },
  scrollRowRTL: {
    display: 'flex',
    animation: 'scrollRTL 30s linear infinite',
    gap: '1rem',
    transition: 'animation-play-state 0.3s ease',
  },
  scrollRowLTR: {
    display: 'flex',
    animation: 'scrollLTR 30s linear infinite',
    gap: '1rem',
    transition: 'animation-play-state 0.3s ease',
  },
  testimonialCard: {
    flexShrink: 0,
    width: '20rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    marginRight: '1rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  profileImage: {
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginRight: '1rem',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 0.25rem 0',
  },
  userPosition: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0',
  },
  quoteIcon: {
    fontSize: '2rem',
    color: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 'auto',
  },
  starsContainer: {
    display: 'flex',
    marginBottom: '0.75rem',
  },
  star: {
    fontSize: '1rem',
    marginRight: '0.25rem',
  },
  testimonialText: {
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: '1.6',
    margin: '0',
    fontSize: '0.9rem',
  },
  ctaSection: {
    textAlign: 'center' as const,
    padding: '4rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(2px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    margin: '2rem',
    position: 'relative' as const,
    overflow: 'hidden',
    color: '#ffffff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  ctaSectionShimmer: {
    position: 'absolute' as const,
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    animation: 'shimmer 3s infinite',
  },
  redBall: {
    position: 'fixed' as const,
    width: '30px',
    height: '30px',
    background: 'radial-gradient(circle, #ff0000, #cc0000)',
    borderRadius: '50%',
    pointerEvents: 'none' as const,
    zIndex: 1,
    boxShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)',
    filter: 'blur(1px)',
    willChange: 'transform',
  },
  ctaTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    fontFamily: "'Arial', sans-serif",
    margin: '0 0 1rem 0',
    position: 'relative' as const,
    zIndex: 3,
  },
  ctaSubtitle: {
    fontSize: '1.25rem',
    margin: '0 0 2rem 0',
    opacity: 0.9,
    position: 'relative' as const,
    zIndex: 3,
  },
  ctaButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    position: 'relative' as const,
    zIndex: 3,
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    background: '#ffffff',
    color: '#ED2024',
    padding: '0.75rem 2rem',
    borderRadius: '2rem',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#ffffff',
    padding: '0.75rem 2rem',
    borderRadius: '2rem',
    border: '2px solid #ffffff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  contactPopupOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(5px)',
  },
  contactPopup: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    padding: '2rem',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    position: 'relative' as const,
  },
  contactPopupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  contactPopupTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    fontFamily: "'Arial', sans-serif",
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '2rem',
    cursor: 'pointer',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
  contactButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  contactButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#ffffff',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  contactIcon: {
    fontSize: '2rem',
    marginRight: '1rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  contactSubtext: {
    fontSize: '0.9rem',
    opacity: 0.8,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center' as const,
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #ED2024',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    fontSize: '1.2rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: '0',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center' as const,
  },
  errorText: {
    fontSize: '1.2rem',
    color: '#ff6b6b',
    margin: '0 0 0.5rem 0',
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0',
  },
  // Google Reviews Styles
  googleReviewsSection: {
    padding: '4rem 2rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  googleReviewsImageContainer: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    opacity: 0.08,
    pointerEvents: 'none' as const,
  },
  googleReviewsBackgroundImage: {
    width: '500px',
    height: 'auto',
    objectFit: 'contain' as const,
    filter: 'grayscale(20%)',
  },
  googleReviewsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3rem',
    flexWrap: 'wrap' as const,
    gap: '2rem',
    position: 'relative' as const,
    zIndex: 1,
  },
  googleMapsLogo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  googleReviewsTitle: {
    flex: 1,
    textAlign: 'center' as const,
  },
  googleTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
    fontFamily: "'Arial', sans-serif",
  },
  googleSubtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: '0',
  },
  googleRating: {
    textAlign: 'center' as const,
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  googleRatingNumber: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#4285F4',
    margin: '0 0 0.5rem 0',
  },
  googleStarsDisplay: {
    marginBottom: '0.5rem',
  },
  googleReviewCount: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  googleReviewsContainer: {
    position: 'relative' as const,
    zIndex: 1,
  },
  googleLoadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    textAlign: 'center' as const,
  },
  googleReviewsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  googleReviewCard: {
    background: '#2D2D2D',
    borderRadius: '25px',
    padding: '0',
    border: 'none',
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
    width: '500px',
    height: '450px',
  },
  googleCardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  googleProfileImage: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginRight: '1rem',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },
  googleUserInfo: {
    flex: 1,
  },
  googleUserName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 0.25rem 0',
  },
  googleReviewTime: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: '0',
  },
  googleIcon: {
    marginLeft: 'auto',
  },
  googleStarsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.25rem',
    marginBottom: '0',
  },
  googleStar: {
    fontSize: '2rem',
    marginRight: '0',
    animation: 'starPop 0.3s ease-out forwards',
    transform: 'scale(0)',
  },
  googleReviewText: {
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: '1.6',
    margin: '0 0 1rem 0',
    fontSize: '0.95rem',
    borderRadius: '25px',
    
  },
  googleReviewFooter: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  googleReviewSource: {
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  // New Google Card Layout Styles
  googleCardTopHeader: {
    background: '#2D2D2D',
    padding: '1.5rem 2rem',
    borderTopLeftRadius: '25px',
    borderTopRightRadius: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  googleLogoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleReviewsHeaderText: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0',
  },
  googleMainContent: {
    background: '#ffffff',
    padding: '3rem 2rem',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    textAlign: 'center' as const,
    animation: 'slideInContent 0.6s ease-out',
  },
  googleCustomerName: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#333333',
    margin: '0 0 1.5rem 0',
    textAlign: 'center' as const,
    animation: 'slideInFromLeft 0.5s ease-out',
  },
  googleReviewMessage: {
    fontSize: '1.2rem',
    color: '#666666',
    lineHeight: '1.7',
    margin: '0',
    textAlign: 'center' as const,
    animation: 'slideInFromRight 0.7s ease-out',
  },
  googleRatingSection: {
    background: '#2D2D2D',
    padding: '2rem',
    borderBottomLeftRadius: '25px',
    borderBottomRightRadius: '25px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'slideInFromBottom 0.8s ease-out',
  },
  googleRatingText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0',
  },
  // Single Card Container Styles
  singleCardContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    maxWidth: '550px',
    margin: '0 auto',
    gap: '2.5rem',
  },
  reviewDots: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.75rem',
  },
  reviewDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
};

export default TestimonialPage;