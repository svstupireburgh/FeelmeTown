'use client';

import React, { useEffect, useState } from 'react';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const scrollToHash = () => {
            const hash = window.location.hash;
            if (!hash) return;
            const id = hash.replace('#', '');
            if (!id) return;

            let attempts = 0;
            const tryScroll = () => {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return true;
                }
                return false;
            };

            if (tryScroll()) return;

            const interval = window.setInterval(() => {
                attempts += 1;
                if (tryScroll() || attempts >= 20) {
                    window.clearInterval(interval);
                }
            }, 100);
        };

        scrollToHash();
        window.addEventListener('hashchange', scrollToHash);
        return () => window.removeEventListener('hashchange', scrollToHash);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission here
        
        setIsSubmitted(true);
    };

    const handleSubmitAnother = () => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', phone: '', message: '' });
    };

    return (
        <div className="contact-page" id="contact">
            <style jsx>{`
                .contact-page {
                    min-height: 100vh;
                    background-color: #000000;
                    color: #ffffff;
                    overflow-x: hidden;
                    position: relative;
                }

                .contact-page::after {
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

                .contact-page::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 1;
                }

                .contact-hero, .contact-section {
                    position: relative;
                    z-index: 2;
                }

                .contact-hero {
                    padding: 8rem 0 4rem;
                    text-align: center;
                   
                }

                .contact-hero h1 {
                    font-size: 4rem;
                    font-weight: bold;
                    margin-bottom: 1rem;
                    background: linear-gradient(45deg, #ED2024, #ff6b6b);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .contact-hero p {
                    font-size: 1.2rem;
                    color: #cccccc;
                    max-width: 600px;
                    margin: 0 auto;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .contact-section {
                    padding: 4rem 0;
                }

                .contact-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4rem;
                    align-items: start;
                }

                .contact-info {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                    border: 2px solid rgba(237, 32, 36, 0.3);
                    border-radius: 1rem;
                    padding: 2rem;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }

                .contact-info h2 {
                    font-size: 2rem;
                    margin-bottom: 1.5rem;
                    color: #ED2024;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .contact-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 0.5rem;
                    transition: all 0.3s ease;
                }

                .contact-item:hover {
                    background: rgba(237, 32, 36, 0.1);
                    transform: translateX(5px);
                }

                .contact-icon {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(45deg, #ED2024, #ff6b6b);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1rem;
                    font-size: 1.2rem;
                }

                .contact-details h3 {
                    font-size: 1.1rem;
                    margin-bottom: 0.25rem;
                    color: #ffffff;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .contact-details p {
                    color: #cccccc;
                    font-size: 0.9rem;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .contact-form {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                    border: 2px solid rgba(237, 32, 36, 0.3);
                    border-radius: 1rem;
                    padding: 2rem;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }

                .contact-form h2 {
                    font-size: 2rem;
                    margin-bottom: 1.5rem;
                    color: #ED2024;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: #ffffff;
                    font-weight: 500;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .form-group input,
                .form-group textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-radius: 0.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                }

                .form-group input:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: #ED2024;
                    background: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 0 0 3px rgba(237, 32, 36, 0.2);
                }

                .form-group input::placeholder,
                .form-group textarea::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }

                .form-group textarea {
                    height: 120px;
                    resize: vertical;
                }

                .submit-btn {
                    background: linear-gradient(45deg, #ED2024, #ff6b6b);
                    color: #ffffff;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 0.5rem;
                    font-size: 1.1rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    width: 100%;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                }

                .submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(237, 32, 36, 0.3);
                }

                .submit-btn:active {
                    transform: translateY(0);
                }

                /* Thank You Animation */
                .contact-form {
                    position: relative;
                    min-height: 500px;
                }

                .contact-form form {
                    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                }

                .contact-form form.fade-out {
                    opacity: 0;
                    transform: scale(0.95);
                    pointer-events: none;
                }

                .thank-you-message {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                    border: 2px solid rgba(237, 32, 36, 0.3);
                    border-radius: 1rem;
                    padding: 2rem;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                    animation: thankYouFadeIn 0.6s ease-out forwards;
                    z-index: 10;
                }

                .thank-you-icon {
                    width: 80px;
                    height: 80px;
                    background: #ffffff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                    animation: iconBounce 0.8s ease-out 0.3s both;
                }

                .thank-you-icon svg {
                    width: 40px;
                    height: 40px;
                    fill: white;
                }

                .thank-you-title {
                    font-size: 2rem;
                    font-weight: bold;
                    color: #ED2024;
                    margin-bottom: 1rem;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    animation: slideInUp 0.6s ease-out 0.4s both;
                }

                .thank-you-text {
                    font-size: 1.1rem;
                    color: #cccccc;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                    font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
                    animation: slideInUp 0.6s ease-out 0.5s both;
                }

                .submit-another-btn {
                    background: linear-gradient(45deg, #ED2024, #ff6b6b);
                    color: #ffffff;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
                    animation: slideInUp 0.6s ease-out 0.6s both;
                }

                .submit-another-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(237, 32, 36, 0.3);
                }

                .submit-another-btn:active {
                    transform: translateY(0);
                }

                @keyframes thankYouFadeIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.7) translateY(30px);
                    }
                    50% {
                        opacity: 0.8;
                        transform: scale(1.05) translateY(-5px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                @keyframes iconBounce {
                    0% {
                        transform: scale(0) rotate(-180deg);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.3) rotate(0deg);
                        opacity: 1;
                    }
                    70% {
                        transform: scale(0.9) rotate(0deg);
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }

                @keyframes slideInUp {
                    0% {
                        opacity: 0;
                        transform: translateY(40px) scale(0.9);
                    }
                    60% {
                        opacity: 0.8;
                        transform: translateY(-5px) scale(1.02);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .contact-hero h1 {
                        font-size: 2.5rem;
                    }

                    .contact-hero p {
                        font-size: 1rem;
                    }

                    .contact-grid {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                    }

                    .contact-info,
                    .contact-form {
                        padding: 1.5rem;
                    }

                    .contact-item {
                        flex-direction: column;
                        text-align: center;
                    }

                    .contact-icon {
                        margin-right: 0;
                        margin-bottom: 0.5rem;
                    }
                }

                @media (max-width: 480px) {
                    .contact-hero {
                        padding: 6rem 0 2rem;
                    }

                    .contact-hero h1 {
                        font-size: 2rem;
                    }

                    .container {
                        padding: 0 1rem;
                    }

                    .contact-info,
                    .contact-form {
                        padding: 1rem;
                    }
                }
            `}</style>

            {/* Hero Section */}
            <section className="contact-hero">
                <div className="container">
                    <h1>Contact Us</h1>
                    <p>Get in touch with us for any inquiries, bookings, or special requests. We&apos;re here to make your experience unforgettable!</p>
                </div>
            </section>

            {/* Contact Section */}
            <section className="contact-section">
                <div className="container">
                    <div className="contact-grid">
                        {/* Contact Information */}
                        <div className="contact-info">
                            <h2>Get In Touch</h2>

                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 248 224" fill="none">
                                        <path d="M245.508 52.046L216.058 29.354C214.056 28.0697 211.88 27.08 209.597 26.4152C207.324 25.6734 204.956 25.264 202.566 25.2H117.8L127.732 87.2H202.566C204.6 87.2 207.142 86.7412 209.585 85.9848C212.028 85.2284 214.384 84.1868 216.045 83.0584L245.495 60.3416C247.169 59.2132 248 57.7128 248 56.2C248 54.6872 247.169 53.1868 245.508 52.046ZM105.4 0.399994H93C91.3557 0.399994 89.7787 1.05321 88.6159 2.21593C87.4532 3.37866 86.8 4.95565 86.8 6.59999V50H45.4336C43.3752 50 40.8456 50.4588 38.4028 51.2276C35.9476 51.9716 33.604 53.0008 31.9424 54.154L2.4924 76.846C0.8184 77.9744 0 79.4872 0 81C0 82.5004 0.8184 84.0008 2.4924 85.154L31.9424 107.871C33.604 108.999 35.9476 110.041 38.4028 110.785C40.8456 111.541 43.3752 112 45.4336 112H86.8V217.4C86.8 219.044 87.4532 220.621 88.6159 221.784C89.7787 222.947 91.3557 223.6 93 223.6H105.4C107.044 223.6 108.621 222.947 109.784 221.784C110.947 220.621 111.6 219.044 111.6 217.4V6.59999C111.6 4.95565 110.947 3.37866 109.784 2.21593C108.621 1.05321 107.044 0.399994 105.4 0.399994Z" fill="white" />
                                    </svg>
                                </div>
                                <div className="contact-details">
                                    <h3>Address</h3>
                                    <p>Builtup Plot No.G-123-A, Extn-I, Sector 7 Dwarka,</p>
                                    <p>Southwest Delhi, DL 110045, India</p>
                                </div>
                            </div>

                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 189 178" fill="none">
                                        <path d="M131.458 114.438L126.719 119.156C126.719 119.156 115.437 130.365 84.6562 99.7604C53.875 69.1562 65.1562 57.9479 65.1562 57.9479L68.1354 54.9687C75.5 47.6562 76.1979 35.9062 69.7708 27.3229L56.6458 9.79166C48.6875 -0.833339 33.3229 -2.23959 24.2083 6.82291L7.85413 23.0729C3.34372 27.5729 0.322881 33.3854 0.687465 39.8437C1.62496 56.375 9.10413 91.9271 50.8125 133.406C95.0521 177.385 136.562 179.135 153.531 177.552C158.906 177.052 163.573 174.323 167.333 170.573L182.125 155.865C192.125 145.937 189.312 128.906 176.521 121.958L156.625 111.135C148.229 106.583 138.021 107.917 131.458 114.438Z" fill="white" />
                                    </svg>
                                </div>
                                <div className="contact-details">
                                    <h3>Phone</h3>
                                    <p>+91 8700671099
                                    </p>
                                </div>
                            </div>

                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 88 70" fill="none">
                                        <path d="M78.6666 0.333334H9.33329C4.56663 0.333334 0.709959 4.23333 0.709959 9L0.666626 61C0.666626 65.7667 4.56663 69.6667 9.33329 69.6667H78.6666C83.4333 69.6667 87.3333 65.7667 87.3333 61V9C87.3333 4.23333 83.4333 0.333334 78.6666 0.333334ZM78.6666 17.6667L44 39.3333L9.33329 17.6667V9L44 30.6667L78.6666 9V17.6667Z" fill="white" />
                                    </svg>
                                </div>
                                <div className="contact-details">
                                    <h3>Email</h3>
                                    <p>svstupireburgh@gmail.com</p>
                                </div>
                            </div>

                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 76 76" fill="none">
                                        <path d="M38 0.5C17.375 0.5 0.5 17.375 0.5 38C0.5 58.625 17.375 75.5 38 75.5C58.625 75.5 75.5 58.625 75.5 38C75.5 17.375 58.625 0.5 38 0.5ZM53.75 53.75L34.25 41.75V19.25H39.875V38.75L56.75 48.875L53.75 53.75Z" fill="white" />
                                    </svg>
                                </div>
                                <div className="contact-details">
                                    <h3>Hours</h3>
                                    <p>Mon - Sun: 10:00 AM - 12:00 AM<br />
                                        Open 7 days a week</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="contact-form">
                            <h2>Send us a Message</h2>

                            {!isSubmitted ? (
                                <form onSubmit={handleSubmit} className={isSubmitted ? 'fade-out' : ''}>
                                    <div className="form-group">
                                        <label htmlFor="name">Full Name</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email Address</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter your email address"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="phone">Phone Number</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="Enter your phone number"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="message">Message</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            placeholder="Tell us about your requirements..."
                                            required
                                        ></textarea>
                                    </div>

                                    <button type="submit" className="submit-btn">
                                        Send Message
                                    </button>
                                </form>
                            ) : (
                                <div className="thank-you-message">
                                    <div className="thank-you-icon">
                                        <span style={{ fontSize: '40px' }}>❤️</span>
                                    </div>
                                    <h3 className="thank-you-title">Thank You!</h3>
                                    <p className="thank-you-text">
                                        Thank you for your response!<br />
                                        We will contact you soon.
                                    </p>
                                    <button onClick={handleSubmitAnother} className="submit-another-btn">
                                        Submit Another Response
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

