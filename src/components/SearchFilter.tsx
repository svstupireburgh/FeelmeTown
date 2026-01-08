'use client';

import { useState } from 'react';

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

interface SearchFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  selectedIndustry: Industry;
  setSelectedIndustry: (industry: Industry) => void;
  selectedRows: number;
  setSelectedRows: (rows: number) => void;
}

export default function SearchFilter({
  searchTerm,
  setSearchTerm,
  selectedYear,
  setSelectedYear,
  selectedGenre,
  setSelectedGenre,
  selectedLanguage,
  setSelectedLanguage,
  selectedIndustry,
  setSelectedIndustry,
  selectedRows,
  setSelectedRows
}: SearchFilterProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Generate years from 1884 to current year
  const currentYear = new Date().getFullYear();
  const years = ['All Years', ...Array.from({ length: currentYear - 1883 }, (_, i) => String(currentYear - i))];
  
  // TMDB Genre IDs mapping
  const genres = [
    { name: 'All Categories', id: '' },
    { name: 'Action', id: '28' },
    { name: 'Adventure', id: '12' },
    { name: 'Animation', id: '16' },
    { name: 'Comedy', id: '35' },
    { name: 'Crime', id: '80' },
    { name: 'Documentary', id: '99' },
    { name: 'Drama', id: '18' },
    { name: 'Family', id: '10751' },
    { name: 'Fantasy', id: '14' },
    { name: 'History', id: '36' },
    { name: 'Horror', id: '27' },
    { name: 'Music', id: '10402' },
    { name: 'Mystery', id: '9648' },
    { name: 'Romance', id: '10749' },
    { name: 'Sci-Fi', id: '878' },
    { name: 'Thriller', id: '53' },
    { name: 'War', id: '10752' },
    { name: 'Western', id: '37' }
  ];
  
  const languages = [
    { name: 'All Languages', code: '' },
    { name: 'English', code: 'en-US' },
    { name: 'Hindi', code: 'hi-IN' },
    { name: 'Spanish', code: 'es-ES' },
    { name: 'French', code: 'fr-FR' },
    { name: 'German', code: 'de-DE' },
    { name: 'Japanese', code: 'ja-JP' },
    { name: 'Korean', code: 'ko-KR' },
    { name: 'Chinese', code: 'zh-CN' },
    { name: 'Italian', code: 'it-IT' }
  ];

  const industries: { name: string; value: Industry }[] = [
    { name: 'All Industries', value: 'ALL' },
    { name: 'Bollywood (Hindi)', value: 'BOLLYWOOD' },
    { name: 'Tollywood (Telugu)', value: 'TOLLYWOOD' },
    { name: 'Kollywood (Tamil)', value: 'KOLLYWOOD' },
    { name: 'Mollywood (Malayalam)', value: 'MOLLYWOOD' },
    { name: 'Sandalwood (Kannada)', value: 'SANDALWOOD' },
    { name: 'Marathi Cinema', value: 'MARATHI' },
    { name: 'Punjabi Cinema', value: 'PUNJABI' },
    { name: 'Bengali Cinema', value: 'BENGALI' }
  ];

  const rowOptions = [
    { name: '1 Row', value: 1 },
    { name: '2 Rows', value: 2 },
    { name: '3 Rows', value: 3 },
    { name: '4 Rows', value: 4 },
    { name: '5 Rows', value: 5 }
  ];

  return (
    <div className="search-filter-container">
      <div className="search-section">
        <div className={`search-container ${isSearchFocused ? 'focused' : ''}`}>
          <div className="search-input-wrapper">
            <svg 
              className="search-icon" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none"
            >
              <path 
                d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search movies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="filter-dropdowns">
        <div className="dropdown-container">
          <label className="dropdown-label">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="filter-dropdown"
          >
            {years.map(year => (
              <option key={year} value={year === 'All Years' ? '' : year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown-container">
          <label className="dropdown-label">Category</label>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="filter-dropdown"
          >
            {genres.map(genre => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown-container">
          <label className="dropdown-label">Language</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="filter-dropdown"
          >
            {languages.map(language => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown-container">
          <label className="dropdown-label">Industry</label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value as Industry)}
            className="filter-dropdown"
          >
            {industries.map(industry => (
              <option key={industry.value} value={industry.value}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown-container">
          <label className="dropdown-label">Rows</label>
          <select
            value={selectedRows}
            onChange={(e) => setSelectedRows(Number(e.target.value))}
            className="filter-dropdown"
          >
            {rowOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <style jsx>{`
        .search-filter-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-bottom: 2rem;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .search-section {
          display: flex;
          justify-content: center;
        }

        .search-container {
          position: relative;
          transition: all 0.3s ease;
        }

        .search-container.focused {
          transform: scale(1.02);
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          color: #888;
          z-index: 2;
          transition: color 0.3s ease;
        }

        .search-container.focused .search-icon {
          color: #8b45ff;
        }

        .search-input {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 14px 20px 14px 50px;
          border-radius: 30px;
          font-size: 1rem;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
          width: 400px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .search-input::placeholder {
          color: #888;
        }

        .search-input:focus {
          outline: none;
          border-color: #8b45ff;
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 20px rgba(139, 69, 255, 0.2);
        }

        .filter-dropdowns {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .dropdown-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 150px;
        }

        .dropdown-label {
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
          text-align: center;
        }

        .filter-dropdown {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .filter-dropdown:focus {
          outline: none;
          border-color: #8b45ff;
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 15px rgba(139, 69, 255, 0.2);
        }

        .filter-dropdown option {
          background: #1a1a1a;
          color: #ffffff;
          padding: 8px;
        }

        @media (max-width: 768px) {
          .search-filter-container {
            gap: 1.5rem;
            padding: 0 1rem;
          }

          .search-input {
            width: 100%;
            max-width: 350px;
          }

          .filter-dropdowns {
            gap: 1rem;
          }

          .dropdown-container {
            min-width: 120px;
          }
        }

        @media (max-width: 480px) {
          .search-filter-container {
            gap: 1rem;
            padding: 0 1rem;
            max-width: 100%;
            margin: 0 auto;
          }

          .search-section {
            order: 1;
            display: flex;
            justify-content: center;
            width: 100%;
          }

          .filter-dropdowns {
            order: 2;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 0.6rem;
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            justify-items: center;
          }
          
          .filter-dropdowns .dropdown-container:nth-child(4) {
            grid-column: 1;
            justify-self: center;
          }
          
          .filter-dropdowns .dropdown-container:nth-child(5) {
            grid-column: 2;
            justify-self: center;
          }

          .dropdown-container {
            width: 100%;
            min-width: auto;
          }

          .dropdown-label {
            font-size: 0.75rem;
            margin-bottom: 3px;
            text-align: center;
          }

          .filter-dropdown {
            padding: 6px 8px;
            font-size: 0.75rem;
            width: 100%;
          }

          .search-input {
            padding: 10px 14px 10px 40px;
            font-size: 0.85rem;
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  );
}
