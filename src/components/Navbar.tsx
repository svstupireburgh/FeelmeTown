'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useRouter, usePathname } from 'next/navigation';
import { useBooking } from '@/contexts/BookingContext';

const Navbar = () => {
  const { openBookingPopup } = useBooking();

  const handleBookingClick = () => {
    router.push('/theater');
  };
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    if (q.includes('theater') || q.includes('theatre') || q.includes('theatres') || q.includes('theaters')) {
      router.push('/theater');
      return;
    }

    if (q.includes('faq')) {
      if (pathname === '/') {
        const el = document.getElementById('faq');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          router.push('/#faq');
        }
      } else {
        router.push('/#faq');
      }

      return;
    }

    if (
      q.includes('testimonial') ||
      q.includes('testimonials') ||
      q.includes('feedback') ||
      q.includes('review') ||
      q.includes('reviews')
    ) {
      if (pathname === '/') {
        const el = document.getElementById('testimonials');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          router.push('/#testimonials');
        }
      } else {
        router.push('/#testimonials');
      }

      return;
    }

    if (q.includes('movie') || q.includes('movies') || q.includes('recommendation') || q.includes('recommendations')) {
      if (pathname === '/') {
        const el = document.getElementById('movies');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          router.push('/#movies');
        }
      } else {
        router.push('/#movies');
      }

      return;
    }

    if (q.includes('contact') || q.includes('support') || q.includes('help')) {
      if (pathname === '/contact') {
        const el = document.getElementById('contact');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          router.push('/contact#contact');
        }
      } else {
        router.push('/contact#contact');
      }

      return;
    }
  };

  const [activeButton, setActiveButton] = useState('Home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);

  // Hidden admin access - click logo 5 times
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [lastLogoClickTime, setLastLogoClickTime] = useState(0);
  const [showAdminStaffPopup, setShowAdminStaffPopup] = useState(false);

  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName);
    setIsMobileMenuOpen(false);

    // Navigate to appropriate page
    switch (buttonName) {
      case 'Home':
        router.push('/');
        break;
      case 'About Us':
        router.push('/about');
        break;
      case 'Theatres':
        router.push('/theater');
        break;
      case 'Services':
        router.push('/services');
        break;
      case 'Gallery':
        router.push('/gallery');
        break;
      case 'Contact Us':
        router.push('/contact');
        break;
      case 'Book Your Show':
        router.push('/theater');
        break;
      default:
        break;
    }
  };

  // Handle logo click for hidden admin access
  const grantSecretAccess = (type: 'admin' | 'management') => {
    if (typeof document === 'undefined') return;
    const cookieName = type === 'admin' ? 'adminAccess' : 'managementAccess';
    document.cookie = `${cookieName}=granted; path=/; max-age=300; SameSite=Lax`;
  };

  const handleLogoClick = () => {
    const currentTime = Date.now();

    // Reset counter if more than 3 seconds have passed since last click
    if (currentTime - lastLogoClickTime > 3000) {
      setLogoClickCount(1);
    } else {
      setLogoClickCount(prev => prev + 1);
    }

    setLastLogoClickTime(currentTime);

    // If 5 clicks within 3 seconds, open role chooser / redirect
    if (logoClickCount >= 4) { // 4 because we just incremented
      setLogoClickCount(0); // Reset counter

      // Check existing sessions
      try {
        const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
        const staffToken = typeof window !== 'undefined' ? localStorage.getItem('staffToken') : null;

        // If admin already logged in, go directly to Administrator panel
        if (adminToken === 'authenticated') {
          grantSecretAccess('admin');
          router.push('/Administrator');
          return;
        }

        // If staff already logged in, go directly to staff dashboard
        if (staffToken === 'authenticated') {
          grantSecretAccess('management');
          router.push('/management/dashboard');
          return;
        }

        // Otherwise show popup to choose Admin or Staff
        setShowAdminStaffPopup(true);
      } catch {
        // On any error, just show the popup
        setShowAdminStaffPopup(true);
      }
    }
  };

  const handleSelectAdmin = () => {
    setShowAdminStaffPopup(false);
    grantSecretAccess('admin');
    router.push('/Administrator');
  };

  const handleSelectStaff = () => {
    setShowAdminStaffPopup(false);
    grantSecretAccess('management');
    router.push('/management');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleDragStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientX);
    setDragCurrent(e.touches[0].clientX);
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (dragStart !== null) {
      setDragCurrent(e.touches[0].clientX);
    }
  };

  const handleDragEnd = () => {
    if (dragStart !== null && dragCurrent !== null) {
      const dragDistance = dragCurrent - dragStart;
      // If dragged more than 100px to the right, close the menu
      if (dragDistance > 100) {
        closeMobileMenu();
      }
    }
    setDragStart(null);
    setDragCurrent(null);
  };

  // Update active button based on current pathname
  useEffect(() => {
    switch (pathname) {
      case '/':
        setActiveButton('Home');
        break;
      case '/about':
        setActiveButton('About Us');
        break;
      case '/theater':
        setActiveButton('Theatres');
        break;
      case '/services':
        setActiveButton('Services');
        break;
      case '/gallery':
        setActiveButton('Gallery');
        break;
      case '/contact':
        setActiveButton('Contact Us');
        break;
      case '/theater':
        setActiveButton('Book Your Show');
        break;
      default:
        if (pathname.includes('services')) {
          setActiveButton('Services');
        } else if (pathname.includes('gallery')) {
          setActiveButton('Gallery');
        } else if (pathname.includes('contact')) {
          setActiveButton('Contact Us');
        } else {
          setActiveButton('Home');
        }
        break;
    }
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const navbar = navbarRef.current;

      if (!navbar) return;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down - hide navbar
        gsap.to(navbar, {
          y: -100,
          duration: 0.3,
          ease: "power2.out"
        });
      } else {
        // Scrolling up - show navbar
        gsap.to(navbar, {
          y: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav ref={navbarRef} className={`navbar ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="logo-container">
            {/* <Image 
              src="/logo.gif" 
              alt="FeelMe Town Logo" 
              width={70} 
              height={70}
              className="logo"
              onClick={handleLogoClick}
              style={{ cursor: 'pointer' }}
            /> */}
            <Image
              src="/logo.gif"
              alt="FeelMe Town Logo"
              width={70}
              height={70}
              className="logo"
              onClick={handleLogoClick}
              unoptimized
              priority
              style={{ cursor: 'pointer' }}
            />
          </div>
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
        <div className="navbar-center">
          <button
            className={`nav-button ${activeButton === 'Home' ? 'active' : ''}`}
            onClick={() => handleButtonClick('Home')}
          >
            Home
          </button>
          <button
            className={`nav-button ${activeButton === 'About Us' ? 'active' : ''}`}
            onClick={() => handleButtonClick('About Us')}
          >
            About Us
          </button>
          <button
            className={`nav-button ${activeButton === 'Theatres' ? 'active' : ''}`}
            onClick={() => handleButtonClick('Theatres')}
          >
            Theatres
          </button>
          <button
            className={`nav-button ${activeButton === 'Services' ? 'active' : ''}`}
            onClick={() => handleButtonClick('Services')}
          >
            Services
          </button>
          <button
            className={`nav-button ${activeButton === 'Gallery' ? 'active' : ''}`}
            onClick={() => handleButtonClick('Gallery')}
          >
            Gallery
          </button>
          <button
            className={`nav-button ${activeButton === 'Contact Us' ? 'active' : ''}`}
            onClick={() => handleButtonClick('Contact Us')}
          >
            Contact Us
          </button>
        </div>
        <div className="navbar-right">
          <div className="search-container">
            <div className="glow" aria-hidden="true"></div>
            <div className="darkBorderBg" aria-hidden="true"></div>
            <div className="darkBorderBg" aria-hidden="true"></div>
            <div className="white" aria-hidden="true"></div>
            <div className="border" aria-hidden="true"></div>

            <div className="search-main">
              <input
                placeholder="Search..."
                type="text"
                className="search-input"
                aria-label="Search"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
              />
              <div className="input-mask" aria-hidden="true"></div>
              <div className="pink-mask" aria-hidden="true"></div>

              <div className="filterBorder" aria-hidden="true"></div>

              <button className="filter-icon" type="button" aria-label="Open filters">
                <svg
                  preserveAspectRatio="none"
                  height="20"
                  width="20"
                  viewBox="4.8 4.56 14.832 15.408"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                    stroke="#d6d6e6"
                    strokeWidth="1"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </button>

              <div className="search-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  height="18"
                  fill="none"
                  className="feather feather-search"
                  aria-hidden="true"
                >
                  <circle stroke="url(#search)" r="8" cy="11" cx="11"></circle>
                  <line
                    stroke="url(#searchl)"
                    y2="16.65"
                    y1="22"
                    x2="16.65"
                    x1="22"
                  ></line>
                  <defs>
                    <linearGradient gradientTransform="rotate(50)" id="search">
                      <stop stopColor="#f8e7f8" offset="0%"></stop>
                      <stop stopColor="#b6a9b7" offset="50%"></stop>
                    </linearGradient>
                    <linearGradient id="searchl">
                      <stop stopColor="#b6a9b7" offset="0%"></stop>
                      <stop stopColor="#837484" offset="50%"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="book-container">
            <div className="book-glow" aria-hidden="true"></div>
            <div className="book-darkBorderBg" aria-hidden="true"></div>
            <div className="book-darkBorderBg" aria-hidden="true"></div>
            <div className="book-darkBorderBg" aria-hidden="true"></div>
            <div className="book-white" aria-hidden="true"></div>
            <div className="book-border" aria-hidden="true"></div>
            <button className="book-button" onClick={handleBookingClick}>
              <Image
                src="/ticket.png"
                alt="Ticket"
                width={20}
                height={20}
                className="ticket-icon"
              />
              Book Your Show
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      >
        <div
          className="mobile-menu"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="mobile-menu-header">
            <button
              className="mobile-menu-close"
              onClick={closeMobileMenu}
              aria-label="Close mobile menu"
            >
              <span className="close-icon">
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
          <div className="mobile-menu-content">
            <button
              className={`mobile-nav-button ${activeButton === 'Home' ? 'active' : ''}`}
              onClick={() => handleButtonClick('Home')}
            >
              Home
            </button>
            <button
              className={`mobile-nav-button ${activeButton === 'About Us' ? 'active' : ''}`}
              onClick={() => handleButtonClick('About Us')}
            >
              About Us
            </button>
            <button
              className={`mobile-nav-button ${activeButton === 'Theatres' ? 'active' : ''}`}
              onClick={() => handleButtonClick('Theatres')}
            >
              Theatres
            </button>
            <button
              className={`mobile-nav-button ${activeButton === 'Services' ? 'active' : ''}`}
              onClick={() => handleButtonClick('Services')}
            >
              Services
            </button>
            <button
              className={`mobile-nav-button ${activeButton === 'Gallery' ? 'active' : ''}`}
              onClick={() => handleButtonClick('Gallery')}
            >
              Gallery
            </button>
            <button
              className={`mobile-nav-button ${activeButton === 'Contact Us' ? 'active' : ''}`}
              onClick={() => handleButtonClick('Contact Us')}
            >
              Contact Us
            </button>



            <div className="mobile-menu-actions">
              <div className="mobile-search-container">
                <input
                  placeholder="Search..."
                  type="text"
                  className="mobile-search-input"
                  aria-label="Search"
                  autoComplete="off"
                />
                <div className="mobile-search-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    height="18"
                    fill="none"
                    className="feather feather-search"
                  >
                    <circle stroke="#d6d6e6" r="8" cy="11" cx="11"></circle>
                    <line
                      stroke="#d6d6e6"
                      y2="16.65"
                      y1="22"
                      x2="16.65"
                      x1="22"
                    ></line>
                  </svg>
                </div>
              </div>

              <div className="mobile-cta-container">
                <div className="mobile-cta-glow" aria-hidden="true"></div>
                <div className="mobile-cta-darkBorderBg" aria-hidden="true"></div>
                <div className="mobile-cta-white" aria-hidden="true"></div>
                <div className="mobile-cta-border" aria-hidden="true"></div>
                <button className="mobile-cta-button" onClick={handleBookingClick}>
                  <span>Book Your Show</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdminStaffPopup && (
        <div className="admin-staff-popup-overlay" onClick={() => setShowAdminStaffPopup(false)}>
          <div className="admin-staff-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Select Portal</h3>
            <p>Choose which panel you want to open.</p>
            <div className="admin-staff-popup-buttons">
              <button className="admin-btn" onClick={handleSelectAdmin}>
                Admin
              </button>
              <button className="staff-btn" onClick={handleSelectStaff}>
                Staff
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          backdrop-filter: blur(2px);
          padding: 1.5% 0;
          min-height: 4rem;
          width: 100%;
        }
        
        .navbar.menu-open {
          z-index: 999;
        }
        
        .navbar-container {
          width: 100%;
          max-width: 100vw;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 3%;
          position: relative;
          box-sizing: border-box;
          height: 100%;
        }
        
        .navbar-left {
          display: flex;
          align-items: center;
          gap: 1.5%;
          flex: 0 0 auto;
        }
        
        .mobile-menu-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          z-index: 1001;
        }
        
        .hamburger {
          display: flex;
          flex-direction: column;
          width: 24px;
          height: 18px;
          position: relative;
        }
        
        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: white;
          border-radius: 1px;
          transition: all 0.3s ease;
          transform-origin: center;
        }
        
        .hamburger span:nth-child(1) {
          margin-bottom: 4px;
        }
        
        .hamburger span:nth-child(2) {
          margin-bottom: 4px;
        }
        
        .hamburger.active span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }
        
        .hamburger.active span:nth-child(2) {
          opacity: 0;
        }
        
        .hamburger.active span:nth-child(3) {
          transform: rotate(-45deg) translate(7px, -6px);
        }
        
        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          z-index: 99999;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          overflow: hidden;
          width: 100vw;
          height: 100vh;
        }
        
        .mobile-menu-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        
        .mobile-menu {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          max-width: 20rem;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          transform: translateX(100%);
          transition: transform 0.3s ease;
          overflow-y: auto;
          z-index: 100000;
          touch-action: pan-y;
        }
        
        .mobile-menu-overlay.active .mobile-menu {
          transform: translateX(0);
        }
        
        .mobile-menu-header {
          position: relative;
          padding: 1rem;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .mobile-menu-close {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }
        
        .mobile-menu-close:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        
        .close-icon {
          position: relative;
          width: 1rem;
          height: 1rem;
        }
        
        .close-icon span {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1rem;
          height: 2px;
          background: white;
          border-radius: 1px;
          transform-origin: center;
        }
        
        .close-icon span:first-child {
          transform: translate(-50%, -50%) rotate(45deg);
        }
        
        .close-icon span:last-child {
          transform: translate(-50%, -50%) rotate(-45deg);
        }
        
        .mobile-menu-content {
          padding: 5rem 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .mobile-nav-button {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(20px);
          text-align: left;
        }
        
        .mobile-nav-button:hover {
          background: var(--card-bg);
          border-color: var(--card-border);
          transform: translateX(5px);
        }
        
        .mobile-nav-button.active {
          background: var(--accent-color);
          border-color: var(--accent-color);
          color: white;
        }
        
        .mobile-theme-toggle {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(20px);
          text-align: left;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        
        .mobile-theme-toggle:hover {
          background: var(--card-bg);
          border-color: var(--card-border);
          transform: translateX(5px);
        }
        
        .mobile-theme-toggle svg {
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        
        .mobile-theme-toggle:hover svg {
          transform: rotate(180deg);
        }
        
        .mobile-menu-actions {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
          padding: 0 1rem;
        }
        
        .mobile-search-container {
          position: relative;
          width: 100%;
        }
        
        .mobile-search-input {
          width: 100%;
          height: 45px;
          background: var(--input-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          color: var(--input-text);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          padding: 0 1rem 0 3rem;
          font-size: 1rem;
          backdrop-filter: blur(20px);
        }
        
        .mobile-search-input::placeholder {
          color: var(--input-placeholder);
        }
        
        .mobile-search-input:focus {
          outline: 2px solid #2b2752;
          outline-offset: 0;
        }
        
        .mobile-search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
        }
        
        .mobile-book-button {
          width: 100%;
          height: 45px;
          background: rgb(0, 0, 0);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 25px;
          color: white;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(40px);
        }
        
        .mobile-book-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        
        .mobile-cta-container {
          position: relative;
          width: 200px;
          height: 50px;
        }
        
        .mobile-cta-glow,
        .mobile-cta-white,
        .mobile-cta-border,
        .mobile-cta-darkBorderBg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          overflow: hidden;
          border-radius: 1rem;
          pointer-events: none;
          z-index: 1;
        }

        .mobile-cta-white,
        .mobile-cta-border,
        .mobile-cta-darkBorderBg {
          width: 206px;
          height: 56px;
          filter: blur(3px);
        }

        .mobile-cta-white {
          filter: blur(2px);
          width: 199px;
          height: 49px;
        }
        .mobile-cta-white::before {
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

        .mobile-cta-border {
          filter: blur(0.5px);
          width: 195px;
          height: 45px;
        }
        .mobile-cta-border::before {
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

        .mobile-cta-darkBorderBg {
          width: 212px;
          height: 62px;
        }
        .mobile-cta-darkBorderBg::before {
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

        .mobile-cta-glow {
          width: 220px;
          height: 70px;
          filter: blur(20px);
          opacity: 0.4;
        }
        .mobile-cta-glow::before {
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

        .mobile-cta-container:hover > .mobile-cta-darkBorderBg::before {
          transform: translate(-50%, -50%) rotate(262deg);
        }
        .mobile-cta-container:hover > .mobile-cta-glow::before {
          transform: translate(-50%, -50%) rotate(240deg);
        }
        .mobile-cta-container:hover > .mobile-cta-white::before {
          transform: translate(-50%, -50%) rotate(263deg);
        }
        .mobile-cta-container:hover > .mobile-cta-border::before {
          transform: translate(-50%, -50%) rotate(250deg);
        }

        .mobile-cta-button {
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

        .mobile-cta-button::before {
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

        .mobile-cta-button:hover::before {
          left: 100%;
        }

        .mobile-cta-button:hover {
          background: black;
          transform: translateY(-2px);
        }

        .mobile-cta-button span {
          position: relative;
          z-index: 2;
        }
        
        .admin-staff-popup-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background:
            radial-gradient(circle at top, rgba(239, 68, 68, 0.26), transparent 55%),
            radial-gradient(circle at bottom, rgba(30, 64, 175, 0.45), transparent 55%),
            rgba(0, 0, 0, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000000;
          backdrop-filter: blur(32px);
        }

        .admin-staff-popup {
          position: relative;
          background: radial-gradient(circle at top left, rgba(248, 250, 252, 0.12), transparent 55%),
            rgba(15, 23, 42, 0.92);
          border-radius: 20px;
          padding: 2.1rem 2.4rem 2rem;
          border: 1px solid rgba(148, 163, 184, 0.55);
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.9),
            inset 0 0 0 1px rgba(15, 23, 42, 0.8);
          max-width: 380px;
          width: 92%;
          text-align: center;
          color: #e5e7eb;
          backdrop-filter: blur(36px);
        }

        .admin-staff-popup h3 {
          margin: 0 0 0.75rem 0;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
        }

        .admin-staff-popup p {
          margin: 0 0 1.5rem 0;
          font-size: 0.9rem;
          color: #9ca3af;
        }

        .admin-staff-popup-buttons {
          display: flex;
          gap: 0.85rem;
          justify-content: center;
        }

        .admin-staff-popup-buttons button {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.22s ease;
          background: radial-gradient(circle at top, rgba(248, 250, 252, 0.18), transparent 60%),
            rgba(15, 23, 42, 0.9);
          color: #e5e7eb;
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.9), 0 12px 30px rgba(15, 23, 42, 0.7);
        }

        .admin-btn {
          background: linear-gradient(135deg, rgba(248, 113, 113, 0.15), rgba(239, 68, 68, 0.4)),
            rgba(15, 23, 42, 0.9);
          border-color: rgba(248, 113, 113, 0.7);
        }

        .admin-btn:hover {
          transform: translateY(-1px) translateZ(0);
          box-shadow: 0 14px 32px rgba(239, 68, 68, 0.65);
          background: linear-gradient(135deg, rgba(248, 113, 113, 0.25), rgba(239, 68, 68, 0.55)),
            rgba(15, 23, 42, 0.92);
        }

        .staff-btn {
          background: linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(34, 197, 94, 0.4)),
            rgba(15, 23, 42, 0.9);
          border-color: rgba(74, 222, 128, 0.7);
        }

        .staff-btn:hover {
          transform: translateY(-1px) translateZ(0);
          box-shadow: 0 14px 32px rgba(34, 197, 94, 0.6);
          background: linear-gradient(135deg, rgba(74, 222, 128, 0.25), rgba(34, 197, 94, 0.55)),
            rgba(15, 23, 42, 0.92);
        }
        
        .navbar-center {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 1.5%;
          flex: 1;
          justify-content: center;
        }
        
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 0 0 auto;
        }
        
        .theme-toggle {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 0.5rem;
          padding: 0.5rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          position: relative;
          overflow: hidden;
        }
        
        .theme-toggle:hover {
          background: var(--card-bg);
          border-color: var(--card-border);
          transform: translateY(-2px) scale(1.05);
        }
        
        .theme-toggle:active {
          transform: translateY(0) scale(0.95);
        }
        
        .theme-toggle svg {
          transition: all 0.3s ease;
        }
        
        .theme-toggle:hover svg {
          transform: rotate(180deg);
        }
        
        .search-container {
          position: relative;
          width: 10rem;
          height: 2.2rem;
          min-width: 8rem;
        }
        
        .search-main {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .search-input {
          background-color: var(--input-bg);
          border: none;
          width: 100%;
          height: 100%;
          border-radius: 0.4rem;
          color: var(--input-text);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          padding-inline: 1.8rem 1.5rem;
          font-size: 0.75rem;
          position: relative;
          z-index: 3;
          box-sizing: border-box;
        }
        
        .search-input::placeholder {
          color: var(--input-placeholder);
        }
        
        .search-input:focus {
          outline: 2px solid #2b2752;
          outline-offset: 0;
        }
        
        .input-mask {
          pointer-events: none;
          width: 60px;
          height: 15px;
          position: absolute;
          background: linear-gradient(90deg, transparent, black);
          top: 12px;
          left: 45px;
          z-index: 4;
        }
        
        .search-main:focus-within > .input-mask {
          display: none;
        }
        
        .pink-mask {
          pointer-events: none;
          width: 20px;
          height: 15px;
          position: absolute;
          background: #cf30aa;
          top: 6px;
          left: 3px;
          filter: blur(15px);
          opacity: 0.8;
          transition: opacity 0.4s ease;
          z-index: 2;
        }
        
        .search-main:hover > .pink-mask {
          opacity: 0;
        }
        
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 0.5rem;
          z-index: 4;
        }
        
        .filter-icon {
          position: absolute;
          top: 0.2rem;
          right: 0.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
          height: 1.5rem;
          width: 1.4rem;
          isolation: isolate;
          overflow: hidden;
          border-radius: 0.3rem;
          background: linear-gradient(180deg, #161329, black, #1d1b4b);
          border: 1px solid transparent;
          cursor: pointer;
        }
        
        .filter-icon:focus-visible {
          outline: 2px solid #6356d8;
          outline-offset: 2px;
        }
        
        .filterBorder {
          height: 1.8rem;
          width: 1.6rem;
          position: absolute;
          top: 0.2rem;
          right: 0.2rem;
          border-radius: 0.3rem;
          overflow: hidden;
          z-index: 3;
        }
        
        .filterBorder::before {
          content: "";
          text-align: center;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(90deg);
          position: absolute;
          width: 400px;
          height: 400px;
          background-repeat: no-repeat;
          background-position: 0 0;
          filter: brightness(1.35);
          background-image: conic-gradient(
            rgba(0, 0, 0, 0),
            #3d3a4f,
            rgba(0, 0, 0, 0) 50%,
            rgba(0, 0, 0, 0) 50%,
            #3d3a4f,
            rgba(0, 0, 0, 0) 100%
          );
          animation: rotate 4s linear infinite;
        }
        
        .white,
        .border,
        .darkBorderBg,
        .glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          overflow: hidden;
          border-radius: 10px;
          pointer-events: none;
          z-index: 1;
          box-sizing: border-box;
        }
        
        .white,
        .border,
        .darkBorderBg {
          width: 9.8rem;
          height: 2.1rem;
          filter: blur(3px);
        }

        .white {
          filter: blur(2px);
          width: 9.6rem;
          height: 1.9rem;
        }
        
        .white::before {
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
        
        .border {
          filter: blur(0.5px);
          width: 9.5rem;
          height: 1.9rem;
        }
        
        .border::before {
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
        
        .darkBorderBg {
          width: 10rem;
          height: 2.3rem;
        }
        
        .darkBorderBg::before {
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
        
        .glow {
          width: 10.2rem;
          height: 2.6rem;
          filter: blur(20px);
          opacity: 0.4;
        }
        
        .glow::before {
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
        
        .search-container:hover > .darkBorderBg::before {
          transform: translate(-50%, -50%) rotate(262deg);
        }
        
        .search-container:hover > .glow::before {
          transform: translate(-50%, -50%) rotate(240deg);
        }
        
        .search-container:hover > .white::before {
          transform: translate(-50%, -50%) rotate(263deg);
        }
        
        .search-container:hover > .border::before {
          transform: translate(-50%, -50%) rotate(250deg);
        }
        
        .search-container:focus-within > .darkBorderBg::before {
          transform: translate(-50%, -50%) rotate(442deg);
          transition: transform 4s ease;
        }
        
        .search-container:focus-within > .glow::before {
          transform: translate(-50%, -50%) rotate(420deg);
          transition: transform 4s ease;
        }
        
        .search-container:focus-within > .white::before {
          transform: translate(-50%, -50%) rotate(443deg);
          transition: transform 4s ease;
        }
        
        .search-container:focus-within > .border::before {
          transform: translate(-50%, -50%) rotate(430deg);
          transition: transform 4s ease;
        }
        
        .book-container {
          position: relative;
          width: 9rem;
          height: 2.2rem;
          min-width: 7rem;
        }
        
        .book-white,
        .book-border,
        .book-darkBorderBg,
        .book-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          overflow: hidden;
          border-radius: 25px;
          pointer-events: none;
          z-index: 1;
          box-sizing: border-box;
        }
        
        .book-white,
        .book-border,
        .book-darkBorderBg {
          width: 8.8rem;
          height: 2.1rem;
          filter: blur(3px);
        }

        .book-white {
          filter: blur(1px);
          width: 8.6rem;
          height: 1.9rem;
        }
        
        .book-white::before {
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
            #ff4444,
            rgba(0, 0, 0, 0) 8%,
            rgba(0, 0, 0, 0) 50%,
            #ff6666,
            rgba(0, 0, 0, 0) 58%
          );
          transition: transform 2s ease;
        }
        
        .book-border {
          filter: blur(0.5px);
          width: 8.5rem;
          height: 1.9rem;
        }
        
        .book-border::before {
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
            #ff0000 5%,
            #1c191c 14%,
            #1c191c 50%,
            #ff3333 60%,
            #1c191c 64%
          );
          transition: transform 2s ease;
        }
        
        .book-darkBorderBg {
          width: 9rem;
          height: 2.3rem;
        }
        
        .book-darkBorderBg::before {
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
            #cc0000,
            rgba(0, 0, 0, 0) 10%,
            rgba(0, 0, 0, 0) 50%,
            #ff0000,
            rgba(0, 0, 0, 0) 60%
          );
          transition: transform 2s ease;
        }
        
        .book-glow {
          width: 9.2rem;
          height: 2.6rem;
          filter: blur(20px);
          opacity: 0.4;
        }
        
        .book-glow::before {
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
            #ff0000 5%,
            #000 38%,
            #000 50%,
            #ff3333 60%,
            #000 87%
          );
          transition: transform 2s ease;
        }
        
        .book-container:hover > .book-darkBorderBg::before {
          transform: translate(-50%, -50%) rotate(262deg);
        }
        
        .book-container:hover > .book-glow::before {
          transform: translate(-50%, -50%) rotate(240deg);
        }
        
        .book-container:hover > .book-white::before {
          transform: translate(-50%, -50%) rotate(263deg);
        }
        
        .book-container:hover > .book-border::before {
          transform: translate(-50%, -50%) rotate(250deg);
        }
        
        .book-container:focus-within > .book-darkBorderBg::before {
          transform: translate(-50%, -50%) rotate(442deg);
          transition: transform 4s ease;
        }
        
        .book-container:focus-within > .book-glow::before {
          transform: translate(-50%, -50%) rotate(420deg);
          transition: transform 4s ease;
        }
        
        .book-container:focus-within > .book-white::before {
          transform: translate(-50%, -50%) rotate(443deg);
          transition: transform 4s ease;
        }
        
        .book-container:focus-within > .book-border::before {
          transform: translate(-50%, -50%) rotate(430deg);
          transition: transform 4s ease;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          margin-right: 0.5rem;
          flex-shrink: 0;
        }
        
        .logo {
          filter: brightness(0) invert(1);
          transition: all 0.3s ease;
          user-select: none;
        }
        
        .logo:hover {
          filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(128, 0, 255, 0.6));
        }
        
        .logo:active {
          transform: scale(0.95);
          filter: brightness(0) invert(1) drop-shadow(0 0 12px rgba(255, 0, 5, 0.8));
        }
        
        .nav-button {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 0.5rem;
          padding: 0.5rem 0.8rem;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 var(--card-border);
          min-height: 2.2rem;
          min-width: 2.2rem;
          touch-action: manipulation;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        
        .nav-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.2), 
            transparent);
          transition: left 0.6s ease;
        }
        
        .nav-button:hover::before {
          left: 100%;
        }
        
        .nav-button:hover {
          background: var(--card-bg);
          border-color: var(--card-border);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 12px 40px var(--accent-hover),
            0 4px 20px var(--accent-hover),
            inset 0 1px 0 var(--card-border);
        }
        
        .nav-button:active {
          transform: translateY(-1px) scale(0.98);
          transition: all 0.1s ease;
        }
        
        .nav-button.active {
          background: var(--accent-color);
          border-color: var(--accent-color);
          color: white;
          box-shadow: 
            0 8px 32px var(--accent-color),
            inset 0 1px 0 var(--accent-color);
        }
        
        .nav-button.active:hover {
          background: var(--accent-hover);
          border-color: var(--card-border);
        }
        
        .book-button {
          background: rgb(0, 0, 0);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 0.5rem 0.8rem;
          color: #D3BBDC;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          backdrop-filter: blur(40px);
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          z-index: 3;
          width: 100%;
          height: 100%;
          min-height: 2.2rem;
          touch-action: manipulation;
          justify-content: center;
          white-space: nowrap;
        }
        
        .book-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.2), 
            transparent);
          transition: left 0.6s ease;
        }
        
        .book-container:hover .book-button::before {
          left: 100%;
        }
        
        .book-container:hover .book-button {
          background: rgb(0, 0, 0);
          border: none;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.2),
            0 4px 20px rgba(128, 0, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .book-button:active {
          transform: translateY(-1px) scale(0.98);
          transition: all 0.1s ease;
        }
        
        
        
        @media (min-width: 120rem) {
          .nav-button {
            padding: 0.7rem 1.2rem;
            font-size: 0.9rem;
            min-height: 2.5rem;
          }
          
          
          .search-container {
            width: 12rem;
            height: 2.5rem;
          }
          
          .search-input {
            font-size: 0.8rem;
            padding-inline: 2rem 1.8rem;
          }
          
          .book-container {
            width: 10rem;
            height: 2.5rem;
          }
          
          .book-button {
            font-size: 0.8rem;
            padding: 0.6rem 1rem;
            min-height: 2.5rem;
          }
          
          .white,
          .border,
          .darkBorderBg {
            width: 12.5rem;
            height: 2.9rem;
          }

          .white {
            width: 12.3rem;
            height: 2.7rem;
          }
          
          .border {
            width: 12.1rem;
            height: 2.5rem;
          }
          
          .darkBorderBg {
            width: 13rem;
            height: 3.1rem;
          }
          
          .glow {
            width: 14rem;
            height: 3.5rem;
          }
          
          .book-white,
          .book-border,
          .book-darkBorderBg {
            width: 10.5rem;
            height: 2.9rem;
          }

          .book-white {
            width: 10.3rem;
            height: 2.7rem;
          }
          
          .book-border {
            width: 10.1rem;
            height: 2.5rem;
          }
          
          .book-darkBorderBg {
            width: 10.8rem;
            height: 3.1rem;
          }
          
          .book-glow {
            width: 11.5rem;
            height: 3.5rem;
          }
        }
        
        @media (min-width: 100rem) {
          .nav-button {
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
            min-height: 2.3rem;
          }
          
          
          .search-container {
            width: 11rem;
            height: 2.3rem;
          }
          
          .search-input {
            font-size: 0.78rem;
            padding-inline: 1.9rem 1.6rem;
          }
          
          .book-container {
            width: 9.5rem;
            height: 2.3rem;
          }
          
          .book-button {
            font-size: 0.85rem;
            padding: 0.55rem 0.9rem;
            min-height: 2.3rem;
          }
          
          .white,
          .border,
          .darkBorderBg {
            width: 11.5rem;
            height: 2.7rem;
          }

          .white {
            width: 11.3rem;
            height: 2.5rem;
          }
          
          .border {
            width: 11.1rem;
            height: 2.3rem;
          }
          
          .darkBorderBg {
            width: 12rem;
            height: 2.9rem;
          }
          
          .glow {
            width: 13rem;
            height: 3.3rem;
          }
          
          .book-white,
          .book-border,
          .book-darkBorderBg {
            width: 9.8rem;
            height: 2.7rem;
          }

          .book-white {
            width: 9.6rem;
            height: 2.5rem;
          }
          
          .book-border {
            width: 9.4rem;
            height: 2.3rem;
          }
          
          .book-darkBorderBg {
            width: 10.3rem;
            height: 2.9rem;
          }
          
          .book-glow {
            width: 11rem;
            height: 3.3rem;
          }
        }
        
        @media (max-width: 100rem) {
          .nav-button {
            padding: 0.5rem 0.8rem;
            font-size: 0.8rem;
            min-height: 2.2rem;
          }
          
          
          .search-container {
            width: 10rem;
            height: 2.2rem;
          }
          
          .search-input {
            font-size: 0.75rem;
            padding-inline: 1.8rem 1.5rem;
          }
          
          .book-container {
            width: 9rem;
            height: 2.2rem;
          }
          
          .book-button {
            font-size: 0.8rem;
            padding: 0.5rem 0.8rem;
            min-height: 2.2rem;
          }
          
          .white,
          .border,
          .darkBorderBg {
            width: 10.5rem;
            height: 2.6rem;
          }

          .white {
            width: 10.3rem;
            height: 2.4rem;
          }
          
          .border {
            width: 10.1rem;
            height: 2.2rem;
          }
          
          .darkBorderBg {
            width: 11rem;
            height: 2.8rem;
          }
          
          .glow {
            width: 12rem;
            height: 3.2rem;
          }
          
          .book-white,
          .book-border,
          .book-darkBorderBg {
            width: 9.5rem;
            height: 2.6rem;
          }

          .book-white {
            width: 9.3rem;
            height: 2.4rem;
          }
          
          .book-border {
            width: 9.1rem;
            height: 2.2rem;
          }
          
          .book-darkBorderBg {
            width: 9.8rem;
            height: 2.8rem;
          }
          
          .book-glow {
            width: 10.5rem;
            height: 3.2rem;
          }
        }
        
        @media (max-width: 90rem) {
          .nav-button {
            padding: 0.45rem 0.7rem;
            font-size: 0.75rem;
            min-height: 2rem;
          }
          
          
          .search-container {
            width: 9rem;
            height: 2rem;
          }
          
          .search-input {
            font-size: 0.7rem;
            padding-inline: 1.6rem 1.3rem;
          }
          
          .book-container {
            width: 8rem;
            height: 2rem;
          }
          
          .book-button {
            font-size: 0.75rem;
            padding: 0.45rem 0.7rem;
            min-height: 2rem;
          }
        }
        
        @media (max-width: 85rem) {
          .nav-button {
            padding: 0.4rem 0.6rem;
            font-size: 0.7rem;
            min-height: 1.8rem;
          }
          
          
          .search-container {
            width: 8rem;
            height: 1.8rem;
          }
          
          .search-input {
            font-size: 0.65rem;
            padding-inline: 1.4rem 1.2rem;
          }
          
          .book-container {
            width: 7rem;
            height: 1.8rem;
          }
          
          .book-button {
            font-size: 0.7rem;
            padding: 0.4rem 0.6rem;
            min-height: 1.8rem;
          }
        }
        
        @media (max-width: 1280px) {
          .navbar-container {
            padding: 0 1.2rem;
          }
          
          .navbar-center {
            gap: 0.75rem;
          }
          
          .nav-button {
            padding: 0.5rem 1.1rem;
            font-size: 0.85rem;
          }
          
          .search-container {
            width: 180px;
            height: 36px;
          }
          
          .search-main {
            width: 180px;
            height: 36px;
          }
          
          .search-input {
            width: 180px;
            height: 36px;
            font-size: 12px;
            padding-inline: 36px 31px;
          }
          
          .book-container {
            width: 160px;
            height: 36px;
          }
          
          .book-button {
            width: 160px;
            height: 36px;
            font-size: 0.85rem;
            padding: 0.5rem 1.1rem;
          }
        }
        
        @media (max-width: 1200px) {
          .navbar-container {
            padding: 0 1rem;
          }
          
          .navbar-center {
            gap: 0.7rem;
          }
          
          .nav-button {
            padding: 0.45rem 1rem;
            font-size: 0.82rem;
          }
          
          .search-container {
            width: 170px;
            height: 35px;
          }
          
          .search-main {
            width: 170px;
            height: 35px;
          }
          
          .search-input {
            width: 170px;
            height: 35px;
            font-size: 12px;
            padding-inline: 34px 29px;
          }
          
          .book-container {
            width: 150px;
            height: 35px;
          }
          
          .book-button {
            width: 150px;
            height: 35px;
            font-size: 0.82rem;
            padding: 0.45rem 1rem;
          }
        }
        
        @media (max-width: 1024px) {
          .navbar-container {
            padding: 0 0.8rem;
          }
          
          .navbar-center {
            gap: 0.6rem;
          }
          
          .nav-button {
            padding: 0.4rem 0.9rem;
            font-size: 0.8rem;
          }
          
          .search-container {
            width: 160px;
            height: 34px;
          }
          
          .search-main {
            width: 160px;
            height: 34px;
          }
          
          .search-input {
            width: 160px;
            height: 34px;
            font-size: 11px;
            padding-inline: 32px 27px;
          }
          
          .book-container {
            width: 140px;
            height: 34px;
          }
          
          .book-button {
            width: 140px;
            height: 34px;
            font-size: 0.8rem;
            padding: 0.4rem 0.9rem;
          }
        }
        
        @media (max-width: 62rem) {
          .navbar-container {
            padding: 0 2%;
            justify-content: space-between;
          }
          
          .navbar-center {
            display: none;
          }
          
          .navbar-right {
            display: none;
          }
          
          .mobile-menu-toggle {
            display: block;
          }
          
          .navbar-left {
            justify-content: space-between;
            width: 100%;
          }
        }
        
        @media (max-width: 48rem) {
          .navbar-container {
            padding: 0 2%;
          }
          
          .navbar-left {
            gap: 1%;
          }
          
          .hamburger {
            width: 1.25rem;
            height: 1rem;
          }
          
          .mobile-menu {
            max-width: 17.5rem;
          }
          
          .mobile-menu-content {
            padding: 4rem 1.5rem 2rem;
          }
          
          .mobile-nav-button {
            padding: 0.8rem 1.2rem;
            font-size: 0.9rem;
          }
          
          .mobile-search-input {
            height: 2.5rem;
            font-size: 0.9rem;
          }
          
          .mobile-book-button {
            height: 2.5rem;
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 36rem) {
          .navbar-container {
            padding: 0 1.5%;
          }
          
          .navbar-left {
            gap: 0.5%;
          }
          
          .hamburger {
            width: 1.125rem;
            height: 0.875rem;
          }
          
          .mobile-menu {
            max-width: 100%;
          }
          
          .mobile-menu-content {
            padding: 3.5rem 1rem 2rem;
          }
          
          .mobile-nav-button {
            padding: 0.7rem 1rem;
            font-size: 0.85rem;
          }
          
          .mobile-search-input {
            height: 2.375rem;
            font-size: 0.85rem;
          }
          
          .mobile-book-button {
            height: 2.375rem;
            font-size: 0.85rem;
          }
        }
        
        @media (max-height: 37.5rem) {
          .navbar {
            padding: 1% 0;
          }
          
          .nav-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }
          
          .search-container {
            height: 2rem;
          }
          
          .search-main {
            height: 2rem;
          }
          
          .search-input {
            height: 2rem;
            font-size: 0.6875rem;
          }
          
          .book-container {
            height: 2rem;
          }
          
          .book-button {
            height: 2rem;
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
          }
        }
        
        @media (max-width: 30rem) {
          .navbar-container {
            padding: 0 1%;
          }
          
          .hamburger {
            width: 1rem;
            height: 0.75rem;
          }
          
          .mobile-menu-content {
            padding: 3rem 0.8rem 1.5rem;
          }
          
          .mobile-nav-button {
            padding: 0.6rem 0.8rem;
            font-size: 0.8rem;
          }
          
          .mobile-search-input {
            height: 2.25rem;
            font-size: 0.8rem;
          }
          
          .mobile-book-button {
            height: 2.25rem;
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 22.5rem) {
          .navbar-container {
            padding: 0 0.5%;
          }
          
          .mobile-menu-content {
            padding: 2.5rem 0.5rem 1rem;
          }
          
          .mobile-nav-button {
            padding: 0.5rem 0.6rem;
            font-size: 0.75rem;
          }
          
          .mobile-search-input {
            height: 2.125rem;
            font-size: 0.75rem;
          }
          
          .mobile-book-button {
            height: 2.125rem;
            font-size: 0.75rem;
          }
        }
        
        /* Prevent horizontal scroll on very small screens */
        @media (max-width: 20rem) {
          .navbar-container {
            padding: 0 0.25%;
          }
          
          .mobile-menu {
            max-width: 100vw;
          }
          
          .mobile-menu-content {
            padding: 2rem 0.3rem 1rem;
          }
          
          .mobile-nav-button {
            padding: 0.4rem 0.5rem;
            font-size: 0.7rem;
          }
          
          .mobile-search-input {
            height: 2rem;
            font-size: 0.7rem;
          }
          
          .mobile-book-button {
            height: 2rem;
            font-size: 0.7rem;
          }
        }
        
        @media (orientation: landscape) and (max-height: 31.25rem) {
          .navbar {
            padding: 0.5% 0;
          }
          
          .mobile-menu-content {
            padding: 2rem 1rem 1rem;
          }
          
          .mobile-nav-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }
          
          .mobile-search-input {
            height: 2rem;
            font-size: 0.8rem;
          }
          
          .mobile-book-button {
            height: 2rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;




