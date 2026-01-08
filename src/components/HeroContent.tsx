import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GalleryImage {
  _id: string;
  imageUrl: string;
  title: string;
  description: string;
  alt: string;
  category?: string;
  isActive: boolean;
}

const HeroContent = () => {
  const router = useRouter();
  
  const handleBookingClick = () => {
    router.push('/theater');
  };
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch gallery images from database
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/gallery');
        const data = await response.json();
        
        if (data.success && data.images && data.images.length > 0) {
          // Filter only active images (if isActive field exists, otherwise include all)
          const activeImages = data.images
            .filter((img: GalleryImage) => img.isActive !== false) // Include if isActive is true or undefined
            .map((img: GalleryImage) => ({
              _id: img._id,
              imageUrl: img.imageUrl,
              title: img.title || 'FeelMe Town Theatre',
              description: img.description || 'Premium theatre experience',
              alt: img.alt || img.title || 'FeelMe Town Theatre',
              isActive: img.isActive !== false
            }));
          
          if (activeImages.length > 0) {
            setSlides(activeImages);
          } else {
            setSlides([]);
          }
        } else {
          setSlides([]);
        }
      } catch (error) {
        setSlides([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  useEffect(() => {
    if (slides.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length); // Cycle through all images
      }, 3000); // Change slide every 3 seconds

      return () => clearInterval(interval);
    }
  }, [slides.length]);
  return (
    <div className="hero-container">
              <div className="hero-content">
          <div className="icon-container">
           
          </div>
          <h1 className="hero-title">
            WELCOME TO FEELME TOWN
          </h1>
          <p className="hero-description">
            Experience premium entertainment in your private theatre — luxury redefined
          </p>
          <div className="cta-container">
            <div className="cta-glow" aria-hidden="true"></div>
            <div className="cta-darkBorderBg" aria-hidden="true"></div>
            <div className="cta-darkBorderBg" aria-hidden="true"></div>
            <div className="cta-darkBorderBg" aria-hidden="true"></div>
            <div className="cta-white" aria-hidden="true"></div>
            <div className="cta-border" aria-hidden="true"></div>
              <button className="cta-button" onClick={handleBookingClick}>
                <span>Book Your Show</span>
              </button>
          </div>
        </div>
      
      <div className="widgets-container">
        <div className="widget left-widget">
          <div className="widget-header">
            <div className="widget-logo">FT</div>
            <div className="widget-icons">
              <span>🎬</span>
              <span>⭐</span>
            </div>
          </div>
          <div className="widget-title">Theatre Gallery</div>
          <div className="theatre-slider">
            <div className="slider-container">
              {isLoading ? (
                <div className="loading-placeholder">
                  <div className="loading-spinner"></div>
                  <p>Loading gallery...</p>
                </div>
              ) : slides.length > 0 ? (
                slides.map((slide, index) => (
                  <div 
                    key={slide._id} 
                    className={`slider-image ${index === currentSlide ? 'active' : ''}`}
                  >
                    <div className="image-wrapper">
                      <img 
                        src={slide.imageUrl} 
                        alt={slide.alt}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-images-placeholder">
                  <p>No gallery images available</p>
                </div>
              )}
            </div>
            <div className="slider-dots">
              {slides.length > 0 && [0, 1, 2, 3].map((dotIndex) => {
                const imageIndex = Math.floor((dotIndex * slides.length) / 4);
                const isActive = Math.floor((currentSlide * 4) / slides.length) === dotIndex;
                return (
                  <span 
                    key={dotIndex}
                    className={`dot ${isActive ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(imageIndex)}
                  ></span>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="widget right-widget">
          <div className="metric">
            <div className="metric-header">
              <span>Shows Available</span>
              <span className="info-icon">i</span>
            </div>
            <div className="progress-bars">
              <div className="progress-bar yellow"></div>
              <div className="progress-bar green"></div>
            </div>
          </div>
          
          <div className="metric">
            <div className="metric-header">
              <span>Customer Satisfaction</span>
              <span className="info-icon">i</span>
            </div>
            <div className="progress-bars">
              <div className="progress-bar purple"></div>
              <div className="progress-bar orange"></div>
            </div>
          </div>

          <div className="metric">
            <div className="metric-header">
              <span>Premium Bookings</span>
              <span className="info-icon">i</span>
            </div>
            <div className="progress-bars">
              <div className="progress-bar blue"></div>
              <div className="progress-bar red"></div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .hero-container {
          min-height: 100vh;
          background-image: url('/bg.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          padding: 2rem;
          overflow: hidden;
        }

        .hero-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.3) 70%,
            rgba(0, 0, 0, 0.7) 85%,
            rgba(0, 0, 0, 1) 100%
          );
          z-index: 1;
        }

        .hero-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, 0.2) 80%,
            rgba(0, 0, 0, 0.5) 90%,
            rgba(0, 0, 0, 0.8) 100%
          );
          z-index: 2;
        }


        .hero-content {
          z-index: 3;
          position: relative;
          max-width: 600px;
          margin-bottom: 2rem;
         
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          margin-top: 8rem;
        }

        .icon-container {
          margin-bottom: 1rem;
        }

        .theatre-icon {
          width: 40px;
          height: 40px;
          background: #333;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .hero-title {
          font-size: 1rem;
          font-weight: bold;
          color: white;
          margin-bottom: 1rem;
          line-height: 1.1;
          white-space: nowrap;
          text-align: left;
        }

        .hero-description {
          font-size: 1.2rem;
          color: #ccc;
          margin-bottom: 2rem;
          font-weight: 300;
          text-align: left;
        }

        .cta-container {
          position: relative;
          width: 200px;
          height: 50px;
          display: inline-block;
        }

        .cta-white,
        .cta-border,
        .cta-darkBorderBg,
        .cta-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          overflow: hidden;
          border-radius: 1rem;
          pointer-events: none;
          z-index: 1;
        }

        .cta-white,
        .cta-border,
        .cta-darkBorderBg {
          width: 206px;
          height: 56px;
          filter: blur(3px);
        }

        .cta-white {
          filter: blur(2px);
          width: 199px;
          height: 49px;
        }
        .cta-white::before {
          content: "";
          position: absolute;
          inset: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(83deg);
          width: 400px;
          height: 400px;
          background-repeat: no-repeat;
          background-position: 0 0;
          filter: brightness(1.4);
          background-image: conic-gradient(
            rgba(0, 0, 0, 0) 0%,
            #a099d8,
            rgba(0, 0, 0, 0) 8%,
            rgba(0, 0, 0, 0) 50%,
            #dfa2da,
            rgba(0, 0, 0, 0) 58%
          );
          transition: transform 2s ease;
        }

        .cta-border {
          filter: blur(0.5px);
          width: 195px;
          height: 45px;
        }
        .cta-border::before {
          content: "";
          position: absolute;
          inset: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(70deg);
          width: 400px;
          height: 400px;
          filter: brightness(1.3);
          background-repeat: no-repeat;
          background-position: 0 0;
          background-image: conic-gradient(
            #1c191c,
            #402fb5 5%,
            #1c191c 14%,
            #1c191c 50%,
            #cf30aa 60%,
            #1c191c 64%
          );
          transition: transform 2s ease;
        }

        .cta-darkBorderBg {
          width: 212px;
          height: 62px;
        }
        .cta-darkBorderBg::before {
          content: "";
          position: absolute;
          inset: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(82deg);
          width: 400px;
          height: 400px;
          background-repeat: no-repeat;
          background-position: 0 0;
          background-image: conic-gradient(
            rgba(0, 0, 0, 0),
            #18116a,
            rgba(0, 0, 0, 0) 10%,
            rgba(0, 0, 0, 0) 50%,
            #6e1b60,
            rgba(0, 0, 0, 0) 60%
          );
          transition: transform 2s ease;
        }

        .cta-glow {
          width: 220px;
          height: 70px;
          filter: blur(20px);
          opacity: 0.4;
        }
        .cta-glow::before {
          content: "";
          position: absolute;
          inset: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(60deg);
          width: 600px;
          height: 600px;
          background-repeat: no-repeat;
          background-position: 0 0;
          background-image: conic-gradient(
            #000,
            #402fb5 5%,
            #000 38%,
            #000 50%,
            #cf30aa 60%,
            #000 87%
          );
          transition: transform 2s ease;
        }

        .cta-container:hover > .cta-darkBorderBg::before {
          transform: translate(-50%, -50%) rotate(262deg);
        }
        .cta-container:hover > .cta-glow::before {
          transform: translate(-50%, -50%) rotate(240deg);
        }
        .cta-container:hover > .cta-white::before {
          transform: translate(-50%, -50%) rotate(263deg);
        }
        .cta-container:hover > .cta-border::before {
          transform: translate(-50%, -50%) rotate(250deg);
        }

        .cta-button {
          background: black;
          color: #EDBAFF;
          border: none;
          padding: 12px 24px;
          border-radius: 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          z-index: 3;
          width: 200px;
          height: 50px;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(250, 217, 238, 0.3), 
            transparent);
          transition: left 0.6s ease;
          z-index: 1;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .cta-button:hover {
          background: black;
          transform: translateY(-2px);
        }

        .cta-button span {
          position: relative;
          z-index: 2;
        }

        .widgets-container {
          position: absolute;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          gap: 1rem;
          z-index: 3;
        }

        .widget {
          background: white;
          border-radius: 12px;
          padding: 1.2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          min-width: 250px;
        }

        .left-widget {
          height: 250px;
        }

        .right-widget {
          height: 250px;
        }
        

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .widget-logo {
          font-weight: bold;
          font-size: 1.2rem;
          color: #333;
        }

        .widget-icons {
          display: flex;
          gap: 0.5rem;
          color: #666;
        }

        .widget-title {
          color: #333;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .theatre-slider {
          height: 180px;
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          width: 100%;
        }

        .slider-container {
          position: relative;
          height: 100%;
          overflow: hidden;
          border-radius: 8px;
        }

        .slider-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 0.5s ease;
          overflow: hidden;
          border-radius: 8px;
          box-sizing: border-box;
        }

        .slider-image.active {
          opacity: 1;
        }
        
        .loading-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 8px;
          z-index: 3;
        }
        
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 0.5rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .image-wrapper {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 8px;
          position: relative;
        }

        .slider-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          object-position: center;
          display: block;
          max-width: 100%;
          max-height: 100%;
          overflow: hidden;
        }

        .slider-dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .slider-dots .dot {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .slider-dots .dot:hover {
          background: rgba(255, 255, 255, 0.8);
        }

        .slider-dots .dot.active {
          background: white;
          transform: scale(1.3);
        }

        .metric {
          margin-bottom: 1.5rem;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #333;
        }

        .info-icon {
          width: 16px;
          height: 16px;
          background: #ddd;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: #666;
        }

        .progress-bars {
          display: flex;
          gap: 0.3rem;
        }

        .progress-bar {
          height: 8px;
          border-radius: 4px;
        }

        .progress-bar.yellow {
          background: #ffd700;
          width: 60%;
        }

        .progress-bar.green {
          background: #32cd32;
          width: 40%;
        }

        .progress-bar.purple {
          background: #9370db;
          width: 50%;
        }

        .progress-bar.orange {
          background: #ff6b35;
          width: 50%;
        }

        .progress-bar.blue {
          background: #4169e1;
          width: 40%;
        }

        .progress-bar.red {
          background: #dc143c;
          width: 60%;
        }

        @media (min-width: 1200px) {
          .hero-content {
            max-width: 700px;
            margin-bottom: 20rem;
            margin-left: 5rem;
          }
          
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-description {
            font-size: 1.3rem;
          }
          
          .widgets-container {
            bottom: 3rem;
            right: 3rem;
          }
          
          .widget {
            min-width: 280px;
            height: 280px;
            padding: 1.5rem;
          }
          
          .left-widget {
            height: 280px;
          }

          .right-widget {
            height: 280px;
          }
          
          .theatre-slider {
            height: 180px;
          }
        }
        
        @media (min-width: 992px) and (max-width: 1199px) {
          .hero-content {
            max-width: 650px;
            margin-top: 9rem;
            margin-left: 2rem;
          }
          
          .hero-title {
            font-size: 2.2rem;
          }
          
          .hero-description {
            font-size: 1.25rem;
          }
          
          .widgets-container {
            bottom: 2.5rem;
            right: 2.5rem;
          }
          
          .widget {
            min-width: 260px;
            height: 260px;
            padding: 1.3rem;
          }
          
          .left-widget {
            height: 260px;
          }

          .right-widget {
            height: 260px;
          }
          
          .theatre-slider {
            height: 160px;
          }
        }
        
        @media (min-width: 769px) and (max-width: 991px) {
          .hero-content {
            max-width: 600px;
            margin-top: 8rem;
            margin-left: 2rem;
          }
          
          .hero-title {
            font-size: 2rem;
          }
          
          .hero-description {
            font-size: 1.1rem;
          }
          
          .widgets-container {
            bottom: 2rem;
            right: 2rem;
          }
          
          .widget {
            min-width: 240px;
            height: 240px;
            padding: 1.2rem;
          }
          
          .left-widget {
            height: 240px;
          }

          .right-widget {
            height: 240px;
          }
          
          .theatre-slider {
            height: 140px;
          }
        }
        
        @media (max-width: 768px) {
          .hero-content {
            margin-top: 3rem;
            padding: 0 1rem;
            max-width: 100%;
          }
          
          .hero-title {
            font-size: 2.5rem;
            white-space: normal;
            text-align: center;
            line-height: 1.2;
          }
          
          .hero-description {
            font-size: 1rem;
            text-align: center;
            padding: 0 1rem;
          }

          .widgets-container {
            position: relative;
            bottom: auto;
            right: auto;
            margin-top: 2rem;
            flex-direction: row;
            gap: 0.8rem;
            justify-content: center;
            align-items: center;
            width: 100%;
            display: flex;
          }
          
          .widget {
            min-width: 220px;
            height: 220px;
            padding: 0.8rem;
          }
          
          .cta-container {
            display: flex;
            justify-content: center;
            margin: 2rem auto;
            width: 180px;
            height: 45px;
          }
          
          .cta-white,
          .cta-border,
          .cta-darkBorderBg {
            width: 186px;
            height: 51px;
          }

          .cta-white {
            width: 183px;
            height: 48px;
          }
          
          .cta-border {
            width: 181px;
            height: 46px;
          }
          
          .cta-darkBorderBg {
            width: 192px;
            height: 57px;
          }
          
          .cta-glow {
            width: 200px;
            height: 65px;
          }
          
          .cta-button {
            width: 180px;
            height: 45px;
            font-size: 0.9rem;
          }
          
          .left-widget {
            height: 220px;
          }

          .right-widget {
            height: 220px;
          }
          
          
          .theatre-slider {
            height: 120px;
            overflow: hidden;
            border-radius: 8px;
          }
          
          .slider-container {
            overflow: hidden;
            border-radius: 8px;
          }
          
          .slider-image {
            overflow: hidden;
            border-radius: 8px;
            width: 100%;
            height: 100%;
          }
          
          .image-wrapper {
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: 8px;
            position: relative;
          }
          
          .slider-image img {
            width: 100% !important;
            height: 100% !important;
            overflow: hidden;
            object-fit: cover;
            object-position: center;
            max-width: 100%;
            max-height: 100%;
            display: block;
          }
          
          .metric {
            margin-bottom: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
            padding: 0 0.5rem;
          }
          
          .hero-description {
            font-size: 0.9rem;
            padding: 0 0.5rem;
          }
          
          .widgets-container {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            justify-content: center;
            width: 100%;
            display: flex;
          }
          
          .widget {
            min-width: 250px;
            width: 90%;
            max-width: 280px;
          }
          
          .cta-container {
            display: flex;
            justify-content: center;
            margin: 2rem auto;
            width: 160px;
            height: 40px;
          }
          
          .cta-white,
          .cta-border,
          .cta-darkBorderBg {
            width: 166px;
            height: 46px;
          }

          .cta-white {
            width: 163px;
            height: 43px;
          }
          
          .cta-border {
            width: 161px;
            height: 41px;
          }
          
          .cta-darkBorderBg {
            width: 172px;
            height: 52px;
          }
          
          .cta-glow {
            width: 180px;
            height: 60px;
          }
          
          .cta-button {
            width: 160px;
            height: 40px;
            font-size: 0.85rem;
          }
          
          .theatre-slider {
            height: 120px;
            overflow: hidden;
            border-radius: 8px;
          }
          
          .slider-container {
            overflow: hidden;
            border-radius: 8px;
          }
          
          .slider-image {
            overflow: hidden;
            border-radius: 8px;
            width: 100%;
            height: 100%;
          }
          
          .image-wrapper {
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: 8px;
            position: relative;
          }
          
          .slider-image img {
            width: 100% !important;
            height: 100% !important;
            overflow: hidden;
            object-fit: cover;
            object-position: center;
            max-width: 100%;
            max-height: 100%;
            display: block;
          }
        }

      `}</style>
    </div>
  );
};

export default HeroContent;
