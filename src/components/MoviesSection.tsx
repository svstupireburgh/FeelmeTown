'use client';

import { useState, useEffect } from 'react';
import Movies from './Movies';
import SearchFilter from './SearchFilter';
import Pagination from './Pagination';

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

export default function MoviesSection() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<Industry>('ALL');
    const [selectedRows, setSelectedRows] = useState(3);
    const [lastRowCount, setLastRowCount] = useState(3);

    // Calculate items per page based on screen size
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    const itemsPerPage = isMobile ? selectedRows * 3 : selectedRows * 4;

    // Handle row change - adjust current page to maintain continuity
    const handleRowChange = (newRows: number) => {
        const oldItemsPerPage = isMobile ? lastRowCount * 3 : lastRowCount * 4;
        const newItemsPerPage = isMobile ? newRows * 3 : newRows * 4;

        // Calculate which item we were viewing
        const currentItemIndex = (currentPage - 1) * oldItemsPerPage;

        // Calculate new page to show the same item
        const newPage = Math.floor(currentItemIndex / newItemsPerPage) + 1;

        setSelectedRows(newRows);
        setLastRowCount(newRows);
        setCurrentPage(newPage);
    };

    // Reset to page 1 when filters change (except rows)
    const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
        setter(value);
        setCurrentPage(1);
    };

    return (
        <div className="movies-container">
            <div className="movies-header">
                <h1 className="movies-title">Recommendations</h1>
                <SearchFilter
                    searchTerm={searchTerm}
                    setSearchTerm={handleFilterChange(setSearchTerm)}
                    selectedYear={selectedYear}
                    setSelectedYear={handleFilterChange(setSelectedYear)}
                    selectedGenre={selectedGenre}
                    setSelectedGenre={handleFilterChange(setSelectedGenre)}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={handleFilterChange(setSelectedLanguage)}
                    selectedIndustry={selectedIndustry}
                    setSelectedIndustry={handleFilterChange(setSelectedIndustry)}
                    selectedRows={selectedRows}
                    setSelectedRows={handleRowChange}
                />
            </div>

            <Movies
                searchTerm={searchTerm}
                selectedYear={selectedYear}
                selectedGenre={selectedGenre}
                language={selectedLanguage}
                industry={selectedIndustry}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                selectedRows={selectedRows}
            />

            <Pagination
                currentPage={currentPage}
                totalPages={10} // This should be calculated based on API response
                onPageChange={setCurrentPage}
            />

            <style jsx>{`
                .movies-container {
                    min-height: 100vh;
                    padding: 2rem;
                    padding-top: 4rem;
                }

                .movies-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .movies-title {
                    font-family: 'Paralucent-DemiBold', Arial, sans-serif;
                    font-size: 3.5rem;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 2rem;
                    text-shadow: 0 0 20px rgba(255, 69, 69, 0.3);
                    animation: titleGlow 3s ease-in-out infinite alternate;
                }

                @keyframes titleGlow {
                    0% {
                        text-shadow: 0 0 20px rgba(255, 69, 69, 0.3);
                    }
                    100% {
                        text-shadow: 0 0 30px rgba(255, 69, 69, 0.6), 0 0 40px rgba(255, 69, 69, 0.3);
                    }
                }

                @media (max-width: 768px) {
                    .movies-container {
                        padding: 1rem;
                        padding-top: 3rem;
                    }
                    
                    .movies-title {
                        font-size: 2.5rem;
                    }
                }
            `}</style>
        </div>
    );
}
