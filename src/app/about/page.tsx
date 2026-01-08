'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';



export default function About() {
  const SLIDE_DURATION_MS = 3000;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [vignetteBlur, setVignetteBlur] = useState(true);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Default local images as fallback
  const theaterImages = [
    '/images/theater1.webp',
    '/images/theater2.webp',
    '/images/theater3.webp',
    '/images/theater4.webp'
  ];

  // Fetch gallery images from database API
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const res = await fetch('/api/admin/gallery');
        const data = await res.json();
        if (data?.success && Array.isArray(data.images)) {
          const urls = data.images
            .map((img: any) => img?.imageUrl)
            .filter((u: string) => typeof u === 'string' && u.length > 0);
          if (urls.length > 0) {
            setGalleryImages(urls);
          }
        }
      } catch (err) {
        // Silently fall back to local images
      }
    };
    fetchGalleryImages();
  }, []);

  const imageList = galleryImages.length > 0 ? galleryImages : theaterImages;
  const premiumImages = imageList.slice(0, 4);

  // Auto-advance slideshow based on available images
  useEffect(() => {
    if (imageList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === imageList.length - 1 ? 0 : prevIndex + 1
      );
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [imageList.length]);

  // Ensure current index is in range when images change
  useEffect(() => {
    if (currentImageIndex >= imageList.length) {
      setCurrentImageIndex(0);
    }
  }, [imageList.length]);

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="highlight">Feelme Town</span>
            </h1>
            <div className="divider"></div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="main-content">
        <div className="container">
          <div className="content-grid">
            {/* Left Side - Text Content */}
            <div className="text-content">
              <div className="text-section">
                <h2 className="section-title">
                  About Feelme Town
                </h2>
                <p className="description">
                  SV STUPIRE BURGH LLP is our firm and The FeelMe Town is our trade name or brand name,
                  your premier destination for unforgettable events and extraordinary parties! At Feelme Town,
                  we specialize in turning your visions into stunning realities, creating moments that are
                  cherished for a lifetime.
                </p>
                <p className="description">
                  With a passionate team of event planners and organizers, we offer a comprehensive range
                  of services tailored to meet your every need. From intimate gatherings to grand celebrations,
                  corporate events to private parties, we handle every aspect of event planning with meticulous
                  attention to detail and unparalleled creativity.
                </p>
              </div>
            </div>

            {/* Right Side - Theater Images Slideshow */}
            <div className="slideshow-container">
              <div className="slideshow-wrapper">
                <div className="slideshow-glow"></div>
                                <div className="slideshow-image-container">
                                    {imageList.map((image, index) => (
                                        <div
                                            key={index}
                                            className={`slideshow-image ${index === currentImageIndex ? 'active' : ''}`}
                                        >
                                            <Image
                                                src={image}
                                                alt="Private Theater Event Space"
                                                width={600}
                                                height={400}
                                                className="image-content"
                                            />
                                        </div>
                                    ))}
                                    <div className="slideshow-overlay"></div>
                                    {imageList.length > 1 && (
                                      <div className="slideshow-progress">
                                        <div
                                          key={currentImageIndex}
                                          className="slideshow-progress-fill"
                                          style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }}
                                        />
                                      </div>
                                    )}
                                </div>

                                {/* Navigation Dots */}
                                <div className="slideshow-dots">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <button
                                            key={index}
                                            className={`dot ${index === (currentImageIndex % 4) ? 'active' : ''}`}
                                            onClick={() => setCurrentImageIndex(index)}
                                        />
                                    ))}
                                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-card">
            <h3 className="mission-title">
              Our Mission
            </h3>
            <p className="mission-text">
              Our mission is simple: to transform your dreams into remarkable experiences. Whether you&apos;re
              celebrating a milestone birthday, hosting a corporate gala, or planning the wedding of your
              dreams, we are committed to delivering excellence in every aspect of your event.
            </p>
          </div>
        </div>
      </section>


      {/* Additional Theater Images Section */}
      <section className="premium-section">
        <div className="container">
          <div className="section-header">
            <h2 className="premium-title">
              Our Premium Event Spaces
            </h2>
            <p className="premium-subtitle">
              Experience luxury and comfort in our state-of-the-art private theaters
            </p>

            {/* Vignette Blur Toggle Button */}
            <div className="vignette-toggle-container">
              <button
                className={`vignette-toggle ${vignetteBlur ? 'active' : ''}`}
                onClick={() => setVignetteBlur(!vignetteBlur)}
                title={vignetteBlur ? 'Disable Vignette Blur' : 'Enable Vignette Blur'}
              >
                <span className="toggle-icon">🎭</span>
                <span className="toggle-text">
                  {vignetteBlur ? 'Vignette On' : 'Vignette Off'}
                </span>
              </button>
            </div>
          </div>

          <div className="infinite-scroll-container">
            <div className="infinite-scroll-track">
              {/* First set of images (gallery-driven) */}
              {premiumImages.map((img, idx) => (
                <div className={`image-wrapper image-${idx + 1}`} key={`premium-1-${idx}`}>
                  <div className={`image-glow glow-${idx + 1}`}></div>
                  <div className="image-container">
                    <Image
                      src={img}
                      alt={`Premium Event Space ${idx + 1}`}
                      width={600}
                      height={400}
                      className="theater-image"
                    />
                    <div className="image-overlay"></div>
                    <div className={`vignette-blur ${vignetteBlur ? 'active' : ''}`}></div>
                  </div>
                </div>
              ))}

              {/* Duplicate set for seamless loop */}
              {premiumImages.map((img, idx) => (
                <div className={`image-wrapper image-${idx + 1}`} key={`premium-2-${idx}`}>
                  <div className={`image-glow glow-${idx + 1}`}></div>
                  <div className="image-container">
                    <Image
                      src={img}
                      alt={`Premium Event Space ${idx + 1}`}
                      width={600}
                      height={400}
                      className="theater-image"
                    />
                    <div className="image-overlay"></div>
                    <div className={`vignette-blur ${vignetteBlur ? 'active' : ''}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="container">
          <div className="services-header">
            <h2 className="services-title">
              What We Offer
            </h2>
          </div>

          <div className="services-grid">
            <div className="service-card service-1">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="54" viewBox="0 0 224 253" fill="none">
                  <path d="M209.229 56.4893L97.3378 92.8433C96.0254 93.691 94.5172 94.1874 92.9578 94.2851L54.5233 106.75H214.375C216.795 106.75 219.116 107.711 220.827 109.422C222.539 111.134 223.5 113.455 223.5 115.875V207.125C223.5 219.225 218.693 230.83 210.137 239.387C201.58 247.943 189.976 252.75 177.875 252.75H50.1251C38.0246 252.75 26.4197 247.943 17.8633 239.387C9.307 230.83 4.50009 219.225 4.50009 207.125V115.875C4.50009 113.94 5.10234 112.134 6.14259 110.637L2.58384 99.6506C-1.15447 88.143 -0.168663 75.6217 5.32441 64.8409C10.8175 54.0601 20.3679 45.9028 31.8751 42.1631L153.365 2.68834C164.873 -1.04997 177.394 -0.0641718 188.175 5.4289C198.956 10.922 207.113 20.4724 210.853 31.9796L215.087 44.9918C215.834 47.2934 215.637 49.7976 214.539 51.9538C213.44 54.1099 211.53 55.7414 209.229 56.4893ZM140.901 59.5006L164.352 18.8761C162.535 19.0858 160.744 19.4771 159.005 20.0441L136.283 27.4171L112.412 68.7533L140.901 59.5006ZM182.784 23.3838L182.419 24.0591L166.834 51.0691L194.902 41.9441L193.497 37.6188C191.613 31.8121 187.843 26.8016 182.784 23.3838ZM110.332 35.8486L81.8618 45.1013L57.9726 86.4376L86.4426 77.1848L110.332 35.8486ZM21.3448 98.3548L32.0576 94.8873L55.9103 53.5328L37.5143 59.5188C30.6101 61.7626 24.8798 66.6571 21.5839 73.1255C18.2881 79.594 17.6966 87.1068 19.9396 94.0113L21.3448 98.3548Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="service-title service-title-1">
                Private Theater Events
              </h3>
              <p className="service-description">
                Exclusive movie screenings and entertainment in our luxury private theaters
              </p>
            </div>

            <div className="service-card service-2">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="51" viewBox="0 0 174 184" fill="none">
                  <path d="M53.0489 49.3651L53.9435 50.1467L133.853 130.047C134.901 131.093 135.687 132.372 136.147 133.779C136.608 135.186 136.73 136.681 136.505 138.144C136.279 139.608 135.712 140.997 134.848 142.2C133.985 143.402 132.851 144.385 131.537 145.067L130.444 145.538L32.6524 181.575C14.2711 188.355 -3.63003 171.076 1.95406 152.722L2.42489 151.348L38.4531 53.5555C38.9294 52.2601 39.6846 51.0852 40.6653 50.1141C41.6461 49.1429 42.8283 48.3992 44.1283 47.9356C45.4283 47.472 46.8144 47.2999 48.1883 47.4314C49.5622 47.5629 50.8905 47.9948 52.079 48.6965L53.0489 49.3651ZM138.091 90.2711C146.669 90.7231 158.431 92.5311 168.657 98.6708C170.731 99.8999 172.253 101.877 172.913 104.195C173.572 106.514 173.317 108.996 172.201 111.132C171.085 113.268 169.192 114.895 166.912 115.678C164.632 116.46 162.14 116.339 159.947 115.338L158.968 114.82C152.545 110.96 144.334 109.453 137.102 109.076C134.122 108.912 131.135 108.924 128.156 109.114L125.181 109.406C122.724 109.723 120.242 109.059 118.271 107.559C116.3 106.058 115 103.842 114.652 101.39C114.304 98.9374 114.936 96.4468 116.412 94.4573C117.887 92.4679 120.087 91.1398 122.534 90.7608C127.692 90.0953 132.901 89.9282 138.091 90.2617M157.16 64.0269C159.559 64.0319 161.866 64.9526 163.609 66.601C165.353 68.2494 166.401 70.5011 166.541 72.8963C166.68 75.2916 165.9 77.6498 164.359 79.4893C162.819 81.3288 160.634 82.5109 158.252 82.7943L157.16 82.8602H150.493C148.093 82.8552 145.786 81.9345 144.043 80.2861C142.299 78.6377 141.251 76.386 141.112 73.9907C140.972 71.5954 141.752 69.2373 143.293 67.3978C144.833 65.5583 147.018 64.3761 149.4 64.0928L150.493 64.0269H157.16ZM127.196 56.8043C128.817 58.4258 129.791 60.5831 129.935 62.8716C130.079 65.1601 129.383 67.4225 127.977 69.2343L127.196 70.1194L117.205 80.1105C115.51 81.7994 113.236 82.7799 110.845 82.8529C108.453 82.9259 106.124 82.086 104.329 80.5037C102.535 78.9214 101.41 76.7153 101.183 74.3336C100.956 71.952 101.644 69.5732 103.108 67.6805L103.889 66.7954L113.871 56.8137C114.746 55.9382 115.784 55.2436 116.927 54.7697C118.071 54.2958 119.296 54.0519 120.533 54.0519C121.771 54.0519 122.996 54.2958 124.139 54.7697C125.283 55.2436 126.321 55.9288 127.196 56.8043ZM102.835 7.22553C107.053 19.9004 104.793 33.7805 102.157 43.4797C100.579 49.5286 98.4021 55.4054 95.6593 61.0229C94.5442 63.2582 92.5868 64.9589 90.2178 65.7509C87.8487 66.5429 85.2621 66.3614 83.0268 65.2463C80.7916 64.1312 79.0909 62.1738 78.2989 59.8048C77.5069 57.4357 77.6884 54.8491 78.8035 52.6139C80.9945 48.1022 82.7295 43.383 83.9826 38.5265C86.1202 30.6919 87.1937 22.1886 85.5458 15.2203L84.9714 13.1863C84.561 12.0086 84.3886 10.7612 84.4643 9.51636C84.5399 8.27154 84.8621 7.05415 85.4121 5.93486C85.962 4.81556 86.7289 3.81666 87.668 2.99614C88.6072 2.17562 89.7 1.54982 90.883 1.15507C92.066 0.760328 93.3156 0.604499 94.5593 0.696631C95.803 0.788764 97.016 1.12702 98.1279 1.69177C99.2398 2.25652 100.228 3.03651 101.036 3.98647C101.845 4.93642 102.456 6.03741 102.835 7.22553ZM153.826 30.1834C155.591 31.9492 156.583 34.344 156.583 36.8409C156.583 39.3379 155.591 41.7326 153.826 43.4985L147.168 50.1561C146.3 51.0555 145.261 51.7729 144.112 52.2664C142.963 52.7599 141.727 53.0197 140.477 53.0306C139.227 53.0414 137.987 52.8032 136.829 52.3297C135.672 51.8562 134.621 51.157 133.737 50.2728C132.852 49.3887 132.153 48.3373 131.68 47.18C131.206 46.0227 130.968 44.7828 130.979 43.5324C130.99 42.2821 131.25 41.0464 131.743 39.8976C132.237 38.7487 132.954 37.7096 133.853 36.8409L140.511 30.1834C142.277 28.418 144.672 27.4263 147.168 27.4263C149.665 27.4263 152.06 28.418 153.826 30.1834Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="service-title service-title-2">
                Special Celebrations
              </h3>
              <p className="service-description">
                Anniversary parties, birthdays, and milestone celebrations with custom decorations
              </p>
            </div>

            <div className="service-card service-3">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="49" viewBox="0 0 128 130" fill="none">
                  <path d="M127.75 74.5C127.75 90.4485 126.864 103.034 126.07 111.078C125.308 118.841 119.884 125.415 111.807 126.747C103.08 128.186 88.0605 129.75 64 129.75C39.9395 129.75 24.9201 128.186 16.1934 126.747C8.11553 125.415 2.69469 118.841 1.92969 111.078C1.1392 103.034 0.25 90.4485 0.25 74.5C0.250001 73.6066 0.253123 72.7242 0.258789 71.8535C7.62349 74.2113 15.0242 76.456 22.458 78.5859C29.9351 80.7251 37.993 82.8725 45.2803 84.4932C52.4684 86.0883 59.2428 87.25 64 87.25C68.7572 87.25 75.5316 86.0883 82.7197 84.4932C90.007 82.8725 98.0621 80.7222 105.542 78.5859C113.03 76.4496 119.972 74.3108 125.044 72.71L127.741 71.8516C127.747 72.724 127.75 73.6068 127.75 74.5ZM64 0.833008C67.8618 0.833011 71.0838 1.11694 73.5176 1.4541C78.4218 2.12574 82.3653 5.25663 84.4336 9.41016C85.7709 12.0962 87.5452 15.9751 88.7295 19.8936C99.0795 20.4829 106.574 21.3897 111.807 22.251C119.884 23.5826 125.304 30.1557 126.069 37.9189C126.87 46.2493 127.377 54.6057 127.591 62.9717C119.506 65.592 111.378 68.0729 103.208 70.4141C95.8102 72.5277 87.93 74.6275 80.875 76.1943C73.7181 77.7866 67.74 78.75 64 78.75C60.2572 78.75 54.2818 77.7866 47.125 76.1943C40.07 74.6275 32.187 72.5286 24.792 70.4121C16.6214 68.0709 8.49166 65.5892 0.40625 62.9688C0.623012 54.6047 1.13054 46.2505 1.92969 37.9219C2.69185 30.1585 8.11553 23.5856 16.1934 22.2539C21.4265 21.3898 28.9205 20.4829 39.2705 19.8936C40.4548 15.9751 42.2291 12.0962 43.5664 9.41016C45.6347 5.25664 49.5781 2.12572 54.4795 1.4541C56.9162 1.11977 60.1382 0.833008 64 0.833008ZM64 12.167C60.6964 12.167 57.9934 12.4135 56.0186 12.6826C55.1289 12.8045 54.2473 13.3825 53.709 14.4648C52.9724 15.9438 52.1789 17.6524 51.4678 19.4033C55.34 19.3013 59.5177 19.25 64 19.25C68.4842 19.2538 72.6619 19.3051 76.5322 19.4033C75.8239 17.6524 75.0305 15.9466 74.291 14.4648C73.7527 13.3825 72.8711 12.8045 71.9814 12.6826C69.3355 12.3319 66.669 12.1597 64 12.167Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="service-title service-title-3">
                Corporate Events
              </h3>
              <p className="service-description">
                Professional gatherings and corporate entertainment in sophisticated settings
              </p>
            </div>
          </div>
        </div>
      </section>


      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .about-page {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
          width: 100%;
        }

        .about-page::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('/aboutbg.png');
         
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          filter: blur(50px);
          z-index: 0;
        }

        .about-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 1;
        }

        .about-page > * {
          position: relative;
          z-index: 2;
        }

        .container {
          max-width: 80rem;
          margin: 0 auto;
          padding: 0 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .container {
            padding: 0 2rem;
          }
        }

        @media (min-width: 1024px) {
          .container {
            padding: 0 4rem;
          }
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          padding: 8rem 0 5rem 0;
        }

        .hero-content {
          text-align: center;
          margin-bottom: 4rem;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        @media (min-width: 768px) {
          .hero-title {
            font-size: 4.5rem;
          }
        }

        .highlight {
          color: #FF0005;
        }

        .divider {
          width: 6rem;
          height: 0.25rem;
          background-color: #FF0005;
          margin: 0 auto 2rem auto;
        }

        /* Main Content */
        .main-content {
          padding: 4rem 0;
        }

        .content-grid {
          display: grid;
          gap: 2rem;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .content-grid {
            gap: 3rem;
          }
        }

        @media (min-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
          }
        }

        .text-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .text-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-title {
          font-size: 1.875rem;
          font-weight: bold;
          color: #FF0005;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        @media (min-width: 768px) {
          .section-title {
            font-size: 2.25rem;
          }
        }

        .description {
          font-size: 1.125rem;
          line-height: 1.75;
          color: #d1d5db;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        /* Mission Section */
        .mission-section {
          padding: 4rem 0;
        }

        .mission-card {
          background: linear-gradient(to right, rgba(251, 191, 36, 0.1), rgba(239, 68, 68, 0.1));
          padding: 3rem;
          border-radius: 1rem;
          border: 1px solid rgba(251, 191, 36, 0.2);
          text-align: center;
          max-width: 60rem;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }

        .mission-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.6s ease;
        }

        .mission-card:hover::before {
          left: 100%;
        }

        .mission-title {
          font-size: 2rem;
          font-weight: bold;
          color: #FF0005;
          margin-bottom: 1.5rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          position: relative;
          z-index: 2;
        }

        @media (min-width: 768px) {
          .mission-title {
            font-size: 2.5rem;
          }
        }

        .mission-text {
          font-size: 1.25rem;
          line-height: 1.8;
          color: #d1d5db;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          position: relative;
          z-index: 2;
        }

        /* Slideshow */
        .slideshow-container {
          position: relative;
          width: 100%;
        }

        .slideshow-wrapper {
          position: relative;
          border-radius: 4rem;
          overflow: hidden;
        }

        .slideshow-glow {
          position: absolute;
          inset: 0;
          border-radius: 4rem;
          filter: blur(24px);
          background: linear-gradient(45deg, 
            rgba(251, 191, 36, 0.4), 
            rgba(239, 68, 68, 0.4), 
            rgba(147, 51, 234, 0.4), 
            rgba(34, 197, 94, 0.4),
            rgba(59, 130, 246, 0.4)
          );
          background-size: 500% 500%;
          animation: gradientShift 6s ease-in-out infinite;
          z-index: 1;
          opacity: 0.8;
        }

        @keyframes gradientShift {
          0% { 
            background-position: 0% 50%; 
            filter: blur(20px);
          }
          25% { 
            background-position: 100% 50%; 
            filter: blur(28px);
          }
          50% { 
            background-position: 50% 100%; 
            filter: blur(24px);
          }
          75% { 
            background-position: 50% 0%; 
            filter: blur(30px);
          }
          100% { 
            background-position: 0% 50%; 
            filter: blur(20px);
          }
        }

        .slideshow-image-container {
          position: relative;
          overflow: hidden;
          border-radius: 4rem;
          z-index: 2;
          height: 250px;
          width: 100%;
          max-width: 100%;
        }

        @media (min-width: 768px) {
          .slideshow-image-container {
            height: 350px;
          }
        }

        @media (min-width: 1024px) {
          .slideshow-image-container {
            height: 400px;
          }
        }

        .slideshow-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transform: scale(1.1);
          transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 1;
        }

        .slideshow-image.active {
          opacity: 1;
          transform: scale(1);
          z-index: 2;
        }

        .image-content {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4rem;
        }

        .slideshow-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.1),
            rgba(0, 0, 0, 0.3)
          );
          border-radius: 4rem;
          z-index: 3;
        }

        .slideshow-dots {
            position: absolute;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 0.5rem;
            z-index: 4;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4);
          background: transparent;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .dot:hover {
          border-color: rgba(255, 255, 255, 0.8);
          transform: scale(1.3);
          background: rgba(255, 255, 255, 0.1);
        }

        .dot.active {
          background: #FF0005;
          border-color: #FF0005;
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
          transform: scale(1.2);
        }

        .dot.active::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 1px solid rgba(251, 191, 36, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }


        /* Premium Section */
        .premium-section {
          padding: 4rem 0;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .premium-title {
          font-size: 1.875rem;
          font-weight: bold;
          color: #FF0005;
          margin-bottom: 1rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        @media (min-width: 768px) {
          .premium-title {
            font-size: 2.25rem;
          }
        }

        .premium-subtitle {
          font-size: 1.125rem;
          color: #d1d5db;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        /* Infinite Scroll Container */
        .infinite-scroll-container {
          width: 100%;
          overflow: hidden;
          position: relative;
          margin: 2rem 0;
        }

        .infinite-scroll-container {
          -webkit-mask-image: linear-gradient(to right, 
            transparent 0%, 
            black 15%, 
            black 85%, 
            transparent 100%
          );
          mask-image: linear-gradient(to right, 
            transparent 0%, 
            black 15%, 
            black 85%, 
            transparent 100%
          );
        }

        .infinite-scroll-track {
          display: flex;
          gap: 2rem;
          animation: infiniteScroll 20s linear infinite;
          width: fit-content;
        }

        @keyframes infiniteScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .infinite-scroll-track:hover {
          animation-play-state: paused;
        }

        .premium-grid {
          display: grid;
          gap: 1.5rem;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .premium-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }
        }

        .image-wrapper {
          position: relative;
          width: 400px;
          height: 269px; /* 16:9 aspect ratio */
          border-radius: 0.5rem;
          overflow: hidden;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .image-wrapper {
            width: 400px;
            height: 325px; /* 16:9 aspect ratio */
          }
        }

        @media (min-width: 1024px) {
          .image-wrapper {
            width: 500px;
            height: 300px; /* 16:9 aspect ratio */
          }
        }

        .image-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 4rem;
        }

        .theater-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4rem;
        }

        .image-glow {
          position: absolute;
          inset: 0;
          border-radius: 4rem;
          filter: blur(20px);
          z-index: 1;
          opacity: 0.6;
        }

        

        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(0, 0, 0, 0.3)
          );
          border-radius: 4rem;
          z-index: 2;
        }

        .vignette-blur {
          --radius: 0px;
          --inset: 30px;
          --transition-length: 60px;
          --blur: 23px;

          position: absolute;
          inset: 0;
          border-radius: 4rem;
          -webkit-backdrop-filter: blur(var(--blur));
          backdrop-filter: blur(var(--blur));
          --r: max(var(--transition-length), calc(var(--radius) - var(--inset)));
          --corner-size: calc(var(--r) + var(--inset)) calc(var(--r) + var(--inset));
          --corner-gradient: transparent 0px,
            transparent calc(var(--r) - var(--transition-length)), black var(--r);
          --fill-gradient: black, black var(--inset),
            transparent calc(var(--inset) + var(--transition-length)),
            transparent calc(100% - var(--transition-length) - var(--inset)),
            black calc(100% - var(--inset));
          --fill-narrow-size: calc(100% - (var(--inset) + var(--r)) * 2);
          --fill-farther-position: calc(var(--inset) + var(--r));
          -webkit-mask-image: linear-gradient(to right, var(--fill-gradient)),
            linear-gradient(to bottom, var(--fill-gradient)),
            radial-gradient(at bottom right, var(--corner-gradient)),
            radial-gradient(at bottom left, var(--corner-gradient)),
            radial-gradient(at top left, var(--corner-gradient)),
            radial-gradient(at top right, var(--corner-gradient));
          -webkit-mask-size: 100% var(--fill-narrow-size), var(--fill-narrow-size) 100%,
            var(--corner-size), var(--corner-size), var(--corner-size),
            var(--corner-size);
          -webkit-mask-position: 0 var(--fill-farther-position), var(--fill-farther-position) 0,
            0 0, 100% 0, 100% 100%, 0 100%;
          -webkit-mask-repeat: no-repeat;
          opacity: 0;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 3;
          pointer-events: none;
        }

        .vignette-blur.active {
          opacity: 1;
        }

       

        /* Vignette Toggle Button */
        .vignette-toggle-container {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }

        .vignette-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(239, 68, 68, 0.1));
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-radius: 2rem;
          color: #FF0005;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .vignette-toggle:hover {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(239, 68, 68, 0.2));
          border-color: rgba(251, 191, 36, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(251, 191, 36, 0.3);
        }

        .vignette-toggle.active {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(239, 68, 68, 0.3));
          border-color: #FF0005;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
        }

        .vignette-toggle::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s ease;
        }

        .vignette-toggle:hover::before {
          left: 100%;
        }

        .toggle-icon {
          font-size: 1.125rem;
          transition: transform 0.3s ease;
        }

        .vignette-toggle:hover .toggle-icon {
          transform: scale(1.2);
        }

        .toggle-text {
          font-size: 0.875rem;
          letter-spacing: 0.025em;
        }

        @media (max-width: 768px) {
          .vignette-toggle {
            padding: 0.625rem 1.25rem;
            font-size: 0.8125rem;
          }
          
          .toggle-text {
            font-size: 0.8125rem;
          }
        }

        /* Services Section */
        .services-section {
          padding: 4rem 0;
          background: linear-gradient(to right, rgba(0, 0, 0, 0.05),rgba(0, 0, 0, 0));
          backdrop-filter: blur(10px);
        }

        .services-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .services-title {
          font-size: 1.875rem;
          font-weight: bold;
          color: #FF0005;
          margin-bottom: 1rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        @media (min-width: 768px) {
          .services-title {
            font-size: 2.25rem;
          }
        }

        .services-grid {
          display: grid;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .service-card {
          text-align: center;
          padding: 1.5rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(251, 191, 36, 0.2);
        }

        .service-1 {
          background: linear-gradient(to bottom, rgba(251, 191, 36, 0.1), transparent);
        }

        .service-2 {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.1), transparent);
        }

        .service-3 {
          background: linear-gradient(to bottom, rgba(147, 51, 234, 0.1), transparent);
        }

        .service-icon {
          font-size: 2.25rem;
          margin-bottom: 1rem;
        }

        .service-1 .service-icon {
          color: #FF0005;
        }

        .service-2 .service-icon {
          color: #ef4444;
        }

        .service-3 .service-icon {
          color: #9333ea;
        }

        .service-title {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.75rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        .service-title-1 {
          color: #FF0005;
        }

        .service-title-2 {
          color: #ef4444;
        }

        .service-title-3 {
          color: #9333ea;
        }

        .service-description {
          color: #d1d5db;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        /* Progress bar for slideshow */
        .slideshow-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          z-index: 4;
          overflow: hidden;
        }

        .slideshow-progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0%;
          background: #FF0005;
          border-radius: 999px;
          animation-name: slideshowProgressFill;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }

        @keyframes slideshowProgressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

