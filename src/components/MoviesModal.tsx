'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';
import Movies from './Movies';
import SearchFilter from './SearchFilter';

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

interface MoviesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieSelect: (movieTitle: string) => void;
  selectedMovies?: string[];
}

export default function MoviesModal({ isOpen, onClose, onMovieSelect, selectedMovies = [] }: MoviesModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('ALL');
  const [selectedRows, setSelectedRows] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = selectedRows * 4; // 4 cards per row on desktop

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

  const handleMovieSelect = (movieTitle: string) => {
    
    onMovieSelect(movieTitle);
    onClose();
  };

  if (!isVisible) return null;

  return createPortal(
    <div className="movies-modal-overlay" onClick={handleOverlayClick}>
      <div className="movies-modal-container">
        <div className="movies-modal-header">
          <h2>Select Movies</h2>
          <button 
            className="movies-modal-close"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="movies-modal-content">
          

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

            <div className="movies-grid-container">
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
                selectedMovies={selectedMovies}
              />
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .movies-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000000;
          backdrop-filter: blur(5px);
        }

        .movies-modal-container {
          background: #0a0a0a;
          border-radius: 12px;
          width: 90vw;
          height: 95vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
         
          margin: 1rem;
          max-height: 98vh;
        }

        .movies-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #333;
          color: white;
          background: #1a1a1a;
        }

        .movies-modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .movies-modal-close {
          background: none;
          border: none;
          color: #ccc;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background 0.2s ease;
        }

        .movies-modal-close:hover {
          background: #333;
          color: white;
        }
        
        .movies-modal-content {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          padding: 0;
        }
        
        .movies-modal-header {
          padding: 1rem 3rem 0.75rem 3rem;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 20, 0.6) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          flex-shrink: 0;
          z-index: 10000001;
        }
        
        .movies-modal-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
        }
        
        .movies-title-section {
          text-align: center;
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
          flex: 1;
          overflow-y: auto;
        }
        
        /* Movies grid container */
        .movies-grid-container {
          width: 100%;
          padding: 1rem;
          max-width: 100%;
          margin: 0 auto;
        }
        
        /* Override Movies component grid to show 4 cards per row */
        .movies-grid-container :global(.movies-container) {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        .movies-grid-container :global(.movies-grid) {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 1rem !important;
          width: 100% !important;
        }
        
        .movies-grid-container :global(.movie-card) {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Add padding inside movies content for movie cards */
        .movies-content :global(.movies-container) {
          padding: 1rem;
        }
        
        /* Add gap between filters and movie cards */
        .movies-content > div:first-child {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Add margin to Industry and Rows filter options */
        .movies-content :global(.filter-row) {
          margin-bottom: 2rem;
        }
        
        .movies-content :global(.filter-group:has(select[name="industry"])),
        .movies-content :global(.filter-group:has(select[name="rows"])) {
          margin-bottom: 2rem;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
          .movies-modal-container {
            margin: 0.5rem;
            max-height: 98vh;
          }
          
          .movies-modal-header {
            padding: 0.75rem 1.5rem 0.5rem 1.5rem;
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
          
          .movies-content :global(.movies-container) {
            padding: 1rem;
          }
          
          .movies-grid-container {
            padding: 1rem;
          }
          
          .movies-grid-container :global(.movies-grid) {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem !important;
          }
          
          .movies-content > div:first-child {
            margin-bottom: 3rem;
           padding-bottom: 1.5rem;
           border-bottom: 1px solid rgba(255, 255, 255, 0.1);
         
          }
          
          .movies-content :global(.filter-row) {
            margin-bottom: 1.5rem;
          }
          
          .movies-content :global(.filter-group:has(select[name="industry"])),
          .movies-content :global(.filter-group:has(select[name="rows"])) {
            margin-bottom: 1.5rem;
          }
        
        @media (max-width: 480px) {
          .movies-modal-container {
            margin: 0.25rem;
            max-height: 99vh;
          }
          
          .movies-modal-header {
            padding: 0.5rem 1rem 0.25rem 1rem;
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
          
          .movies-content :global(.movies-container) {
            padding: 1rem;
          }
          
          .movies-grid-container {
            padding-top: 2rem;
          }
          
          .movies-grid-container :global(.movies-grid) {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          
          .movies-content > div:first-child {
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
          }
          
          .movies-content :global(.filter-row) {
            margin-bottom: 1rem;
          }
          
          .movies-content :global(.filter-group:has(select[name="industry"])),
          .movies-content :global(.filter-group:has(select[name="rows"])) {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
