'use client';

import React, { useState, useEffect } from 'react';

interface GalleryImage {
    _id: string;
    imageUrl: string;
    alt: string;
    title?: string;
    description?: string;
    category?: string;
    isActive: boolean;
    createdAt: string;
}

export default function Gallery() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch gallery images from database
    useEffect(() => {
        const fetchGalleryImages = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/gallery');
                const data = await response.json();
                
                if (data.success) {
                    setGalleryImages(data.images || []);
                } else {
                    setError(data.error || 'Failed to fetch gallery images');
                }
            } catch (err) {
                setError('Failed to fetch gallery images');
                console.error('Error fetching gallery images:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchGalleryImages();
    }, []);

    // Use only database images
    const allImages = galleryImages;

    // Split images into two rows
    const topRowImages = allImages.slice(0, 8); // First 8 images
    const bottomRowImages = allImages.slice(6, 14); // Last 8 images (with 2 overlap)
    
    // Triple images for better infinite scroll effect (like testimonials)
    const extendedTopImages = [...topRowImages, ...topRowImages, ...topRowImages];
    const extendedBottomImages = [...bottomRowImages, ...bottomRowImages, ...bottomRowImages];

    return (
        <div className="gallery-page">
            <style jsx>{`
                .gallery-page {
                    min-height: 100vh;
                    background-color: #000000;
                    color: #ffffff;
                    overflow-x: hidden;
                    position: relative;
                }

                .gallery-page::after {
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

                .gallery-page::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 1;
                }

                .gallery-hero {
                    padding: 8rem 0 4rem;
                    text-align: center;
                    position: relative;
                    z-index: 2;
                }

                .gallery-hero h1 {
                    font-size: 3.5rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                }

                .gallery-hero p {
                    font-size: 1.25rem;
                    color: #d1d5db;
                    max-width: 600px;
                    margin: 0 auto;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .gallery-section {
                    padding: 4rem 0;
                    position: relative;
                    z-index: 2;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .gallery-container {
                    position: relative;
                    overflow: hidden;
                    padding: 2rem 0;
                }

                .gallery-container {
                    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%);
                    mask-image: linear-gradient(to right, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%);
                }

                .gallery-row {
                    margin-bottom: 2rem;
                    overflow: hidden;
                }

                .gallery-row-rtl {
                    display: flex;
                    animation: scrollRTL 80s linear infinite;
                    gap: 1rem;
                }

                .gallery-row-rtl:hover {
                    animation-play-state: paused;
                }

                .gallery-row-ltr {
                    display: flex;
                    animation: scrollLTR 80s linear infinite;
                    gap: 1rem;
                }

                .gallery-row-ltr:hover {
                    animation-play-state: paused;
                }

                .gallery-image-card {
                    flex-shrink: 0;
                    width: 600px;
                    height: 337px;
                    margin-right: 1rem;
                    position: relative;
                    overflow: hidden;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: transform 0.3s ease;
                }

                .gallery-image-card:hover {
                    transform: scale(1.05);
                }

                .gallery-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 0.5rem;
                }

                /* Popup Styles */
                .image-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }

                .image-popup-content {
                    position: relative;
                    max-width: 90vw;
                    max-height: 90vh;
                    background: #000;
                    border-radius: 1rem;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }

                .popup-image {
                    width: 100%;
                    height: auto;
                    max-height: 90vh;
                    object-fit: contain;
                }

                .popup-close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    font-size: 1.5rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .popup-close-btn:hover {
                    background: #ED2024;
                    transform: scale(1.1);
                }

                @keyframes scrollRTL {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-100%);
                    }
                }

                @keyframes scrollLTR {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(0);
                    }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .gallery-hero h1 {
                        font-size: 2.5rem;
                    }

                    .gallery-hero p {
                        font-size: 1rem;
                    }

                    .gallery-image-card {
                        width: 450px;
                        height: 253px;
                    }

                    .gallery-container {
                        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 50px, black calc(100% - 50px), transparent 100%);
                        mask-image: linear-gradient(to right, transparent 0%, black 50px, black calc(100% - 50px), transparent 100%);
                    }
                }
            `}</style>

            {/* Hero Section */}
            <section className="gallery-hero">
                <div className="container">
                    <h1>Our Gallery</h1>
                    <p>Explore our beautiful collection of cakes, gifts, and party decorations that make every moment special.</p>
                </div>
            </section>

            {/* Gallery Section */}
            <section className="gallery-section">
                <div className="container">
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#d1d5db' }}>
                            <p>Loading gallery images...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#ED2024' }}>
                            <p>Error: {error}</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                Please try again later or contact support.
                            </p>
                        </div>
                    )}
                    
                    <div className="gallery-container">
                        {/* Top Row - Right to Left (8 images) */}
                        <div className="gallery-row">
                            <div 
                                className="gallery-row-rtl"
                                style={{ width: `${extendedTopImages.length * 20}rem` }}
                            >
                                {extendedTopImages.map((image, index) => (
                                    <div 
                                        key={`top-${index}`} 
                                        className="gallery-image-card"
                                        onClick={() => setSelectedImage(image.imageUrl)}
                                    >
                                        <img
                                            src={image.imageUrl}
                                            alt={image.alt}
                                            className="gallery-image"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Row - Left to Right (8 images) */}
                        <div className="gallery-row">
                            <div 
                                className="gallery-row-ltr"
                                style={{ width: `${extendedBottomImages.length * 20}rem` }}
                            >
                                {extendedBottomImages.map((image, index) => (
                                    <div 
                                        key={`bottom-${index}`} 
                                        className="gallery-image-card"
                                        onClick={() => setSelectedImage(image.imageUrl)}
                                    >
                                        <img
                                            src={image.imageUrl}
                                            alt={image.alt}
                                            className="gallery-image"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Image Popup */}
            {selectedImage && (
                <div 
                    className="image-popup-overlay"
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="image-popup-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="popup-close-btn"
                            onClick={() => setSelectedImage(null)}
                        >
                            ×
                        </button>
                        <img
                            src={selectedImage}
                            alt="Gallery Image"
                            className="popup-image"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
