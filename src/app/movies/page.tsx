'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import Movies from '@/components/Movies';
import SearchFilter from '@/components/SearchFilter';
import Pagination from '@/components/Pagination';

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

export default function MoviesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: 240 }} />}>
      <MoviesPageInner />
    </Suspense>
  );
}

function MoviesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('ALL');
  const [selectedRows, setSelectedRows] = useState(2);
  const itemsPerPage = selectedRows * 4; // 4 cards per row on desktop

  // Check if coming from booking popup or admin booking
  const fromBooking = searchParams.get('from') === 'booking';
  const fromAdminBooking = searchParams.get('from') === 'admin-booking';

  // Ensure body scroll is enabled when component mounts
  useEffect(() => {
    // Force reset all scroll-related styles
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.top = 'auto';
    document.body.style.width = '100%';
    document.body.style.height = 'auto';
    document.body.style.left = 'auto';
    document.body.style.right = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.position = 'static';
    document.body.classList.remove('popup-open');
    
    // Force scroll to top
    window.scrollTo(0, 0);
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.top = 'auto';
      document.body.style.width = '100%';
      document.body.style.height = 'auto';
      document.body.style.left = 'auto';
      document.body.style.right = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.documentElement.style.height = 'auto';
      document.documentElement.style.position = 'static';
      document.body.classList.remove('popup-open');
    };
  }, []);

  const handleBackClick = () => {
    
    
    // Ensure body scroll is enabled before navigation
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('popup-open');
    
    if (fromBooking) {
      router.push('/theater?reopenBooking=true');
    } else if (fromAdminBooking) {
      // Set flag to reopen admin booking popup
      
      sessionStorage.setItem('reopenAdminBookingPopup', 'true');
      router.push('/Administrator/bookings');
    } else {
      router.back();
    }
  };

  const handleMovieSelect = (movieTitle: string) => {
    // Store selected movie in sessionStorage
    sessionStorage.setItem('selectedMovie', movieTitle);
    
    
    
    // Ensure body scroll is enabled before navigation
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('popup-open');
    
    if (fromBooking) {
      // Return to theater page which will reopen booking popup
      router.push('/theater?reopenBooking=true');
    } else if (fromAdminBooking) {
      // Set flag to reopen admin booking popup
      
      sessionStorage.setItem('reopenAdminBookingPopup', 'true');
      router.push('/Administrator/bookings');
    } else {
      router.back();
    }
  };

  return (
    <>
      <div className="movies-container">
        {/* Header with Back Button */}
        <div className="movies-header">
          <div className="movies-header-content">
            <button 
              onClick={handleBackClick}
              className="back-button"
              aria-label="Go back"
            >
              <ArrowLeft className="back-icon" />
              Back
            </button>
            <div className="movies-title-section">
              <h1 className="movies-title">
                <Play className="title-icon" />
                Select Your Movie
              </h1>
              <p className="movies-subtitle">
                Choose your preferred movie for the theater experience
              </p>
            </div>
          </div>
        </div>

        <div className="movies-content">
          <SearchFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            selectedIndustry={selectedIndustry}
            setSelectedIndustry={setSelectedIndustry}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
          />

          <Movies
            searchTerm={searchTerm}
            selectedYear={selectedYear}
            selectedGenre={selectedGenre}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            language={selectedLanguage}
            industry={selectedIndustry}
            selectedRows={selectedRows}
            onMovieSelect={handleMovieSelect}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={50}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <style jsx>{`
        /* Reset any global scroll issues */
        :global(html, body) {
          overflow: auto !important;
          height: auto !important;
          position: static !important;
          width: 100% !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
        }
        
        :global(body) {
          margin: 0 !important;
          padding: 0 !important;
        }

        .movies-container {
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
        }

        .movies-header {
          padding: 1rem 3rem 0.75rem 3rem;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 20, 0.6) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          flex-shrink: 0;
          z-index: 10;
        }

        .movies-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
        }

        .movies-header-content {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .movies-header-content {
            display: block;
            text-align: center;
          }
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .back-button {
            margin: 0 auto 1.5rem auto;
            display: inline-flex;
          }
        }

        .movies-title-section {
          flex: 1;
          text-align: center;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .back-icon {
          width: 1.1rem;
          height: 1.1rem;
        }

        .movies-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #ffffff;
          font-size: 2.2rem;
          font-weight: 900;
          font-family: 'Paralucent-Bold', Arial, sans-serif;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #cccccc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
          letter-spacing: -0.02em;
        }

        .title-icon {
          width: 1.8rem;
          height: 1.8rem;
          color: #ff3366;
        }

        .movies-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
          margin: 0 0 1rem 0;
          line-height: 1.4;
          font-weight: 400;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .movies-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 3rem 2rem 3rem;
          position: relative;
          width: 100%;
        }

        @media (max-width: 768px) {
          .movies-content {
            padding: 1rem 1rem 2rem 1rem;
            text-align: center;
          }
          
          .movies-content > div:first-child {
            margin-bottom: 2rem;
          }
          
          .movies-content > div:nth-child(2) {
            margin-bottom: 2rem;
          }
        }
        .ai-recommendations-section {
          padding: 4rem 2rem;
          text-align: center;
          background: linear-gradient(135deg, rgba(255, 0, 5, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%);
          margin: 2rem 0;
          border-radius: 1rem;
        }

        .ai-recommendations-header {
          margin-bottom: 2rem;
        }

        .ai-recommendations-title {
          color: #FF0005;
          font-size: 2rem;
          font-weight: 700;
          font-family: 'Paralucent-Bold', Arial, sans-serif;
          margin: 0 0 1rem 0;
        }

        .ai-recommendations-description {
          color: #cccccc;
          font-size: 1.1rem;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
          margin: 0;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Desktop specific fixes */
        @media (min-width: 1024px) {
          .movies-container {
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
            overflow-y: auto;
          }
          
          .movies-header {
            padding: 1rem 3rem 0.75rem 3rem;
          }
          
          .movies-content {
            padding: 1rem 3rem 2rem 3rem;
          }
        }

        @media (max-width: 768px) {
          .movies-container {
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
            overflow-y: auto;
          }
          
          .movies-header {
            padding: 0.75rem 1.5rem 0.5rem 1.5rem;
          }

          .movies-header-content {
            padding: 0;
          }

          .back-button {
            padding: 0.6rem 1.25rem;
            font-size: 0.85rem;
            margin: 0 auto 1.5rem auto;
            display: inline-flex;
          }

          .movies-title {
            font-size: 2.2rem;
            margin-bottom: 0.75rem;
          }

          .title-icon {
            width: 1.8rem;
            height: 1.8rem;
          }

          .movies-subtitle {
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
          }

          .movies-content {
            padding: 1rem 1rem;
            text-align: center;
          }
          
          .movies-content > div:first-child {
            margin-bottom: 1.5rem;
          }
          
          .movies-content > div:nth-child(2) {
            margin-bottom: 1.5rem;
          }

          .ai-recommendations-section {
            padding: 2rem 1rem;
            margin: 1rem 0;
          }

          .ai-recommendations-title {
            font-size: 1.5rem;
          }

          .ai-recommendations-description {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .movies-container {
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
            overflow-y: auto;
          }
          
          .movies-header {
            padding: 0.5rem 1rem 0.25rem 1rem;
          }

          .back-button {
            padding: 0.5rem 1rem;
            font-size: 0.8rem;
            margin: 0 auto 1rem auto;
            display: inline-flex;
          }

          .movies-title {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }

          .title-icon {
            width: 1.5rem;
            height: 1.5rem;
          }

          .movies-subtitle {
            font-size: 1rem;
            margin-bottom: 1rem;
          }

          .movies-content {
            padding: 0.75rem 1rem;
            text-align: center;
          }
          
          .movies-content > div:first-child {
            margin-bottom: 1.5rem;
          }
          
          .movies-content > div:nth-child(2) {
            margin-bottom: 1.5rem;
          }

          .ai-recommendations-section {
            padding: 1.5rem 0.5rem;
            margin: 1rem 0;
          }

          .ai-recommendations-title {
            font-size: 1.25rem;
          }

          .ai-recommendations-description {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  );
}

