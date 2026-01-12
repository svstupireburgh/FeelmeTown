'use client';

import { useEffect } from 'react';

import HeroContent from "../components/HeroContent";
import WhyChooseUs from '../components/WhyChooseUs';
import TrustedBy from "../components/ui/TrustedBy";
import Portfolio from "../components/Portfolio";
import MoviesSection from "../components/MoviesSection";
import TestimonialPage from "../components/testimonials";
import Footer from "../components/Footer";
import FloatingNavigation from "../components/FloatingNavigation";
import FAQ from "../components/FAQ";

export default function Home() {
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

  return (
    <div>
      <HeroContent />
      <div id="movies">
        <MoviesSection />
      </div>
      <Portfolio />
      <WhyChooseUs />
      <TrustedBy />
      <div id="testimonials">
        <TestimonialPage />
      </div>
      <script src="https://elfsightcdn.com/platform.js" async></script>
      <div style={{ padding: '2rem' }}>
        <div className="elfsight-app-02be31e2-4629-41fc-94ff-bd0f18ca4f6b" data-elfsight-app-lazy></div>
      </div>
      <FAQ />
    </div>
  );
}
