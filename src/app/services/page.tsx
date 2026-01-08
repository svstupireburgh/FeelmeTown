'use client';

import React, { useEffect, useState } from 'react';

type ServiceItem = {
  id?: string;
  name: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
};

type ServiceDoc = {
  _id: string;
  serviceId: string;
  name: string;
  items: ServiceItem[];
};

export default function Services() {
    const [services, setServices] = useState<ServiceDoc[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('/api/admin/services');
                const data = await res.json();
                if (data.success && Array.isArray(data.services)) {
                    setServices(data.services);
                } else {
                    setServices([]);
                    setError(data.error || 'Failed to load services');
                }
            } catch (e) {
                setError('Failed to load services');
                setServices([]);
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, []);

    // All services fetched from database will be rendered dynamically below
    const allServices = services;
    return (
        <div className="services-page">
            <style jsx>{`
                .services-page {
                    min-height: 100vh;
                    background-color: #000000;
                    color: #ffffff;
                    overflow-x: hidden;
                    position: relative;
                }

                .services-page::after {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('/bg7.png');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    filter: blur(10px);
                    z-index: 0;
                }

                .services-page::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 1;
                }

                .services-hero {
                    padding: 8rem 0 4rem;
                    text-align: center;
                    position: relative;
                    z-index: 2;
                }

                .services-hero h1 {
                    font-size: 3.5rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                }

                .services-hero p {
                    font-size: 1.25rem;
                    color: #d1d5db;
                    max-width: 600px;
                    margin: 0 auto;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .services-section {
                    padding: 4rem 0;
                    position: relative;
                    z-index: 2;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .services-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 2rem;
                    margin-top: 3rem;
                }

                .service-card {
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.1) 0%, 
                        rgba(255, 255, 255, 0.05) 100%);
                    border: 2px solid rgba(239, 68, 68, 0.3);
                    border-radius: 1rem;
                    padding: 2rem;
                    text-align: center;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }

                .service-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, 
                        rgba(239, 68, 68, 0.1) 0%, 
                        transparent 50%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .service-card:hover::before {
                    opacity: 1;
                }

                .service-card:hover {
                    transform: translateY(-5px);
                    border-color: rgba(239, 68, 68, 0.6);
                }

                .service-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    display: block;
                }

                .service-title {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .service-description {
                    font-size: 1rem;
                    color: #d1d5db;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .service-features {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    flex-grow: 1;
                }

                .service-features li {
                    color: #ffffff;
                    margin-bottom: 0.5rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    position: relative;
                    padding-left: 1.5rem;
                }

                .service-features li::before {
                    content: '✓';
                    position: absolute;
                    left: 0;
                    color: #10b981;
                    font-weight: bold;
                }

                .service-price {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-top: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .service-button {
                    background: linear-gradient(45deg, #ED2024, #ED2024);
                    color: #ffffff;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    margin-top: 0.5rem;
                    margin-bottom: 0.1rem;
                    width: 100%;
                }

                .service-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(237, 32, 36, 0.3);
                }

                .section-title {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-bottom: 1rem;
                    text-align: center;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .section-description {
                    font-size: 1.125rem;
                    color: #d1d5db;
                    text-align: center;
                    max-width: 800px;
                    margin: 0 auto 3rem;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-top: 2rem;
                }

                .item-card {
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.1) 0%, 
                        rgba(255, 255, 255, 0.05) 100%);
                    border: 2px solid rgba(239, 68, 68, 0.2);
                    border-radius: 1rem;
                    padding: 1rem;
                    text-align: center;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                }

                .item-card:hover {
                    transform: translateY(-3px);
                    border-color: rgba(239, 68, 68, 0.4);
                    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.2);
                }

                .item-image {
                    width: 100%;
                    height: 150px;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    margin-bottom: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .item-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 0.5rem;
                }

                .item-label {
                    font-size: 0.9rem;
                    color: #ffffff;
                    font-weight: 500;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    line-height: 1.4;
                }

                .cta-section {
                    padding: 4rem 0;
                    text-align: center;
                    background: rgba(0, 0, 0, 0.7);
                    position: relative;
                    z-index: 2;
                }

                .cta-title {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .cta-description {
                    font-size: 1.125rem;
                    color: #d1d5db;
                    margin-bottom: 2rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .cta-button {
                    background: linear-gradient(45deg, #ED2024, #ED2024);
                    color: #ffffff;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 0.75rem;
                    font-size: 1.125rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .cta-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(239, 68, 68, 0.4);
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .services-hero h1 {
                        font-size: 2.5rem;
                    }

                    .services-hero p {
                        font-size: 1rem;
                    }

                    .section-title {
                        font-size: 2rem;
                    }

                    .section-description {
                        font-size: 1rem;
                    }

                    .services-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }

                    .service-card {
                        padding: 1.5rem;
                    }

                    .items-grid {
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 1rem;
                    }

                    .item-image {
                        height: 120px;
                    }

                    .item-label {
                        font-size: 0.8rem;
                    }

                    .cta-title {
                        font-size: 2rem;
                    }
                }
            `}</style>

            {/* Hero Section */}
            <section className="services-hero">
                <div className="container">
                    <h1>Our Premium Services</h1>
                    <p>Experience luxury and comfort with our exclusive private theater services designed for your special moments.</p>
                </div>
            </section>

            {/* Dynamically render all services from the database (above Premium section) */}
            {allServices.map(service => (
              <section className="services-section" key={service._id}>
                <div className="container">
                  <h2 className="section-title">{service.name}</h2>
                  <p className="section-description">
                    Explore our {service.name} options curated specially for your private theater experience.
                  </p>
                  <div className="items-grid">
                    {loading ? (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#d1d5db' }}>Loading...</div>
                    ) : !service.items || service.items.length === 0 ? (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9ca3af' }}>No items available.</div>
                    ) : (
                      service.items.map((item, idx) => (
                        <div className="item-card" key={`${service._id}-${idx}`}>
                          <div className="item-image">
                            {item.imageUrl ? (
                              <img src={item.imageUrl as string} alt={item.name} />
                            ) : item.image ? (
                              <img src={item.image as string} alt={item.name} />
                            ) : null}
                          </div>
                          <div className="item-label">{item.name}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ))}

            {/* Main Services Section (Premium static content at the bottom) */}
            <section className="services-section">
                <div className="container">
                    <h2 className="section-title">Our Premium Services</h2>
                    <p className="section-description">
                        Experience luxury and comfort with our exclusive private theater services designed for your special moments.
                    </p>
                    <div className="services-grid">
                        {/* Private Theater Events */}
                        <div className="service-card">
                            <span className="service-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 224 253" fill="currentColor">
                                    <path d="M209.229 56.4893L97.3378 92.8433C96.0254 93.691 94.5172 94.1874 92.9578 94.2851L54.5233 106.75H214.375C216.795 106.75 219.116 107.711 220.827 109.422C222.539 111.134 223.5 113.455 223.5 115.875V207.125C223.5 219.225 218.693 230.83 210.137 239.387C201.58 247.943 189.976 252.75 177.875 252.75H50.1251C38.0246 252.75 26.4197 247.943 17.8633 239.387C9.307 230.83 4.50009 219.225 4.50009 207.125V115.875C4.50009 113.94 5.10234 112.134 6.14259 110.637L2.58384 99.6506C-1.15447 88.143 -0.168663 75.6217 5.32441 64.8409C10.8175 54.0601 20.3679 45.9028 31.8751 42.1631L153.365 2.68834C164.873 -1.04997 177.394 -0.0641718 188.175 5.4289C198.956 10.922 207.113 20.4724 210.853 31.9796L215.087 44.9918C215.834 47.2934 215.637 49.7976 214.539 51.9538C213.44 54.1099 211.53 55.7414 209.229 56.4893ZM140.901 59.5006L164.352 18.8761C162.535 19.0858 160.744 19.4771 159.005 20.0441L136.283 27.4171L112.412 68.7533L140.901 59.5006ZM182.784 23.3838L182.419 24.0591L166.834 51.0691L194.902 41.9441L193.497 37.6188C191.613 31.8121 187.843 26.8016 182.784 23.3838ZM110.332 35.8486L81.8618 45.1013L57.9726 86.4376L86.4426 77.1848L110.332 35.8486ZM21.3448 98.3548L32.0576 94.8873L55.9103 53.5328L37.5143 59.5188C30.6101 61.7626 24.8798 66.6571 21.5839 73.1255C18.2881 79.594 17.6966 87.1068 19.9396 94.0113L21.3448 98.3548Z"/>
                                </svg>
                            </span>
                            <h3 className="service-title">Private Theater Events</h3>
                            <p className="service-description">
                                Create unforgettable memories with our exclusive private theater experience. Perfect for romantic dates, family gatherings, or special celebrations.
                            </p>
                            <ul className="service-features">
                                <li>Premium 4K Projection System</li>
                                <li>Dolby Atmos Surround Sound</li>
                                <li>Luxury Reclining Seats</li>
                                <li>Personalized Movie Selection</li>
                                <li>Complimentary Snacks & Beverages</li>
                            </ul>
                            <div className="service-price">Starting from ₹2,999</div>
                            <button className="service-button">Book Now</button>
                        </div>

                        {/* Special Celebrations */}
                        <div className="service-card">
                            <span className="service-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 174 184" fill="currentColor">
                                    <path d="M53.0489 49.3651L53.9435 50.1467L133.853 130.047C134.901 131.093 135.687 132.372 136.147 133.779C136.608 135.186 136.73 136.681 136.505 138.144C136.279 139.608 135.712 140.997 134.848 142.2C133.985 143.402 132.851 144.385 131.537 145.067L130.444 145.538L32.6524 181.575C14.2711 188.355 -3.63003 171.076 1.95406 152.722L2.42489 151.348L38.4531 53.5555C38.9294 52.2601 39.6846 51.0852 40.6653 50.1141C41.6461 49.1429 42.8283 48.3992 44.1283 47.9356C45.4283 47.472 46.8144 47.2999 48.1883 47.4314C49.5622 47.5629 50.8905 47.9948 52.079 48.6965L53.0489 49.3651ZM138.091 90.2711C146.669 90.7231 158.431 92.5311 168.657 98.6708C170.731 99.8999 172.253 101.877 172.913 104.195C173.572 106.514 173.317 108.996 172.201 111.132C171.085 113.268 169.192 114.895 166.912 115.678C164.632 116.46 162.14 116.339 159.947 115.338L158.968 114.82C152.545 110.96 144.334 109.453 137.102 109.076C134.122 108.912 131.135 108.924 128.156 109.114L125.181 109.406C122.724 109.723 120.242 109.059 118.271 107.559C116.3 106.058 115 103.842 114.652 101.39C114.304 98.9374 114.936 96.4468 116.412 94.4573C117.887 92.4679 120.087 91.1398 122.534 90.7608C127.692 90.0953 132.901 89.9282 138.091 90.2617M157.16 64.0269C159.559 64.0319 161.866 64.9526 163.609 66.601C165.353 68.2494 166.401 70.5011 166.541 72.8963C166.68 75.2916 165.9 77.6498 164.359 79.4893C162.819 81.3288 160.634 82.5109 158.252 82.7943L157.16 82.8602H150.493C148.093 82.8552 145.786 81.9345 144.043 80.2861C142.299 78.6377 141.251 76.386 141.112 73.9907C140.972 71.5954 141.752 69.2373 143.293 67.3978C144.833 65.5583 147.018 64.3761 149.4 64.0928L150.493 64.0269H157.16ZM127.196 56.8043C128.817 58.4258 129.791 60.5831 129.935 62.8716C130.079 65.1601 129.383 67.4225 127.977 69.2343L127.196 70.1194L117.205 80.1105C115.51 81.7994 113.236 82.7799 110.845 82.8529C108.453 82.9259 106.124 82.086 104.329 80.5037C102.535 78.9214 101.41 76.7153 101.183 74.3336C100.956 71.952 101.644 69.5732 103.108 67.6805L103.889 66.7954L113.871 56.8137C114.746 55.9382 115.784 55.2436 116.927 54.7697C118.071 54.2958 119.296 54.0519 120.533 54.0519C121.771 54.0519 122.996 54.2958 124.139 54.7697C125.283 55.2436 126.321 55.9288 127.196 56.8043ZM102.835 7.22553C107.053 19.9004 104.793 33.7805 102.157 43.4797C100.579 49.5286 98.4021 55.4054 95.6593 61.0229C94.5442 63.2582 92.5868 64.9589 90.2178 65.7509C87.8487 66.5429 85.2621 66.3614 83.0268 65.2463C80.7916 64.1312 79.0909 62.1738 78.2989 59.8048C77.5069 57.4357 77.6884 54.8491 78.8035 52.6139C80.9945 48.1022 82.7295 43.383 83.9826 38.5265C86.1202 30.6919 87.1937 22.1886 85.5458 15.2203L84.9714 13.1863C84.561 12.0086 84.3886 10.7612 84.4643 9.51636C84.5399 8.27154 84.8621 7.05415 85.4121 5.93486C85.962 4.81556 86.7289 3.81666 87.668 2.99614C88.6072 2.17562 89.7 1.54982 90.883 1.15507C92.066 0.760328 93.3156 0.604499 94.5593 0.696631C95.803 0.788764 97.016 1.12702 98.1279 1.69177C99.2398 2.25652 100.228 3.03651 101.036 3.98647C101.845 4.93642 102.456 6.03741 102.835 7.22553ZM153.826 30.1834C155.591 31.9492 156.583 34.344 156.583 36.8409C156.583 39.3379 155.591 41.7326 153.826 43.4985L147.168 50.1561C146.3 51.0555 145.261 51.7729 144.112 52.2664C142.963 52.7599 141.727 53.0197 140.477 53.0306C139.227 53.0414 137.987 52.8032 136.829 52.3297C135.672 51.8562 134.621 51.157 133.737 50.2728C132.852 49.3887 132.153 48.3373 131.68 47.18C131.206 46.0227 130.968 44.7828 130.979 43.5324C130.99 42.2821 131.25 41.0464 131.743 39.8976C132.237 38.7487 132.954 37.7096 133.853 36.8409L140.511 30.1834C142.277 28.418 144.672 27.4263 147.168 27.4263C149.665 27.4263 152.06 28.418 153.826 30.1834Z"/>
                                </svg>
                            </span>
                            <h3 className="service-title">Special Celebrations</h3>
                            <p className="service-description">
                                Make your special occasions extraordinary with our themed celebration packages. From birthdays to anniversaries, we create magical moments.
                            </p>
                            <ul className="service-features">
                                <li>Themed Decorations</li>
                                <li>Custom Cake & Treats</li>
                                <li>Photo Booth Setup</li>
                                <li>Party Favors & Gifts</li>
                                <li>Dedicated Event Coordinator</li>
                            </ul>
                            <div className="service-price">Starting from ₹4,999</div>
                            <button className="service-button">Book Now</button>
                        </div>

                        {/* Corporate Events */}
                        <div className="service-card">
                            <span className="service-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 128 130" fill="currentColor">
                                    <path d="M127.75 74.5C127.75 90.4485 126.864 103.034 126.07 111.078C125.308 118.841 119.884 125.415 111.807 126.747C103.08 128.186 88.0605 129.75 64 129.75C39.9395 129.75 24.9201 128.186 16.1934 126.747C8.11553 125.415 2.69469 118.841 1.92969 111.078C1.1392 103.034 0.25 90.4485 0.25 74.5C0.250001 73.6066 0.253123 72.7242 0.258789 71.8535C7.62349 74.2113 15.0242 76.456 22.458 78.5859C29.9351 80.7251 37.993 82.8725 45.2803 84.4932C52.4684 86.0883 59.2428 87.25 64 87.25C68.7572 87.25 75.5316 86.0883 82.7197 84.4932C90.007 82.8725 98.0621 80.7222 105.542 78.5859C113.03 76.4496 119.972 74.3108 125.044 72.71L127.741 71.8516C127.747 72.724 127.75 73.6068 127.75 74.5ZM64 0.833008C67.8618 0.833011 71.0838 1.11694 73.5176 1.4541C78.4218 2.12574 82.3653 5.25663 84.4336 9.41016C85.7709 12.0962 87.5452 15.9751 88.7295 19.8936C99.0795 20.4829 106.574 21.3897 111.807 22.251C119.884 23.5826 125.304 30.1557 126.069 37.9189C126.87 46.2493 127.377 54.6057 127.591 62.9717C119.506 65.592 111.378 68.0729 103.208 70.4141C95.8102 72.5277 87.93 74.6275 80.875 76.1943C73.7181 77.7866 67.74 78.75 64 78.75C60.2572 78.75 54.2818 77.7866 47.125 76.1943C40.07 74.6275 32.187 72.5286 24.792 70.4121C16.6214 68.0709 8.49166 65.5892 0.40625 62.9688C0.623012 54.6047 1.13054 46.2505 1.92969 37.9219C2.69185 30.1585 8.11553 23.5856 16.1934 22.2539C21.4265 21.3898 28.9205 20.4829 39.2705 19.8936C40.4548 15.9751 42.2291 12.0962 43.5664 9.41016C45.6347 5.25664 49.5781 2.12572 54.4795 1.4541C56.9162 1.11977 60.1382 0.833008 64 0.833008ZM64 12.167C60.6964 12.167 57.9934 12.4135 56.0186 12.6826C55.1289 12.8045 54.2473 13.3825 53.709 14.4648C52.9724 15.9438 52.1789 17.6524 51.4678 19.4033C55.34 19.3013 59.5177 19.25 64 19.25C68.4842 19.2538 72.6619 19.3051 76.5322 19.4033C75.8239 17.6524 75.0305 15.9466 74.291 14.4648C73.7527 13.3825 72.8711 12.8045 71.9814 12.6826C69.3355 12.3319 66.669 12.1597 64 12.167Z"/>
                                </svg>
                            </span>
                            <h3 className="service-title">Corporate Events</h3>
                            <p className="service-description">
                                Host professional meetings, presentations, and team building events in our state-of-the-art corporate theater facilities.
                            </p>
                            <ul className="service-features">
                                <li>High-Speed WiFi & AV Equipment</li>
                                <li>Conference Room Setup</li>
                                <li>Catering Services</li>
                                <li>Professional Staff Support</li>
                                <li>Flexible Seating Arrangements</li>
                            </ul>
                            <div className="service-price">Starting from ₹6,999</div>
                            <button className="service-button">Book Now</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <h2 className="cta-title">Ready to Book Your Experience?</h2>
                    <p className="cta-description">
                        Contact us today to customize your perfect private theater experience. Our team is ready to make your special moments unforgettable.
                    </p>
                    <a href='/theater'>
                    <button className="cta-button">Book Now</button>
                    </a>
                </div>
            </section>

        </div>
    );
}
