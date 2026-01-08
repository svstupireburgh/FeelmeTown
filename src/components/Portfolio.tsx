import React, { useState, useEffect } from 'react';

interface GalleryImage {
  _id: string;
  imageUrl: string;
  title: string;
  description: string;
  alt: string;
  category?: string;
  isActive: boolean;
}

const Portfolio = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch gallery images from database
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        setIsLoading(true);
        console.log('📸 Portfolio: Fetching gallery images...');
        const response = await fetch('/api/gallery');
        console.log('📸 Portfolio: Response status:', response.status);
        const data = await response.json();
        console.log('📸 Portfolio: API Response:', data);
        
        if (data.success && data.images && data.images.length > 0) {
          // Filter only active images and format them (include if isActive is true or undefined)
          const activeImages = data.images
            .filter((img: GalleryImage) => img.isActive !== false)
            .map((img: GalleryImage) => ({
              _id: img._id,
              imageUrl: img.imageUrl,
              title: img.title || 'FeelMe Town Theater',
              description: img.description || 'Premium theater experience',
              alt: img.alt || img.title || 'FeelMe Town Theater',
              isActive: img.isActive !== false
            }));
          
          console.log('📸 Portfolio: Active images found:', activeImages.length);
          if (activeImages.length > 0) {
            console.log('📸 Portfolio: Setting images:', activeImages);
            setImages(activeImages);
          } else {
            console.log('📸 Portfolio: No active images found');
            setImages([]);
          }
        } else {
          console.log('📸 Portfolio: API failed or returned empty');
          setImages([]);
        }
      } catch (error) {
        console.error('📸 Portfolio: Error fetching gallery images:', error);
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="portfolio-container">
      <div className="portfolio-content">
        <div className="portfolio-text">
          <div className="portfolio-header">
            <span className="portfolio-label">PORTFOLIO</span>
            <div className="portfolio-line"></div>
            <h2 className="portfolio-title">
              <span className="crown-icon">👑</span>
              About FeelMe Town
            </h2>
          </div>
          
          <div className="portfolio-description">
            <p>
              Welcome to Feelme Town, your premier destination for unforgettable events and extraordinary parties! 
              At Feelme Town, we specialize in turning your visions into stunning realities, creating moments 
              that are cherished for a lifetime.
            </p>
            
            <p>
              With a passionate team of event planners and organizers, we offer a comprehensive range of services 
              tailored to meet your every need. From intimate gatherings to grand celebrations, corporate events 
              to private parties, we handle every aspect of event planning with meticulous attention to detail 
              and unparalleled creativity.
            </p>
            
            <div className="services-highlight">
              <h3>Our Premium Private Theatre Experience</h3>
              <p>
                Experience the ultimate in luxury entertainment with our state-of-the-art private theatres. 
                Featuring premium reclining seats, crystal-clear 4K projection, and immersive surround sound, 
                our theatres provide the perfect setting for intimate movie nights, corporate presentations, 
                or exclusive celebrations.
              </p>
            </div>
          </div>
        </div>
        
        <div className="portfolio-image">
          <div className="image-frame">
            <div className="slideshow-container">
              {isLoading ? (
                <div className="loading-placeholder">
                  <div className="loading-spinner"></div>
                  <p>Loading gallery images...</p>
                </div>
              ) : images.length > 0 ? (
                images.map((image, index) => (
                  <img 
                    key={image._id || index}
                    src={image.imageUrl} 
                    alt={image.alt}
                    className={`theatre-image ${index === currentImageIndex ? 'active' : ''}`}
                  />
                ))
              ) : (
                <div className="no-images-placeholder">
                  <p>No gallery images available</p>
                </div>
              )}
              <div className="slideshow-gradient"></div>
            </div>
            <div className="image-overlay">
              <div className="overlay-content">
                {images.map((image, index) => (
                  <div key={index} className={`overlay-text ${index === currentImageIndex ? 'active' : ''}`}>
                    <h4>{image.title}</h4>
                    <p>{image.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .portfolio-container {
          min-height: 100vh;
         
          padding: 4rem 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .portfolio-content {
          max-width: 1200px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        
        .portfolio-text {
          color: white;
        }
        
        .portfolio-header {
          margin-bottom: 2rem;
        }
        
        .portfolio-label {
          font-size: 0.9rem;
          color: #D3BBDC;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .portfolio-line {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, #D3BBDC, #EDBAFF);
          margin: 0.5rem 0 1.5rem 0;
        }
        
        .portfolio-title {
          font-size: 2.5rem;
          font-weight: bold;
          color: #D3BBDC;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .crown-icon {
          font-size: 2rem;
          color: #EDBAFF;
        }
        
        .portfolio-description p {
          font-size: 1.1rem;
          line-height: 1.8;
          margin-bottom: 1.5rem;
          color: #e0e0e0;
        }
        
        .services-highlight {
          background: rgba(211, 187, 220, 0.1);
          border: 1px solid rgba(211, 187, 220, 0.3);
          border-radius: 12px;
          padding: 2rem;
          margin-top: 2rem;
        }
        
        .services-highlight h3 {
          color: #EDBAFF;
          font-size: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        
        .services-highlight p {
          color: #f0f0f0;
          font-size: 1rem;
          line-height: 1.6;
          margin: 0;
        }
        
        .portfolio-image {
          position: relative;
        }
        
        .image-frame {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          border: 2px solid rgba(211, 187, 220, 0.3);
        }
        
        .slideshow-container {
          position: relative;
          width: 100%;
          height: 400px;
          overflow: hidden;
        }
        
        .slideshow-container::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 120px;
          background: linear-gradient(0deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.5) 80%, transparent 100%);
          backdrop-filter: blur(2px);
          mask: linear-gradient(0deg, black 0%, black 50%, rgba(0, 0, 0, 0.8) 80%, transparent 100%);
          -webkit-mask: linear-gradient(0deg, black 0%, black 50%, rgba(0, 0, 0, 0.8) 80%, transparent 100%);
          border-radius: 0 0 16px 16px;
          z-index: 1;
          pointer-events: none;
        }
        
        .theatre-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }
        
        .theatre-image.active {
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
          z-index: 3;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #D3BBDC;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .slideshow-gradient {
          position: absolute;
          top: 0;
          right: 0;
          width: 100px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.5));
          z-index: 2;
          pointer-events: none;
        }
        
        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          color: white;
          pointer-events: none;
        }
        
        .overlay-content {
          position: relative;
          z-index: 2;
        }
        
        .overlay-text {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          opacity: 0;
          transition: opacity 1s ease-in-out;
          padding: 1rem 2rem 2rem 2rem;
          border-radius: 0 0 16px 16px;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        
        .overlay-text.active {
          opacity: 1;
        }
        
        .overlay-text h4 {
          font-size: 1.3rem;
          margin-bottom: 0.5rem;
          color: #EDBAFF;
        }
        
        .overlay-text p {
          font-size: 0.9rem;
          color: #d0d0d0;
          margin: 0;
        }
        
        @media (max-width: 768px) {
          .portfolio-container {
            padding: 2rem 1rem;
          }
          
          .portfolio-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .portfolio-title {
            font-size: 2rem;
          }
          
          .portfolio-description p {
            font-size: 1rem;
          }
          
          .services-highlight {
            padding: 1.5rem;
          }
          
          .slideshow-container {
            height: 300px;
          }
        }
        
        @media (max-width: 480px) {
          .portfolio-title {
            font-size: 1.8rem;
          }
          
          .portfolio-description p {
            font-size: 0.95rem;
          }
          
          .services-highlight {
            padding: 1rem;
          }
          
          .slideshow-container {
            height: 250px;
          }
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
