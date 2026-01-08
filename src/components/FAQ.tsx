'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';


interface FAQItem {
    _id: string;
    question: string;
    answer: string;
    category: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const FAQ: React.FC = () => {
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [faqData, setFaqData] = useState<FAQItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch FAQs from database
    useEffect(() => {
        const fetchFAQs = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('🔄 Fetching FAQs from database...');
                const response = await fetch('/api/faqs');
                const data = await response.json();
                
                console.log('📊 FAQ API Response:', data);
                
                console.log('🔍 Full API Response:', JSON.stringify(data, null, 2));
                
                if (data.success && data.faqs && data.faqs.length > 0) {
                    console.log('✅ FAQs loaded successfully:', data.faqs.length, 'items');
                    console.log('📋 FAQ Data:', data.faqs);
                    setFaqData(data.faqs);
                } else if (data.success && data.faqs && data.faqs.length === 0) {
                    console.log('📭 No FAQs found in database');
                    setFaqData([]);
                } else {
                    console.error('❌ FAQ API Error:', data.error);
                    setError(data.error || 'Failed to load FAQs');
                    setFaqData([]);
                }
            } catch (error) {
                console.error('❌ Error fetching FAQs:', error);
                setError('Failed to load FAQs from database');
                setFaqData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFAQs();
    }, []);

    const toggleExpanded = (id: string) => {
        setExpandedItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };


    return (
        <div id="faq" className="faq-container">
            <div className="faq-header">
                <HelpCircle className="faq-header-icon" />
                <h1 className="faq-title">Frequently Asked Questions</h1>
                <p className="faq-subtitle">
                    Everything you need to know about FeelME Town's premium theater experience
                </p>
            </div>

            <div className="faq-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#ED2024' }}>
                        <HelpCircle size={32} className="animate-spin" />
                        <p style={{ marginTop: '16px', fontSize: '1.125rem' }}>Loading FAQs...</p>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                        <HelpCircle size={32} style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Failed to load FAQs</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{error}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            style={{ 
                                marginTop: '16px', 
                                padding: '8px 16px', 
                                backgroundColor: '#ED2024', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : faqData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <HelpCircle size={32} style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '1.125rem' }}>No FAQs available at the moment.</p>
                        <p style={{ fontSize: '0.875rem' }}>Please check back later or contact support for assistance.</p>
                    </div>
                ) : (
                    faqData
                        .filter(item => item.isActive)
                        .sort((a, b) => a.order - b.order)
                        .map((item) => (
                            <div
                                key={item._id}
                                className={`faq-item ${expandedItems.includes(item._id) ? 'expanded' : ''}`}
                            >
                                <button
                                    className="faq-question-button"
                                    onClick={() => toggleExpanded(item._id)}
                                    aria-expanded={expandedItems.includes(item._id)}
                                >
                                    <span className="faq-question-text">{item.question}</span>
                                    <div className="faq-icon-container">
                                        {expandedItems.includes(item._id) ? (
                                            <ChevronUp className="faq-icon" />
                                        ) : (
                                            <ChevronDown className="faq-icon" />
                                        )}
                                    </div>
                                </button>

                                <div className={`faq-answer-container ${expandedItems.includes(item._id) ? 'expanded' : ''}`}>
                                    <div className="faq-answer-content">
                                        <p className="faq-answer-text">{item.answer}</p>
                                        {item.category && (
                                            <div style={{ 
                                                marginTop: '12px', 
                                                fontSize: '0.75rem', 
                                                color: '#ED2024',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                {item.category}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                )}
            </div>

            <div className="faq-footer">
                <h3 className="faq-footer-title">Still have questions?</h3>
                <p className="faq-footer-text">
                    Contact our support team for personalized assistance with your booking and inquiries.
                </p>
                <button
                    className="faq-contact-button"
                    onClick={() => {
                        // Dispatch a custom event that FloatingNavigation listens for
                        const evt = new Event('open-help-popup');
                        window.dispatchEvent(evt);
                    }}
                >
                    Contact Support
                </button>
            </div>
            <style jsx>{`
            /* FAQ Component - Netflix Style Design */

             .faq-container {
               max-width: 100vw;
               margin: 0 auto;
               padding: 60px 20px;
               background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
               min-height: 100vh;
               font-family: ParalucentCond-DemiBold;
               scroll-margin-top: 100px; /* allow anchor jump below fixed header */
             }
             
             .faq-header {
               text-align: center;
               margin-bottom: 60px;
               padding: 40px 0;
             }
             
             .faq-header-icon {
               width: 60px;
               height: 60px;
               color: #ED2024;
               margin: 0 auto 20px;
               display: block;
               filter: drop-shadow(0 0 10px rgba(237, 32, 36, 0.3));
             }
             
             .faq-title {
               font-size: 3.5rem;
               font-weight: 700;
               color: #ffffff;
               margin: 0 0 20px 0;
               text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
               letter-spacing: -0.02em;
             }
             
             .faq-subtitle {
               font-size: 1.4rem;
               color: #b3b3b3;
               margin: 0;
               font-weight: 400;
               line-height: 1.5;
               max-width: 600px;
               margin: 0 auto;
             }
             
             .faq-content {
               max-width: 1400px;
               margin: 0 auto;
             }
             
             .faq-grid {
               display: grid;
               grid-template-columns: 1fr 1fr;
               gap: 30px;
               align-items: start;
             }
             
             .faq-column {
               display: flex;
               flex-direction: column;
             }
             
             .faq-left-column {
               padding-right: 15px;
             }
             
             .faq-right-column {
               padding-left: 15px;
             }
             
             .faq-item {
               background: rgba(20, 20, 20, 0.8);
               border: 1px solid rgba(255, 255, 255, 0.1);
               border-radius: 8px;
               margin-bottom: 8px;
               overflow: hidden;
               transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
               backdrop-filter: blur(10px);
             }
             
             .faq-item:hover {
               border-color: rgba(237, 32, 36, 0.3);
               box-shadow: 0 4px 20px rgba(237, 32, 36, 0.1);
               transform: translateY(-2px);
             }
             
             .faq-item.expanded {
               border-color: #ED2024;
               box-shadow: 0 8px 30px rgba(237, 32, 36, 0.2);
             }
             
             .faq-question-button {
               width: 100%;
               padding: 24px 30px;
               background: transparent;
               border: none;
               color: #ffffff;
               font-size: 1rem;
               font-weight: 600;
               text-align: left;
               cursor: pointer;
               display: flex;
               justify-content: space-between;
               align-items: center;
               transition: all 0.3s ease;
               line-height: 1.5;
             }
             
             .faq-question-button:hover {
               background: rgba(237, 32, 36, 0.05);
               color: #ED2024;
             }
             
             .faq-question-button:focus {
               outline: none;
               background: rgba(237, 32, 36, 0.1);
             }
             
             .faq-question-text {
               flex: 1;
               margin-right: 20px;
               font-family: ParalucentCond-DemiBold;
             }
             
             .faq-icon-container {
               display: flex;
               align-items: center;
               justify-content: center;
               width: 32px;
               height: 32px;
               background: rgba(237, 32, 36, 0.1);
               border-radius: 50%;
               transition: all 0.3s ease;
             }
             
             .faq-item.expanded .faq-icon-container {
               background: #ED2024;
               transform: rotate(180deg);
             }
             
             .faq-icon {
               width: 20px;
               height: 20px;
               color: #ED2024;
               transition: all 0.3s ease;
             }
             
             .faq-item.expanded .faq-icon {
               color: #ffffff;
             }
             
             .faq-answer-container {
               max-height: 0;
               overflow: hidden;
               transition: max-height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
               background: rgba(10, 10, 10, 0.5);
             }
             
             .faq-answer-container.expanded {
               max-height: 500px;
               border-top: 1px solid rgba(237, 32, 36, 0.2);
             }
             
             .faq-answer-content {
               padding: 30px;
               border-left: 3px solid #ED2024;
               margin-left: 30px;
               margin-right: 30px;
               background: rgba(237, 32, 36, 0.02);
               border-radius: 0 8px 8px 0;
             }
             
             .faq-answer-text {
               color: #e5e5e5;
               font-size: 1.1rem;
               line-height: 1.7;
               margin: 0;
               font-weight: 400;
               letter-spacing: 0.01em;
             }
             
            .faq-footer {
              text-align: center;
              margin-top: 48px;
              padding: 28px 20px;
              background: linear-gradient(135deg, rgba(237, 32, 36, 0.08) 0%, rgba(237, 32, 36, 0.04) 100%);
              border-radius: 12px;
              border: 1px solid rgba(237, 32, 36, 0.18);
              backdrop-filter: blur(8px);
            }
             
            .faq-footer-title {
              font-size: 1.5rem;
              font-weight: 700;
              color: #ffffff;
              margin: 0 0 10px 0;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            }
             
            .faq-footer-text {
              font-size: 0.95rem;
              color: #bfbfbf;
              margin: 0 0 16px 0;
              line-height: 1.5;
              max-width: 480px;
              margin-left: auto;
              margin-right: auto;
            }
             
            .faq-contact-button {
              background: linear-gradient(135deg, #ED2024 0%, #ff4444 100%);
              color: #ffffff;
              border: none;
              padding: 10px 22px;
              font-size: 0.9rem;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              box-shadow: 0 3px 10px rgba(237, 32, 36, 0.25);
            }
             
             .faq-contact-button:hover {
               background: linear-gradient(135deg, #ff4444 0%, #ED2024 100%);
               transform: translateY(-2px);
               box-shadow: 0 8px 25px rgba(237, 32, 36, 0.4);
             }
             
             .faq-contact-button:active {
               transform: translateY(0);
               box-shadow: 0 4px 15px rgba(237, 32, 36, 0.3);
             }
             
             /* Responsive Design */
             @media (max-width: 1024px) {
               .faq-grid {
                 grid-template-columns: 1fr;
                 gap: 20px;
               }
             
               .faq-left-column,
               .faq-right-column {
                 padding-left: 0;
                 padding-right: 0;
               }
             
               .faq-content {
                 max-width: 900px;
               }
             }
             
             @media (max-width: 768px) {
               .faq-container {
                 padding: 40px 15px;
               }
             
               .faq-grid {
                 grid-template-columns: 1fr;
                 gap: 15px;
               }
             
               .faq-left-column,
               .faq-right-column {
                 padding-left: 0;
                 padding-right: 0;
               }
             
               .faq-title {
                 font-size: 2.5rem;
               }
             
               .faq-subtitle {
                 font-size: 1.2rem;
               }
             
               .faq-question-button {
                 padding: 20px 20px;
                 font-size: 1.1rem;
               }
             
               .faq-answer-content {
                 padding: 20px;
                 margin-left: 20px;
                 margin-right: 20px;
               }
             
               .faq-answer-text {
                 font-size: 1rem;
               }
             
               .faq-footer {
                 padding: 40px 20px;
                 margin-top: 60px;
               }
             
               .faq-footer-title {
                 font-size: 1.8rem;
               }
             
               .faq-footer-text {
                 font-size: 1.1rem;
               }
             }
             
             @media (max-width: 480px) {
               .faq-title {
                 font-size: 2rem;
               }
             
               .faq-subtitle {
                 font-size: 1.1rem;
               }
             
               .faq-question-button {
                 padding: 18px 15px;
                 font-size: 1rem;
               }
             
               .faq-question-text {
                 margin-right: 15px;
               }
             
               .faq-answer-content {
                 padding: 18px;
                 margin-left: 15px;
                 margin-right: 15px;
               }
             
               .faq-contact-button {
                 padding: 14px 30px;
                 font-size: 1rem;
               }
             }
             
             /* Animation for smooth expand/collapse */
             @keyframes fadeInUp {
               from {
                 opacity: 0;
                 transform: translateY(10px);
               }
               to {
                 opacity: 1;
                 transform: translateY(0);
               }
             }
             
             .faq-answer-container.expanded .faq-answer-content {
               animation: fadeInUp 0.3s ease-out;
             }
             
             /* Accessibility improvements */
             .faq-question-button:focus-visible {
               outline: 2px solid #ED2024;
               outline-offset: 2px;
             }
             
             /* Loading animation for icons */
             .faq-icon {
               transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
             }

             /* Loading animation */
             .animate-spin {
               animation: spin 1s linear infinite;
             }

             @keyframes spin {
               from {
                 transform: rotate(0deg);
               }
               to {
                 transform: rotate(360deg);
               }
             }
             
             /* Hover effects for better UX */
             .faq-item:hover .faq-question-text {
               color: #ED2024;
             }
             
             .faq-item:hover .faq-icon-container {
               background: rgba(237, 32, 36, 0.2);
               transform: scale(1.1);
             }

            `}</style>
        </div>

    );
};

export default FAQ;
