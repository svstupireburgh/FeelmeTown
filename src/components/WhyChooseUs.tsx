import React, { useState } from 'react';

const WhyChooseUs: React.FC = () => {
    const [isArrowHovered, setIsArrowHovered] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [clickedCard, setClickedCard] = useState<number | null>(null);

    // Check if mobile on component mount and window resize
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleCardClick = (cardIndex: number) => {
        if (isMobile) {
            setClickedCard(clickedCard === cardIndex ? null : cardIndex);
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #000000 0%,rgb(0, 0, 0) 20%,rgb(0, 0, 0) 50%,rgb(0, 0, 0) 80%, #000000 100%)',
            color: 'white',
            padding: '4rem 2rem',
            position: 'relative' as const,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        stars: {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'transparent url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-opacity=\'0.4\'%3E%3Cpolygon fill=\'%23fff\' points=\'50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40\'/%3E%3C/g%3E%3C/svg%3E") repeat',
            backgroundSize: '100px 100px',
            opacity: 0.2,
            filter: 'blur(3px)',
        },
        topGradient: {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
            zIndex: 1,
        },
        bottomGradient: {
            position: 'absolute' as const,
            bottom: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
            zIndex: 1,
        },
        mainContent: {
            position: 'relative' as const,
            zIndex: 2,
            width: '100%',
            maxWidth: '1200px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
        },
         headerSection: {
             position: 'relative' as const,
             zIndex: 2,
             width: '100%',
             display: 'flex',
             justifyContent: 'space-between',
             alignItems: 'center',
             marginBottom: '0',
             padding: '0 2rem',
             marginTop: '0',
             height: '100%',
             flexDirection: 'row' as const,
         },
        leftSection: {
            flex: '1',
            textAlign: 'left' as const,
        },
        rightSection: {
            flex: '1',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            height: '100%',
        },
         mainTitle: {
             fontSize: isMobile ? '3rem' : '6rem',
             fontWeight: 900,
             lineHeight: 0.9,
             marginBottom: '0',
             textTransform: 'uppercase' as const,
             letterSpacing: '-0.02em',
             textAlign: isMobile ? 'center' as const : 'left' as const,
         },
         whyText: {
             color: 'white',
             fontSize: isMobile ? '3rem' : 'inherit',
         },
         chooseText: {
             color: 'white',
             fontSize: isMobile ? '3rem' : 'inherit',
         },
         usContainer: {
             display: 'flex',
             alignItems: 'center',
             justifyContent: isMobile ? 'center' : 'flex-start',
             gap: '1rem',
             marginTop: '0.5rem',
         },
         arrow: {
             width: isMobile ? '60px' : '80px',
             height: isMobile ? '60px' : '80px',
             backgroundColor: 'red',
             borderRadius: '50%',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             fontSize: '6rem',
             color: 'black',
             fontWeight: 'bold',
             transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
             cursor: 'pointer',
         },
        arrowHover: {
            transform: 'rotate(45deg) scale(1.1)',
            boxShadow: '0 10px 30px rgba(255, 0, 0, 0.3)',
        },
         usText: {
             fontSize: isMobile ? '3rem' : '6rem',
             fontWeight: 900,
             color: 'white',
             textTransform: 'uppercase' as const,
             letterSpacing: '-0.02em',
             textShadow: '2px 2px 0px transparent',
             WebkitTextStroke: '2px white',
             WebkitTextFillColor: 'transparent',
         },
        statsContainer: {
            position: 'relative' as const,
            zIndex: 2,
            maxWidth: '500px',
            marginTop: '0',
        },
         statsGrid: {
             display: 'grid',
             gridTemplateColumns: '1fr 1fr',
             gridTemplateRows: 'auto auto auto',
             gap: '1rem',
             height: '350px',
             alignContent: 'center',
             justifyContent: 'center',
         },
         statsGridMobile: {
             display: 'flex',
             flexDirection: 'column' as const,
             gap: '1rem',
             width: '100%',
             maxWidth: '400px',
             margin: '0 auto',
         },
         statCard: {
             backgroundColor: 'white',
             borderRadius: '20px',
             padding: '1.5rem',
             display: 'flex',
             flexDirection: 'column' as const,
             justifyContent: 'flex-start',
             alignItems: 'flex-start',
             textAlign: 'left' as const,
             boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
             width: '100%',
             height: '80px',
             overflow: 'hidden',
             transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             cursor: 'pointer',
             position: 'relative' as const,
         },
         statCardMobile: {
             backgroundColor: 'white',
             borderRadius: '20px',
             padding: '1.5rem',
             display: 'flex',
             flexDirection: 'column' as const,
             justifyContent: 'flex-start',
             alignItems: 'flex-start',
             textAlign: 'left' as const,
             boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
             width: '100%',
             height: 'auto',
             minHeight: '80px',
             overflow: 'visible',
             transition: 'all 0.3s ease',
             cursor: 'pointer',
             position: 'relative' as const,
         },
         statCardMobileYellow: {
             backgroundColor: '#ffff00',
             borderRadius: '20px',
             padding: '1.5rem',
             display: 'flex',
             flexDirection: 'column' as const,
             justifyContent: 'flex-start',
             alignItems: 'flex-start',
             textAlign: 'left' as const,
             boxShadow: '0 8px 32px rgba(255,255,0,0.3)',
             width: '100%',
             height: 'auto',
             minHeight: '80px',
             overflow: 'visible',
             transition: 'all 0.3s ease',
             cursor: 'pointer',
             position: 'relative' as const,
         },
        statCardHover: {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            backgroundColor: '#f8f9fa',
            height: '200px',
        },
        statCardYellow: {
            backgroundColor: '#ffff00',
            borderRadius: '20px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center' as const,
            boxShadow: '0 8px 32px rgba(255,255,0,0.3)',
            gridRow: 'span 3',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative' as const,
        },
        statCardYellowHover: {
            boxShadow: '0 15px 45px rgba(255,255,0,0.5)',
        },
        // Content container for yellow card
        yellowCardContent: {
            position: 'relative' as const,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        // Heading that slides out to the left
        statHeadingYellow: {
            fontSize: '3rem',
            fontWeight: 700,
            color: 'black',
            marginBottom: '0',
            lineHeight: 1.2,
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'absolute' as const,
            width: '100%',
            textAlign: 'center' as const,
            transform: 'translateX(0)',
            opacity: 1,
        },
        statHeadingYellowHidden: {
            transform: 'translateX(-100%)',
            opacity: 0,
        },
         // Description that slides in from the right
         statDescriptionYellow: {
             fontSize: '0.8rem',
             color: 'black',
             lineHeight: 1.3,
             transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             position: 'absolute' as const,
             width: '100%',
             height: '100%',
             textAlign: 'center' as const,
             padding: '1rem',
             transform: 'translateX(100%)',
             opacity: 0,
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             overflow: 'hidden',
         },
         statDescriptionYellowVisible: {
             transform: 'translateX(0)',
             opacity: 1,
             fontSize: '0.8rem',
             lineHeight: 1.3,
         },
         statHeading: {
             fontSize: '1.2rem',
             fontWeight: 700,
             color: '#333',
             textAlign: 'left' as const,
             marginBottom: '0',
             lineHeight: 1.3,
             transition: 'all 0.4s ease',
             zIndex: 2,
             position: 'relative' as const,
         },
         statHeadingWithArrow: {
             fontSize: '1.2rem',
             fontWeight: 700,
             color: '#333',
             textAlign: 'left' as const,
             marginBottom: '0',
             lineHeight: 1.3,
             transition: 'all 0.4s ease',
             zIndex: 2,
             position: 'relative' as const,
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             width: '100%',
         },
         downArrow: {
             fontSize: '1.2rem',
             color: '#666',
             transition: 'transform 0.3s ease',
             fontWeight: 'bold',
         },
         downArrowRotated: {
             fontSize: '1.2rem',
             color: '#666',
             transform: 'rotate(180deg)',
             transition: 'transform 0.3s ease',
             fontWeight: 'bold',
         },
        statHeadingHover: {
            color: '#007bff',
            transform: 'translateY(-2px)',
        },
         statDescription: {
             fontSize: '0.85rem',
             color: '#666',
             textAlign: 'left' as const,
             lineHeight: 1.5,
             opacity: 0,
             maxHeight: '0px',
             marginTop: '0',
             marginBottom: '0',
             padding: '0',
             transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             overflow: 'hidden',
             transform: 'translateY(-10px)',
         },
         statDescriptionMobile: {
             fontSize: '0.85rem',
             color: '#666',
             textAlign: 'left' as const,
             lineHeight: 1.5,
             opacity: 1,
             maxHeight: 'none',
             marginTop: '0.8rem',
             marginBottom: '0',
             padding: '0',
             transition: 'none',
             overflow: 'visible',
             transform: 'none',
         },
         statDescriptionMobileCollapsed: {
             fontSize: '0.85rem',
             color: '#666',
             textAlign: 'left' as const,
             lineHeight: 1.5,
             opacity: 0,
             maxHeight: '0px',
             marginTop: '0',
             marginBottom: '0',
             padding: '0',
             transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             overflow: 'hidden',
             transform: 'translateY(-10px)',
         },
         statDescriptionMobileExpanded: {
             fontSize: '0.85rem',
             color: '#666',
             textAlign: 'left' as const,
             lineHeight: 1.5,
             opacity: 1,
             maxHeight: '200px',
             marginTop: '0.8rem',
             marginBottom: '0',
             padding: '0',
             transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             overflow: 'hidden',
             transform: 'translateY(0)',
         },
         statDescriptionExpanded: {
             fontSize: '0.85rem',
             color: '#555',
             textAlign: 'left' as const,
             lineHeight: 1.5,
             opacity: 1,
             maxHeight: '120px',
             marginTop: '0.8rem',
             marginBottom: '0',
             padding: '0',
             transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             overflow: 'visible',
             transform: 'translateY(0)',
         },
        // Shimmer effect for cards
        shimmer: {
            position: 'absolute' as const,
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            transition: 'left 0.6s ease',
        },
        shimmerActive: {
            left: '100%',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.stars}></div>
            <div style={styles.topGradient}></div>
            <div style={styles.bottomGradient}></div>

             {/* Main Content Container */}
             <div style={styles.mainContent}>
                 {isMobile ? (
                     /* Mobile Layout */
                     <div style={{ width: '100%', padding: '2rem 1rem' }}>
                         {/* Mobile Header */}
                         <div style={{ textAlign: 'center' as const, marginBottom: '3rem' }}>
                             <div style={styles.mainTitle}>
                                 <div style={styles.whyText}>WHY</div>
                                 <div style={styles.chooseText}>CHOOSE</div>
                                 <div style={styles.usContainer}>
                                     <div
                                         style={{
                                             ...styles.arrow,
                                             ...(isArrowHovered ? styles.arrowHover : {})
                                         }}
                                         onMouseEnter={() => setIsArrowHovered(true)}
                                         onMouseLeave={() => setIsArrowHovered(false)}
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 12 12" fill="none">
                                             <path d="M1.99992 1C1.99992 0.734784 2.10528 0.48043 2.29281 0.292893C2.48035 0.105357 2.7347 0 2.99992 0H10.9999C11.2651 0 11.5195 0.105357 11.707 0.292893C11.8946 0.48043 11.9999 0.734784 11.9999 1V9C11.9999 9.26522 11.8946 9.51957 11.707 9.70711C11.5195 9.89464 11.2651 10 10.9999 10C10.7347 10 10.4803 9.89464 10.2928 9.70711C10.1053 9.51957 9.99992 9.26522 9.99992 9V3.414L1.70692 11.707C1.51832 11.8892 1.26571 11.99 1.00352 11.9877C0.741321 11.9854 0.490509 11.8802 0.305101 11.6948C0.119692 11.5094 0.0145233 11.2586 0.0122448 10.9964C0.00996641 10.7342 0.110761 10.4816 0.292919 10.293L8.58592 2H2.99992C2.7347 2 2.48035 1.89464 2.29281 1.70711C2.10528 1.51957 1.99992 1.26522 1.99992 1Z" fill="white" />
                                         </svg>
                                     </div>
                                     <div style={styles.usText}>US</div>
                                 </div>
                             </div>
                         </div>

                         {/* Mobile Cards */}
                         <div style={styles.statsGridMobile}>
                             {/* Best Faculty Card */}
                             <div style={styles.statCardMobile} onClick={() => handleCardClick(0)}>
                                 <div style={styles.statHeadingWithArrow}>
                                     Best Faculty
                                     <span style={clickedCard === 0 ? styles.downArrowRotated : styles.downArrow}>
                                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">
                                             <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                         </svg>
                                     </span>
                                 </div>
                                 <div style={clickedCard === 0 ? styles.statDescriptionMobileExpanded : styles.statDescriptionMobileCollapsed}>
                                     The staff facilities here are outstanding, with friendly and accommodating behavior that ensures a pleasant experience. Cleanliness is meticulously maintained, contributing to a comfortable and welcoming environment for all guests.
                                 </div>
                             </div>

                             {/* Easy To Reach Card */}
                             <div style={styles.statCardMobile} onClick={() => handleCardClick(1)}>
                                 <div style={styles.statHeadingWithArrow}>
                                     Easy To Reach Us
                                     <span style={clickedCard === 1 ? styles.downArrowRotated : styles.downArrow}>
                                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">
                                             <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                         </svg>
                                     </span>
                                 </div>
                                 <div style={clickedCard === 1 ? styles.statDescriptionMobileExpanded : styles.statDescriptionMobileCollapsed}>
                                     The location is easily accessible, with the bus stand just 2-3 minutes away. The nearest metro stations are Dwarka Sector 9 and Palam, making it convenient for metro travelers. Additionally, cabs are readily available.
                                 </div>
                             </div>

                             {/* Theaters Card */}
                             <div style={styles.statCardMobile} onClick={() => handleCardClick(2)}>
                                 <div style={styles.statHeadingWithArrow}>
                                     Premium Theaters
                                     <span style={clickedCard === 2 ? styles.downArrowRotated : styles.downArrow}>
                                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">
                                             <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                         </svg>
                                     </span>
                                 </div>
                                 <div style={clickedCard === 2 ? styles.statDescriptionMobileExpanded : styles.statDescriptionMobileCollapsed}>
                                     India&apos;s largest private theater boasts a 172-inch full HD screen and an impressive 5.1 surround sound system. The seats are luxurious recliners, ensuring maximum comfort. Food can be ordered directly to your seat.
                                 </div>
                             </div>

                             {/* Yellow Card */}
                             <div style={styles.statCardMobileYellow} onClick={() => handleCardClick(3)}>
                                 <div style={styles.statHeadingWithArrow}>
                                     Ultimate Party Venue
                                     <span style={clickedCard === 3 ? styles.downArrowRotated : styles.downArrow}>
                                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">
                                             <path d="M1 1L6 6L11 1" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                         </svg>
                                     </span>
                                 </div>
                                 <div style={clickedCard === 3 ? styles.statDescriptionMobileExpanded : styles.statDescriptionMobileCollapsed}>
                                     This is an excellent venue for celebrating parties, birthdays, and anniversaries. You and your guests will have a wonderful experience, with top-notch amenities and a welcoming atmosphere that ensures every event is memorable and enjoyable. It&apos;s a perfect choice for creating lasting memories.
                                 </div>
                             </div>
                         </div>
                     </div>
                 ) : (
                     /* Desktop Layout */
                     <div style={styles.headerSection}>
                         {/* Left Section - WHY CHOOSE US */}
                         <div style={styles.leftSection}>
                             <div style={styles.mainTitle}>
                                 <div style={styles.whyText}>WHY</div>
                                 <div style={styles.chooseText}>CHOOSE</div>
                                 <div style={styles.usContainer}>
                                     <div
                                         style={{
                                             ...styles.arrow,
                                             ...(isArrowHovered ? styles.arrowHover : {})
                                         }}
                                         onMouseEnter={() => setIsArrowHovered(true)}
                                         onMouseLeave={() => setIsArrowHovered(false)}
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 12 12" fill="none">
                                             <path d="M1.99992 1C1.99992 0.734784 2.10528 0.48043 2.29281 0.292893C2.48035 0.105357 2.7347 0 2.99992 0H10.9999C11.2651 0 11.5195 0.105357 11.707 0.292893C11.8946 0.48043 11.9999 0.734784 11.9999 1V9C11.9999 9.26522 11.8946 9.51957 11.707 9.70711C11.5195 9.89464 11.2651 10 10.9999 10C10.7347 10 10.4803 9.89464 10.2928 9.70711C10.1053 9.51957 9.99992 9.26522 9.99992 9V3.414L1.70692 11.707C1.51832 11.8892 1.26571 11.99 1.00352 11.9877C0.741321 11.9854 0.490509 11.8802 0.305101 11.6948C0.119692 11.5094 0.0145233 11.2586 0.0122448 10.9964C0.00996641 10.7342 0.110761 10.4816 0.292919 10.293L8.58592 2H2.99992C2.7347 2 2.48035 1.89464 2.29281 1.70711C2.10528 1.51957 1.99992 1.26522 1.99992 1Z" fill="white" />
                                         </svg>
                                     </div>
                                     <div style={styles.usText}>US</div>
                                 </div>
                             </div>
                         </div>

                         {/* Right Section - Statistics */}
                         <div style={styles.rightSection}>
                             <div style={styles.statsContainer}>
                                 <div style={styles.statsGrid}>
                                     {/* Best Faculty Card */}
                                     <div
                                         style={{
                                             ...styles.statCard,
                                             ...(hoveredCard === 1 ? styles.statCardHover : {})
                                         }}
                                         onMouseEnter={() => setHoveredCard(1)}
                                         onMouseLeave={() => setHoveredCard(null)}
                                     >
                                         <div style={styles.shimmer}></div>
                                         <div style={{
                                             ...styles.statHeading,
                                             ...(hoveredCard === 1 ? styles.statHeadingHover : {})
                                         }}>
                                             Best Faculty
                                         </div>
                                         <div style={hoveredCard === 1 ? styles.statDescriptionExpanded : styles.statDescription}>
                                             The staff facilities here are outstanding, with friendly and accommodating behavior that ensures a pleasant experience. Cleanliness is meticulously maintained, contributing to a comfortable and welcoming environment for all guests.
                                         </div>
                                     </div>

                                     {/* Yellow Card - Updated with slide animation */}
                                     <div
                                         style={{
                                             ...styles.statCardYellow,
                                             ...(hoveredCard === 4 ? styles.statCardYellowHover : {}),
                                             gridColumn: '2',
                                             gridRow: '1 / 4',
                                         }}
                                         onMouseEnter={() => setHoveredCard(4)}
                                         onMouseLeave={() => setHoveredCard(null)}
                                     >
                                         <div style={styles.yellowCardContent}>
                                             {/* Heading that slides out to left */}
                                             <div style={{
                                                 ...styles.statHeadingYellow,
                                                 ...(hoveredCard === 4 ? styles.statHeadingYellowHidden : {})
                                             }}>
                                                 Ultimate Party Venue
                                             </div>
                                             
                                             {/* Description that slides in from right */}
                                             <div style={{
                                                 ...styles.statDescriptionYellow,
                                                 ...(hoveredCard === 4 ? styles.statDescriptionYellowVisible : {})
                                             }}>
                                                 This is an excellent venue for celebrating parties, birthdays, and anniversaries. You and your guests will have a wonderful experience, with top-notch amenities and a welcoming atmosphere that ensures every event is memorable and enjoyable. It&apos;s a perfect choice for creating lasting memories.
                                             </div>
                                         </div>
                                     </div>

                                     {/* Easy To Reach Card */}
                                     <div
                                         style={{
                                             ...styles.statCard,
                                             ...(hoveredCard === 2 ? styles.statCardHover : {})
                                         }}
                                         onMouseEnter={() => setHoveredCard(2)}
                                         onMouseLeave={() => setHoveredCard(null)}
                                     >
                                         <div style={styles.shimmer}></div>
                                         <div style={{
                                             ...styles.statHeading,
                                             ...(hoveredCard === 2 ? styles.statHeadingHover : {})
                                         }}>
                                             Easy To Reach Us
                                         </div>
                                         <div style={hoveredCard === 2 ? styles.statDescriptionExpanded : styles.statDescription}>
                                             The location is easily accessible, with the bus stand just 2-3 minutes away. The nearest metro stations are Dwarka Sector 9 and Palam, making it convenient for metro travelers. Additionally, cabs are readily available.
                                         </div>
                                     </div>

                                     {/* Theaters Card */}
                                     <div
                                         style={{
                                             ...styles.statCard,
                                             ...(hoveredCard === 3 ? styles.statCardHover : {})
                                         }}
                                         onMouseEnter={() => setHoveredCard(3)}
                                         onMouseLeave={() => setHoveredCard(null)}
                                     >
                                         <div style={styles.shimmer}></div>
                                         <div style={{
                                             ...styles.statHeading,
                                             ...(hoveredCard === 3 ? styles.statHeadingHover : {})
                                         }}>
                                             Premium Theaters
                                         </div>
                                         <div style={hoveredCard === 3 ? styles.statDescriptionExpanded : styles.statDescription}>
                                             India&apos;s largest private theater boasts a 172-inch full HD screen and an impressive 5.1 surround sound system. The seats are luxurious recliners, ensuring maximum comfort. Food can be ordered directly to your seat.
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
             </div>
         </div>

        
    );
};

export default WhyChooseUs;