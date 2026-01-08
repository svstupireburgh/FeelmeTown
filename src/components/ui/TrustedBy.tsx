"use client"

import { useState, useEffect, useRef } from 'react'

export default function TrustedPartnersSection() {
  const [isHovered, setIsHovered] = useState(false)
  const [isManualScrolling, setIsManualScrolling] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [hoveredLogo, setHoveredLogo] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isClient, setIsClient] = useState(false)

  const companies = [
    {
      name: 'Netflix',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Netflix_Logomark.png/960px-Netflix_Logomark.png?20230907150228',
      category: 'Streaming'
    },
    {
      name: 'Amazon Prime',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/800px-Amazon_Prime_Video_logo.svg.png?20180717024615',
      category: 'Streaming'
    },
    {
      name: 'YouTube',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/YouTube_dark_logo_2017.svg/512px-YouTube_dark_logo_2017.svg.png?20180405191459',
      category: 'Video Platform'
    }
    
  ]

  // Create infinite loop by duplicating companies
  const infiniteCompanies = [...companies, ...companies, ...companies]

  const handleMouseEnter = () => {
    setIsHovered(true)
    setIsManualScrolling(false)
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsManualScrolling(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setIsManualScrolling(true)
    setStartX(e.touches[0].clientX)
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const currentX = e.touches[0].clientX
    const diff = startX - currentX
    if (containerRef.current) {
      containerRef.current.scrollLeft += diff
    }
    setStartX(currentX)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    manualScrollTimeoutRef.current = setTimeout(() => {
      setIsManualScrolling(false)
    }, 2000)
  }

  const handleManualScroll = () => {
    setIsManualScrolling(true)
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current)
    }
    manualScrollTimeoutRef.current = setTimeout(() => {
      setIsManualScrolling(false)
    }, 2000)
  }

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -200, behavior: 'smooth' })
      handleManualScroll()
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 200, behavior: 'smooth' })
      handleManualScroll()
    }
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    let animationId: number
    const scrollSpeed = 1 // pixels per frame

    const animateScroll = () => {
      if (containerRef.current && !isHovered && !isManualScrolling) {
        containerRef.current.scrollLeft += scrollSpeed
        
        // Reset scroll position when reaching the end
        if (containerRef.current.scrollLeft >= containerRef.current.scrollWidth / 3) {
          containerRef.current.scrollLeft = 0
        }
      }
      animationId = requestAnimationFrame(animateScroll)
    }

    animateScroll()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isHovered, isManualScrolling, isClient])

  if (!isClient) {
    return (
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.content}>
            {/* Section Header */}
            <div style={styles.header}>
              <h2 style={styles.title}>
                Trusted By Leading Movie Platforms
              </h2>
              <p style={styles.description}>
                We&apos;re proud to work with the world&apos;s most popular streaming and movie platforms. 
                Our expertise has made us a trusted partner in the entertainment industry.
              </p>
            </div>
            
            {/* Loading placeholder */}
            <div style={styles.relative}>
              <div style={styles.loadingContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={styles.loadingItem}>
                    <div style={styles.loadingContent}>
                      <div style={styles.loadingPlaceholder}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.content}>
          {/* Section Header */}
          <div style={styles.header}>
            <h2 style={styles.title}>
              Trusted By Leading Movie Platforms
            </h2>
            <p style={styles.description}>
              We&apos;re proud to work with the world&apos;s most popular streaming and movie platforms. 
              Our expertise has made us a trusted partner in the entertainment industry.
            </p>
          </div>

          {/* Logo Scrolling Container */}
          <div style={styles.relative}>
            {/* Left Gradient Overlay */}
            <div style={styles.leftGradient}></div>
            
            {/* Right Gradient Overlay */}
            <div style={styles.rightGradient}></div>

            {/* Scroll Controls */}
            <button
              onClick={scrollLeft}
              style={styles.leftButton}
              aria-label="Scroll left"
            >
              <svg style={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={scrollRight}
              style={styles.rightButton}
              aria-label="Scroll right"
            >
              <svg style={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Logo Container */}
            <div 
              ref={containerRef}
              style={styles.logoContainer}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div style={styles.logoRow}>
                {infiniteCompanies.map((company, index) => (
                  <div
                    key={`${company.name}-${index}`}
                    style={{
                      ...styles.logoItem,
                      ...(hoveredLogo === index ? styles.logoItemHover : {})
                    }}
                    onMouseEnter={() => setHoveredLogo(index)}
                    onMouseLeave={() => setHoveredLogo(null)}
                  >
                    <div style={styles.logoContent}>
                      <img
                        src={company.logo}
                        alt={`${company.name} logo`}
                        style={{
                          ...styles.logoImage,
                          ...(hoveredLogo === index ? styles.logoImageHover : {})
                        }}
                      />
                      <div style={{
                        ...styles.logoOverlay,
                        ...(hoveredLogo === index ? styles.logoOverlayHover : {})
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  section: {
    padding: '5rem 0',
    background: 'transparent',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
  },
  content: {
    maxWidth: '1120px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '4rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    fontFamily: "'Paralucent-DemiBold', Arial, sans-serif",
    color: '#ED2024',
    margin: '0 0 1.5rem 0'
  
  },
  description: {
    fontSize: '1.125rem',
    color: 'rgba(255, 255, 255, 0.8)',
    maxWidth: '32rem',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  relative: {
    position: 'relative' as const,
  },
  leftGradient: {
    position: 'absolute' as const,
    left: '0',
    top: '0',
    width: '8rem',
    height: '100%',
    background: 'linear-gradient(to right, #000000, transparent)',
    zIndex: 10,
    pointerEvents: 'none' as const,
  },
  rightGradient: {
    position: 'absolute' as const,
    right: '0',
    top: '0',
    width: '8rem',
    height: '100%',
    background: 'linear-gradient(to left, #000000, transparent)',
    zIndex: 10,
    pointerEvents: 'none' as const,
  },
  leftButton: {
    position: 'absolute' as const,
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 20,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0.75rem',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    opacity: 0,
    backdropFilter: 'blur(10px)',
  },
  rightButton: {
    position: 'absolute' as const,
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 20,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0.75rem',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    opacity: 0,
    backdropFilter: 'blur(10px)',
  },
  buttonIcon: {
    width: '1.5rem',
    height: '1.5rem',
    color: '#ffffff',
  },
  logoContainer: {
    position: 'relative' as const,
    overflow: 'hidden',
  },
  logoRow: {
    display: 'flex',
    gap: '4rem',
    padding: '2rem 0',
  },
  logoItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '200px',
    height: '8rem',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  logoContent: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  logoImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
    transition: 'all 0.3s ease',
    filter: 'grayscale(100%) brightness(0.8) contrast(1.2)',
  },
  logoOverlay: {
    position: 'absolute' as const,
    inset: '0',
    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    borderRadius: '1rem',
  },
  loadingContainer: {
    display: 'flex',
    gap: '4rem',
    padding: '2rem 0',
    justifyContent: 'center',
  },
  loadingItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '180px',
    height: '5rem',
  },
  loadingContent: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  loadingPlaceholder: {
    width: '7rem',
    height: '3rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '0.5rem',
    animation: 'pulse 2s infinite',
  },
  
  // Hover effects
  logoItemHover: {
    transform: 'translateY(-0.5rem)',
  },
  logoImageHover: {
    transform: 'scale(1.1)',
    filter: 'grayscale(0%) brightness(1) contrast(1)',
  },
  logoOverlayHover: {
    opacity: 1,
  },
  buttonHover: {
    opacity: 1,
    background: 'rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-50%) scale(1.1)',
  },
  
  // Responsive styles
  '@media (max-width: 768px)': {
    title: {
      fontSize: '2rem',
    },
    description: {
      fontSize: '1rem',
    },
    logoRow: {
      gap: '2rem',
    },
    logoItem: {
      minWidth: '150px',
      height: '6rem',
    },
    leftGradient: {
      width: '4rem',
    },
    rightGradient: {
      width: '4rem',
    },
  },
  '@media (max-width: 480px)': {
    title: {
      fontSize: '1.5rem',
    },
    logoRow: {
      gap: '1rem',
    },
    logoItem: {
      minWidth: '120px',
      height: '5rem',
    },
  },
}