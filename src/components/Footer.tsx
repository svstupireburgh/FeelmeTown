import React from 'react';
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';

const FeelMeTownFooter: React.FC = () => {
  return (
    <>
      <footer className="feelme-footer">
        <div className="container">
          {/* Background gradient overlay */}
          <div className="bg-overlay"></div>
          
          {/* Animated background elements */}
          <div className="bg-elements">
            <div className="glow-circle glow-1"></div>
            <div className="glow-circle glow-2"></div>
            <div className="glow-circle glow-3"></div>
          </div>

          <div className="footer-content">
            <div className="footer-grid">
              
              {/* 1st Div: Company Info Section */}
              <div className="company-info">
                <h2 className="company-title">FEELME TOWN</h2>
                <div className="company-details">
                  <div className="detail-item">
                    <MapPin className="icon" />
                    <div>
                      <p>Builtup Plot No.G-123-A, Extn-I, Sector 7 Dwarka,</p>
                      <p>Southwest Delhi, DL 110045, India</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <Phone className="icon" />
                    <div>
                      <p><a href="tel:08700671099" className="contact-link">08700671099</a></p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <Mail className="icon" />
                    <div>
                      <p><a href="mailto:svstupireburgh@gmail.com" className="contact-link">svstupireburgh@gmail.com</a></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2nd Div: Useful Links */}
              <div className="links-section">
                <h3 className="section-title">Useful Links</h3>
                <div className="links-grid">
                  <ul className="links-list">
                    <li><a href="#" className="footer-link">Home</a></li>
                    <li><a href="/about" className="footer-link">About us</a></li>
                    <li><a href="/services" className="footer-link">Services</a></li>
                    <li><a href="/contact" className="footer-link">Contact us</a></li>
                    <li>
                      <a
                        href="/"
                        className="footer-link"
                        onClick={(e) => {
                          // If already on the homepage, smooth-scroll to #faq instead of full navigation
                          try {
                            if (typeof window !== 'undefined' && window.location.pathname === '/') {
                              e.preventDefault();
                              const el = document.getElementById('faq');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              } else {
                                // Fallback: navigate to anchor
                                window.location.hash = '#faq';
                              }
                            }
                          } catch {}
                        }}
                      >
                        FAQs
                      </a>
                    </li>
                  </ul>
                  <ul className="links-list">
                    <li><a href="/theater" className="footer-link">Theatre</a></li>
                    <li><a href="#" className="footer-link">Return & Refunds</a></li>
                    <li><a href="#" className="footer-link">Terms & Conditions</a></li>
                    <li><a href="#" className="footer-link">Privacy policy</a></li>
                  </ul>
                </div>
              </div>

              {/* 3rd Div: Social Media + Maps */}
              <div className="social-maps-section">
                <h3 className="section-title">Social Media</h3>
                <div className="social-icons">
                  <a href="https://www.facebook.com/feelmetown" className="social-icon">
                    <Facebook className="icon" />
                  </a>
                  <a href="https://www.instagram.com/feelmetown/" className="social-icon">
                    <Instagram className="icon" />
                  </a>
                  <a href="https://www.youtube.com/feelmetown-mrss" className="social-icon">
                    <Youtube className="icon" />
                  </a>
                </div>
                
                <div className="maps-preview">
                  <h4 className="maps-title">Find Us</h4>
                  <div className="map-container">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d218.95724495157705!2d77.07234799614683!3d28.59029789976595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d1b5b989bf975%3A0xed51189cf06a31e5!2z4KSr4KS_4KSy4KSu4KWHIOCkn-CkvuCkieCkqg!5e0!3m2!1shi!2sin!4v1757356468206!5m2!1shi!2sin"
                      width="100%"
                      height="200"
                      style={{ border: 0, borderRadius: '8px' }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="FeelMe Town Location"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <div className="footer-bottom">
              <div className="copyright">
                <p>© Copyright <span className="highlight">FeelMe Town</span>. All Rights Reserved</p>
                <p>Designed by <a href="https://cybershoora.com" target="_blank" rel="noopener noreferrer"><span  className="designer">CyberShoora</span></a></p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .feelme-footer {
          position: relative;
          min-height: 60vh;
          background: transparent;
          color: white;
          overflow: hidden;
          padding: 60px 0 30px;
        }

        .container {
          width: 100%;
          max-width: 100vw;
          margin: 0;
          padding: 0 20px;
          position: relative;
          z-index: 10;
        }

        .bg-overlay {
          position: absolute;
          inset: 0;
          background: transparent;
          z-index: 1;
        }

        .bg-elements {
          position: absolute;
          inset: 0;
          z-index: 2;
        }

        .glow-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: pulse 3s ease-in-out infinite;
        }

        .glow-1 {
          top: 80px;
          left: 40px;
          width: 128px;
          height: 128px;
          background: rgba(220, 38, 38, 0.1);
          animation-delay: 0s;
        }

        .glow-2 {
          bottom: 160px;
          right: 80px;
          width: 192px;
          height: 192px;
          background: rgba(239, 68, 68, 0.08);
          animation-delay: 1s;
        }

        .glow-3 {
          top: 50%;
          left: 33%;
          width: 96px;
          height: 96px;
          background: rgba(185, 28, 28, 0.15);
          animation-delay: 0.5s;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        .footer-content {
          position: relative;
          z-index: 10;
          width: 100%;
          margin: 0;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
          align-items: stretch;
        }

        .company-info {
          padding: 30px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          min-height: 100%;
        }

        .company-info::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.6s ease;
        }

        .company-info:hover::before {
          left: 100%;
        }

        .company-info:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 69, 69, 0.3);
        }

        .company-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(45deg, #dc2626, #ef4444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 24px;
          text-shadow: 0 0 30px rgba(220, 38, 38, 0.5);
        }

        .company-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(220, 38, 38, 0.1);
          transition: all 0.3s ease;
        }

        .detail-item:hover {
          border-bottom-color: rgba(220, 38, 38, 0.3);
          transform: translateX(5px);
        }

        .detail-item .icon {
          width: 20px;
          height: 20px;
          color: #dc2626;
          margin-top: 2px;
          filter: drop-shadow(0 0 8px rgba(220, 38, 38, 0.6));
        }

        .detail-item p {
          margin: 0;
          line-height: 1.5;
          color: #d1d5db;
        }

        .detail-item strong {
          color: #dc2626;
        }

        .contact-link {
          color: #d1d5db;
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
        }

        .contact-link:hover {
          color: #dc2626;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
        }

        .contact-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background: #dc2626;
          transition: width 0.3s ease;
        }

        .contact-link:hover::after {
          width: 100%;
        }

        .links-section, .social-maps-section {
          display: flex;
          flex-direction: column;
          padding: 30px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          min-height: 100%;
        }

        .links-section::before, .social-maps-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.6s ease;
        }

        .links-section:hover::before, .social-maps-section:hover::before {
          left: 100%;
        }

        .links-section:hover, .social-maps-section:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 69, 69, 0.3);
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 20px;
          position: relative;
          text-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
        }

        .section-title::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 30px;
          height: 2px;
          background: linear-gradient(90deg, #dc2626, transparent);
          box-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
        }

        .links-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .links-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-link {
          color: #9ca3af;
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
          padding: 8px 0;
          display: inline-block;
        }

        .footer-link::before {
          content: '›';
          color: #dc2626;
          margin-right: 8px;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
        }

        .footer-link:hover::before {
          opacity: 1;
          transform: translateX(0);
        }

        .footer-link:hover {
          color: #dc2626;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
          transform: translateX(10px);
        }

        .social-icons {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }

        .social-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          
          border: 1px solid rgba(220, 38, 38, 0.4);
          border-radius: 50%;
          text-decoration: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .social-icon::before {
          content: '';
          position: absolute;
          inset: 0;
         
          border-radius: 50%;
          filter: blur(10px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .social-icon:hover::before {
          opacity: 1;
        }

        .social-icon:hover {
          border-color: rgba(220, 38, 38, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
        }

        .social-icon .icon {
          width: 20px;
          height: 20px;
          color: #dc2626;
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .social-icon:hover .icon {
          color: #ef4444;
          filter: drop-shadow(0 0 8px rgba(220, 38, 38, 0.8));
        }

        .maps-preview {
          margin-top: 20px;
        }

        .maps-title {
          font-size: 1rem;
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 12px;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
        }

        .map-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.05);
        }

        .map-container iframe {
          border-radius: 8px;
          filter: grayscale(20%) contrast(1.1);
          transition: filter 0.3s ease;
        }

        .map-container:hover iframe {
          filter: grayscale(0%) contrast(1.2);
        }

        .footer-bottom {
          border-top: 1px solid rgba(220, 38, 38, 0.2);
          padding: 30px;
          margin-top: 40px;
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          backdrop-filter: blur(15px);
          overflow: hidden;
        }

        .footer-bottom::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }

        .footer-bottom:hover::after {
          left: 100%;
        }

        .footer-bottom:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 69, 69, 0.2);
        }

        .footer-bottom::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #dc2626, transparent);
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.6);
        }

        .copyright {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .copyright p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .highlight {
          color: #dc2626;
          font-weight: 600;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
        }

        .designer {
          background: linear-gradient(45deg, #f59e0b, #eab308);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 600;
          text-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }

        /* Responsive Design - Fixed for Mobile */
        @media (max-width: 992px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }
          
          .company-info {
            grid-column: 1 / -1;
            margin-bottom: 20px;
          }
          
          .links-section,
          .social-maps-section {
            padding: 25px;
          }
        }

        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 25px;
          }
          
          .company-info,
          .links-section, 
          .social-maps-section {
            padding: 25px;
            margin-bottom: 0;
            grid-column: unset;
          }
          
          .links-grid {
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .section-title {
            font-size: 1.1rem;
            margin-bottom: 15px;
          }
          
          .social-icons {
            justify-content: flex-start;
          }
        }

        @media (max-width: 576px) {
          .feelme-footer {
            padding: 40px 0 20px;
          }
          
          .container {
            padding: 0 15px;
          }
          
          .footer-grid {
            gap: 20px;
          }
          
          .company-info,
          .links-section, 
          .social-maps-section {
            padding: 20px;
          }
          
           .links-grid {
             grid-template-columns: 1fr 1fr;
             gap: 15px;
           }
          
          .links-list {
            gap: 8px;
          }
          
          .footer-link {
            padding: 6px 0;
            font-size: 0.9rem;
          }
          
          .company-title {
            font-size: 1.5rem;
          }
          
          .section-title {
            font-size: 1rem;
          }
          
          .social-icons {
            justify-content: center;
            gap: 12px;
          }
          
          .social-icon {
            width: 42px;
            height: 42px;
          }
          
          .social-icon .icon {
            width: 18px;
            height: 18px;
          }
          
          .copyright {
            font-size: 0.8rem;
          }
          
          .footer-bottom {
            padding: 20px;
          }
        }

         @media (max-width: 480px) {
           .links-grid {
             grid-template-columns: 1fr 1fr;
           }
          
          .company-title {
            font-size: 1.3rem;
            margin-bottom: 20px;
          }
          
          .detail-item {
            padding: 10px 0;
          }
          
          .detail-item .icon {
            width: 18px;
            height: 18px;
          }
          
          .map-container iframe {
            height: 180px;
          }
        }
      `}</style>
    </>
  );
};

export default FeelMeTownFooter;