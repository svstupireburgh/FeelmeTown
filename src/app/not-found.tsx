'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Remove any existing navbar and footer elements
    const navbar = document.querySelector('nav') as HTMLElement;
    const footer = document.querySelector('footer') as HTMLElement;
    const floatingNav = document.querySelector('.floating-navigation') as HTMLElement;
    
    if (navbar) navbar.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (floatingNav) floatingNav.style.display = 'none';

    // Add keyboard event listener for Esc key
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.back();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup function to restore elements and remove event listener
    return () => {
      if (navbar) navbar.style.display = '';
      if (footer) footer.style.display = '';
      if (floatingNav) floatingNav.style.display = '';
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [router]);

  return (
    <div className="not-found-container">
      {/* Escape Button */}
      <button 
        onClick={() => router.back()}
        className="escape-button"
        title="Escape - Go Back"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        ESCAPE
      </button>

      {/* Video Background */}
      <div className="video-container">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="background-video"
        >
          <source src="https://res.cloudinary.com/dr8razrcd/video/upload/v1758910891/Video_Mein_Se_Navbar_Hatana_qqivww.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Video Overlay */}
        <div className="video-overlay"></div>
      </div>

      {/* Animated Text - Bottom Center */}
      <div className="animated-text-bottom">
        <p>Press Escape Button to return page</p>
      </div>

      

      <style jsx>{`
        .not-found-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Paralucent-Medium', 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          overflow: hidden;
          z-index: 1;
        }

        .escape-button {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 10;
          background: rgba(255, 0, 0, 0.8);
          color: white;
          border: 2px solid #ff0000;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3);
        }

        .escape-button:hover {
          background: #ff0000;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 0, 0, 0.4);
        }

        .video-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }

        .background-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 1;
        }

        .animated-text-bottom {
          position: absolute;
          bottom: 1%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 3;
          text-align: center;
          animation: float 3s ease-in-out infinite;
        }

        .animated-text-bottom p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          color: rgba(255, 255, 255, 0.8);
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
          margin: 0;
          padding: 1rem 2rem;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-20px);
          }
        }

        .not-found-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 600px;
          padding: 2rem;
        }

        .error-container {
          background: transparent;
          backdrop-filter: blur(50px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 3rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .error-number {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .error-number span {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 8rem;
          font-weight: 600;
          color: #ff0000;
          text-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        .error-number .zero {
          animation-delay: 0.5s;
        }

        .error-number .four:last-child {
          animation-delay: 1s;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        .error-message h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2.5rem;
          color: #ffffff;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .error-message p {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .escape-button {
            top: 1rem;
            right: 1rem;
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
          }

          .animated-text-bottom p {
            font-size: 1.2rem;
            padding: 0.8rem 1.5rem;
          }

          .error-number span {
            font-size: 5rem;
          }

          .error-message h1 {
            font-size: 2rem;
          }

          .error-message p {
            font-size: 1rem;
          }

          .error-container {
            padding: 2rem;
          }
        }

        @media (max-width: 480px) {
          .escape-button {
            top: 0.5rem;
            right: 0.5rem;
            padding: 0.5rem 0.8rem;
            font-size: 0.7rem;
          }

          .animated-text-bottom p {
            font-size: 1rem;
            padding: 0.6rem 1rem;
          }

          .error-number span {
            font-size: 4rem;
          }

          .error-message h1 {
            font-size: 1.5rem;
          }

          .error-message p {
            font-size: 0.9rem;
          }

          .error-container {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
