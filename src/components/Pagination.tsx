'use client';

import { useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      onPageChange(page);
      setIsAnimating(false);
    }, 150);
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="pagination-container">
      <div className="pagination">
        <button
          className={`pagination-btn prev ${currentPage === 1 ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="page-numbers">
          {getVisiblePages().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="ellipsis">...</span>
              ) : (
                <button
                  className={`page-btn ${currentPage === page ? 'active' : ''} ${isAnimating ? 'animating' : ''}`}
                  onClick={() => handlePageChange(page as number)}
                >
                  {page}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          className={`pagination-btn next ${currentPage === totalPages ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .pagination-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 3rem;
          padding: 2rem 0;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px;
          border-radius: 25px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pagination-btn {
          background: transparent;
          border: none;
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
        }

        .pagination-btn:hover:not(.disabled) {
          background: rgba(139, 69, 255, 0.2);
          color: #8b45ff;
          transform: scale(1.1);
        }

        .pagination-btn.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .page-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .page-btn {
          background: transparent;
          border: none;
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          font-weight: 500;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
        }

        .page-btn:hover {
          background: rgba(139, 69, 255, 0.2);
          color: #8b45ff;
          transform: scale(1.1);
        }

        .page-btn.active {
          background: linear-gradient(135deg, #ff3366 0%, #ff6b35 100%);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(255, 51, 102, 0.4);
          transform: scale(1.1);
        }

        .page-btn.animating {
          animation: pageChange 0.3s ease;
        }

        @keyframes pageChange {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        .ellipsis {
          color: #888;
          padding: 0 8px;
          font-size: 0.9rem;
          font-family: 'Paralucent-Medium', Arial, sans-serif;
        }

        @media (max-width: 768px) {
          .pagination {
            gap: 4px;
            padding: 6px;
          }

          .pagination-btn,
          .page-btn {
            width: 36px;
            height: 36px;
            font-size: 0.8rem;
          }

          .ellipsis {
            padding: 0 4px;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .pagination {
            gap: 2px;
            padding: 4px;
          }

          .pagination-btn,
          .page-btn {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
