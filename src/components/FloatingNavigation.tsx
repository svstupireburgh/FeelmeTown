'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { usePathname } from 'next/navigation';

const sanitizePhoneNumber = (value?: string | null) => value?.replace(/[^\d]/g, '') ?? '';

const maleAvatars = [
  '/images/Avatars/male/avatar1.svg',
  '/images/Avatars/male/avatar2.svg',
  '/images/Avatars/male/avatar3.svg',
  '/images/Avatars/male/avatar4.svg',
  '/images/Avatars/male/avatar5.svg',
  '/images/Avatars/male/avatar6.svg',
  '/images/Avatars/male/avatar7.svg',
  '/images/Avatars/male/avatar8.svg',
  '/images/Avatars/male/avatar9.svg',
  '/images/Avatars/male/avatar10.svg',
  '/images/Avatars/male/avatar11.svg',
  '/images/Avatars/male/avatar12.svg',
  '/images/Avatars/male/avatar13.svg',
  '/images/Avatars/male/avatar14.svg',
  '/images/Avatars/male/avatar15.svg',
  '/images/Avatars/male/avatar16.svg',
  '/images/Avatars/male/avatar17.svg',
  '/images/Avatars/male/avatar18.svg',
  '/images/Avatars/male/avatar19.svg',
  '/images/Avatars/male/avatar20.svg',
  '/images/Avatars/male/avatar21.svg',
  '/images/Avatars/male/avatar22.svg'
];

const femaleAvatars = [
  '/images/Avatars/female/avatar1.svg',
  '/images/Avatars/female/avatar2.svg',
  '/images/Avatars/female/avatar3.svg',
  '/images/Avatars/female/avatar4.svg',
  '/images/Avatars/female/avatar5.svg',
  '/images/Avatars/female/avatar6.svg',
  '/images/Avatars/female/avatar7.svg',
  '/images/Avatars/female/avatar8.svg',
  '/images/Avatars/female/avatar9.svg',
  '/images/Avatars/female/avatar10.svg',
  '/images/Avatars/female/avatar11.svg',
  '/images/Avatars/female/avatar12.svg',
  '/images/Avatars/female/avatar13.svg',
  '/images/Avatars/female/avatar14.svg',
  '/images/Avatars/female/avatar15.svg',
  '/images/Avatars/female/avatar16.svg',
  '/images/Avatars/female/avatar17.svg',
  '/images/Avatars/female/avatar18.svg',
  '/images/Avatars/female/avatar19.svg'
];

const pickRandomAvatar = (gender?: 'male' | 'female') => {
  const genderToUse = gender ?? (Math.random() < 0.5 ? 'male' : 'female');
  const pool = genderToUse === 'male' ? maleAvatars : femaleAvatars;
  const path = pool[Math.floor(Math.random() * pool.length)];
  return {
    path,
    type: genderToUse === 'male' ? 'random_male' as const : 'random_female' as const
  };
};

type AvatarSelectionType = 'uploaded' | 'random_male' | 'random_female' | '';

type FeedbackFormState = {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  avatarType: AvatarSelectionType;
  socialHandle: string;
  message: string;
  rating: number;
};

const initialFeedbackFormState: FeedbackFormState = {
  name: '',
  email: '',
  phone: '',
  avatar: '',
  avatarType: '',
  socialHandle: '',
  message: '',
  rating: 0
};

const FloatingNavigation = () => {
  const pathname = usePathname();
  if (pathname?.startsWith('/invoice')) {
    return null;
  }

  const { openBookingPopup } = useBooking();

  const handleBookingClick = () => {
    openBookingPopup();
  };

  const [isOpen, setIsOpen] = useState(false);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Effect to prevent background scrolling when popup is open
  useEffect(() => {
    if (showFeedbackPopup) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0';
    }
    
    // Cleanup function to reset styles when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0';
    };
  }, [showFeedbackPopup]);

  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormState>(initialFeedbackFormState);

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [showAIPopup, setShowAIPopup] = useState(false);
  const [showCallOptionsPopup, setShowCallOptionsPopup] = useState(false);
  const [showComingSoonPopup, setShowComingSoonPopup] = useState(false);
  const [showAvatarSelectionPopup, setShowAvatarSelectionPopup] = useState(false);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: number, text: string, isBot: boolean, isTyping?: boolean }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>(''); // Will be fetched from DB
  const [contactWhatsApp, setContactWhatsApp] = useState<string>(''); // Will be fetched from DB
  const [contactEmail, setContactEmail] = useState<string>('feelmetown@gmail.com'); // Fallback
  const [contactAddress, setContactAddress] = useState<string>('FeelME Town, Dwarka, Delhi'); // Fallback
  const [prefilledMessages, setPrefilledMessages] = useState<string[]>([]);

  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Always auto-scroll to the latest chat message
  useEffect(() => {
    if (!chatMessagesRef.current) return;

    const container = chatMessagesRef.current;
    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    // Defer until after DOM updates for smoother scrolling
    const timer = window.requestAnimationFrame(scrollToBottom);

    return () => {
      window.cancelAnimationFrame(timer);
    };
  }, [chatMessages]);

  // Disable body scroll when AI popup is open
  useEffect(() => {
    if (showAIPopup) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px'; // Prevent layout shift
    } else {
      // Enable scrolling
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [showAIPopup]);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        // Fetch from system settings API
        const response = await fetch('/api/ai-system-info');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.systemInfo) {
            const phone = data.systemInfo.sitePhone || '';
            const whatsapp = data.systemInfo.siteWhatsapp || '';
            const email = data.systemInfo.siteEmail || 'feelmetown@gmail.com';
            const address = data.systemInfo.siteAddress || 'FeelME Town, Dwarka, Delhi';
            setContactPhone(phone);
            setContactWhatsApp(whatsapp);
            setContactEmail(email);
            setContactAddress(address);
            const dbNumber = sanitizePhoneNumber(whatsapp);
            if (dbNumber) {
              setWhatsappNumber(dbNumber);
            }
            console.log('✅ Contact info fetched from system settings:', { phone, whatsapp, email, address });
          }
        }
      } catch (error) {
        console.error('⚠️ Failed to fetch contact info:', error);
      }
    };
    fetchContactInfo();
  }, []);
  
  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) return;
        const data = await response.json();
        const dbNumber = sanitizePhoneNumber(data.settings?.siteWhatsapp);
        if (dbNumber) {
          setWhatsappNumber(dbNumber);
        }

        const messagesFromSettings = Array.isArray(data.settings?.whatsappPrefilledMessages)
          ? data.settings.whatsappPrefilledMessages.filter((msg: unknown): msg is string => typeof msg === 'string' && msg.trim().length > 0)
          : [];
        if (messagesFromSettings.length) {
          setPrefilledMessages(messagesFromSettings);
        } else {
          setPrefilledMessages([]);
        }
      } catch (error) {
        console.error('Failed to fetch WhatsApp number:', error);
      }
    };

    fetchNumber();
  }, []);

  const applyRandomAvatar = (gender?: 'male' | 'female') => {
    const randomAvatar = pickRandomAvatar(gender);
    setSelectedAvatar(randomAvatar.path);
    setFeedbackForm(prev => ({
      ...prev,
      avatar: randomAvatar.path,
      avatarType: randomAvatar.type
    }));
    setUploadedFileName(`Random ${randomAvatar.type.includes('female') ? 'female' : 'male'} avatar`);
  };

  useEffect(() => {
    if (showFeedbackPopup && !feedbackForm.avatar) {
      applyRandomAvatar();
    }
  }, [showFeedbackPopup, feedbackForm.avatar]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: string) => {
    setIsOpen(false);
    switch (option) {
      case 'Feedback':
        setShowFeedbackPopup(true);
        break;
      case 'Help':
        setShowHelpPopup(true);
        break;
      case 'AI':
        // Clear chat history when opening AI popup
        setChatMessages([]);
        setNewMessage('');
        setShowAIPopup(true);
        break;
      case 'Booking':
        handleBookingClick();
        break;
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if avatar is selected
    if (!feedbackForm.avatar) {
      alert('Please select an avatar before submitting feedback!');
      return;
    }

    if (!feedbackForm.rating || feedbackForm.rating < 1) {
      alert('Please select a rating before submitting feedback!');
      return;
    }

    if (isSubmittingFeedback) return;

    try {
      setIsSubmittingFeedback(true);

      const normalizedPhone = sanitizePhoneNumber(feedbackForm.phone);

      const detectPlatform = () => {
        const handle = (feedbackForm.socialHandle || '').toLowerCase();
        if (!handle) return null;
        if (handle.includes('insta')) return 'Instagram';
        if (handle.includes('facebook') || handle.includes('fb')) return 'Facebook';
        if (handle.includes('twitter') || handle.includes('x.com')) return 'Twitter / X';
        if (handle.includes('youtube')) return 'YouTube';
        if (handle.includes('linkedin')) return 'LinkedIn';
        return 'Social';
      };

      // If no avatar type was recorded, default to random male/female depending on file path
      const inferredAvatarType = (() => {
        if (feedbackForm.avatarType) return feedbackForm.avatarType;
        if (!feedbackForm.avatar) return '';
        if (feedbackForm.avatar.includes('/female/')) return 'random_female';
        if (feedbackForm.avatar.includes('/male/')) return 'random_male';
        if (feedbackForm.avatar.startsWith('http')) return 'uploaded';
        return '';
      })();

      const payload = {
        name: feedbackForm.name.trim(),
        email: feedbackForm.email.trim(),
        phone: normalizedPhone,
        avatar: feedbackForm.avatar,
        avatarType: inferredAvatarType || undefined,
        socialHandle: feedbackForm.socialHandle?.trim() || null,
        socialPlatform: detectPlatform(),
        message: feedbackForm.message.trim(),
        rating: feedbackForm.rating
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        console.error('Feedback API error:', data);
        alert(data.error || 'Failed to submit feedback. Please try again.');
        return;
      }

      console.log('✅ Feedback submitted:', data);

      setShowFeedbackPopup(false);
      setFeedbackForm(initialFeedbackFormState);
      setSelectedAvatar('');
      setUploadedFileName('');
      alert(data.message || 'Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Unable to submit feedback right now. Please try again later.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFeedbackForm(prev => ({ ...prev, rating }));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedAvatar(result);
        setFeedbackForm(prev => ({
          ...prev,
          avatar: result,
          avatarType: 'uploaded'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getRandomAvatar = () => {
    setShowAvatarSelectionPopup(true);
  };

  const selectGenderAvatar = (gender: 'male' | 'female') => {
    applyRandomAvatar(gender);
    setShowAvatarSelectionPopup(false);
  };

  const handleChatSend = async () => {
    if (newMessage.trim()) {
      const userMessage = { id: Date.now(), text: newMessage, isBot: false };
      setChatMessages(prev => [...prev, userMessage]);
      const currentMessage = newMessage;
      setNewMessage('');

      // Add typing indicator
      const typingMessage = { id: Date.now() + 1, text: "Ankit is typing...", isBot: true, isTyping: true };
      setChatMessages(prev => [...prev, typingMessage]);

      try {
        console.log('🤖 Sending message to AI:', currentMessage);

        // Call OpenRouter API
        const response = await fetch('/api/ai-assistant/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            conversationHistory: chatMessages.filter(msg => !msg.isTyping).map(msg => ({
              role: msg.isBot ? 'assistant' : 'user',
              content: msg.text
            }))
          }),
        });

        if (!response.ok) {
          console.error('❌ AI API Response not ok:', response.status, response.statusText);
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('❌ Error details:', errorText);
          throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        // Remove typing indicator
        setChatMessages(prev => prev.filter(msg => !msg.isTyping));

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let displayText = '';

        // Add initial AI message
        const aiMessageId = Date.now() + 2;
        setChatMessages(prev => [...prev, { id: aiMessageId, text: '', isBot: true }]);

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process complete SSE events separated by double newlines
              let sepIndex;
              while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
                const eventBlock = buffer.slice(0, sepIndex).trim();
                buffer = buffer.slice(sepIndex + 2);

                const lines = eventBlock.split('\n');
                for (const line of lines) {
                  if (!line.startsWith('data:')) continue;
                  const dataStr = line.slice(5).trim();

                  if (dataStr === '[DONE]') {
                    setChatMessages(prev =>
                      prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, text: displayText } : msg
                      )
                    );
                    return;
                  }

                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.content;
                    if (delta) {
                      displayText += delta;
                      setChatMessages(prev =>
                        prev.map(msg =>
                          msg.id === aiMessageId ? { ...msg, text: displayText } : msg
                        )
                      );
                    }
                  } catch {
                    // Ignore non-JSON or keep-alive events
                  }
                }
              }
            }

            // Flush any remaining buffered content
            if (buffer.trim()) {
              const lines = buffer.trim().split('\n').filter(l => l.startsWith('data:'));
              for (const line of lines) {
                const dataStr = line.slice(5).trim();
                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.content;
                  if (delta) {
                    displayText += delta;
                  }
                } catch { }
              }
              setChatMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId ? { ...msg, text: displayText } : msg
                )
              );
            }

            // Check if we got any actual content - if not, it might be a technical issue
            if (!displayText.trim()) {
              // No content received - fetch contact info on-demand
              const fetchContactForError = async () => {
                try {
                  const response = await fetch('/api/ai-system-info');
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.systemInfo) {
                      const phone = data.systemInfo.sitePhone || contactPhone;
                      const whatsapp = data.systemInfo.siteWhatsapp || contactWhatsApp;
                      const email = data.systemInfo.siteEmail || contactEmail;
                      const address = data.systemInfo.siteAddress || contactAddress;
                      const noContentMessage = `Hmm, mujhe kuch response nahi mila yaar! 😅 Kya aap phir se try kar sakte ho? Ya phir contact karo:\n\n📞 Phone: ${phone}\n💬 WhatsApp: ${whatsapp}\n📧 Email: ${email}\n📍 Address: ${address}`;
                      setChatMessages(prev =>
                        prev.map(msg =>
                          msg.id === aiMessageId ? { ...msg, text: noContentMessage } : msg
                        )
                      );
                      return;
                    }
                  }
                } catch (fetchError) {
                  console.error('Failed to fetch contact info for error:', fetchError);
                }
                // Fallback to current state if fetch fails
                const noContentMessage = `Hmm, mujhe kuch response nahi mila yaar! 😅 Kya aap phir se try kar sakte ho? Ya phir contact karo:\n\n📞 Phone: ${contactPhone}\n💬 WhatsApp: ${contactWhatsApp}\n📧 Email: ${contactEmail}\n📍 Address: ${contactAddress}`;
                setChatMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, text: noContentMessage } : msg
                  )
                );
              };
              fetchContactForError();
            }
          } catch (streamError) {
            console.error('Streaming error:', streamError);
            // Fetch contact info on-demand to ensure we have latest from database
            const fetchContactForError = async () => {
              try {
                const response = await fetch('/api/ai-system-info');
                if (response.ok) {
                  const data = await response.json();
                  if (data.success && data.systemInfo) {
                    const phone = data.systemInfo.sitePhone || contactPhone;
                    const whatsapp = data.systemInfo.siteWhatsapp || contactWhatsApp;
                    const email = data.systemInfo.siteEmail || contactEmail;
                    const address = data.systemInfo.siteAddress || contactAddress;
                    const technicalErrorMessage = `Sorry yaar, thoda technical issue aa gaya! 😅 Main help kar sakta hun - contact karo:\n\n📞 Phone: ${phone}\n💬 WhatsApp: ${whatsapp}\n📧 Email: ${email}\n📍 Address: ${address}\n\nYa phir thoda wait karke phir se try karo!`;
                    setChatMessages(prev =>
                      prev.map(msg =>
                        msg.id === aiMessageId
                          ? { ...msg, text: technicalErrorMessage }
                          : msg
                      )
                    );
                    return;
                  }
                }
              } catch (fetchError) {
                console.error('Failed to fetch contact info for error:', fetchError);
              }
              // Fallback to current state if fetch fails
              const technicalErrorMessage = `Sorry yaar, thoda technical issue aa gaya! 😅 Main help kar sakta hun - contact karo:\n\n📞 Phone: ${contactPhone}\n💬 WhatsApp: ${contactWhatsApp}\n📧 Email: ${contactEmail}\n📍 Address: ${contactAddress}\n\nYa phir thoda wait karke phir se try karo!`;
              setChatMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, text: technicalErrorMessage }
                    : msg
                )
              );
            };
            fetchContactForError();
          }
        }
      } catch (error) {
        console.error('AI Chat Error:', error);
        // Remove typing indicator
        setChatMessages(prev => prev.filter(msg => !msg.isTyping));

        // Only show technical issue message for actual API/network errors
        // Check if it's a real technical error (network, API failure) vs just wrong words
        const isTechnicalError = error instanceof Error && (
          error.message.includes('API') || 
          error.message.includes('network') || 
          error.message.includes('fetch') ||
          error.message.includes('Failed') ||
          error.message.includes('Error')
        );

        if (isTechnicalError) {
          // Actual technical error - fetch contact info on-demand to ensure latest from database
          const fetchContactForError = async () => {
            try {
              const response = await fetch('/api/ai-system-info');
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.systemInfo) {
                  const phone = data.systemInfo.sitePhone || contactPhone;
                  const whatsapp = data.systemInfo.siteWhatsapp || contactWhatsApp;
                  const email = data.systemInfo.siteEmail || contactEmail;
                  const address = data.systemInfo.siteAddress || contactAddress;
                  const technicalErrorMessage = `Arre yaar, sorry! 😅 Abhi thoda technical issue aa raha hai. But don't worry, main Ankit hun na - main manually help kar sakta hun!\n\nTheater booking ke liye contact karo:\n📞 Phone: ${phone}\n💬 WhatsApp: ${whatsapp}\n📧 Email: ${email}\n📍 Address: ${address}\n\nMain personally dekh lunga! 💪`;
                  const errorMessage = {
                    id: Date.now() + 3,
                    text: technicalErrorMessage,
                    isBot: true
                  };
                  setChatMessages(prev => [...prev, errorMessage]);
                  return;
                }
              }
            } catch (fetchError) {
              console.error('Failed to fetch contact info for error:', fetchError);
            }
            // Fallback to current state if fetch fails
            const technicalErrorMessage = `Arre yaar, sorry! 😅 Abhi thoda technical issue aa raha hai. But don't worry, main Ankit hun na - main manually help kar sakta hun!\n\nTheater booking ke liye contact karo:\n📞 Phone: ${contactPhone}\n💬 WhatsApp: ${contactWhatsApp}\n📧 Email: ${contactEmail}\n📍 Address: ${contactAddress}\n\nMain personally dekh lunga! 💪`;
            const errorMessage = {
              id: Date.now() + 3,
              text: technicalErrorMessage,
              isBot: true
            };
            setChatMessages(prev => [...prev, errorMessage]);
          };
          fetchContactForError();
        } else {
          // Not a technical error - let AI handle it naturally or show a friendly message
          const friendlyMessage = {
            id: Date.now() + 3,
            text: "Hmm, mujhe samajh nahi aaya yaar! 😅 Kya aap phir se explain kar sakte ho? Ya phir aap theater booking, pricing, ya kisi aur cheez ke baare mein puch sakte ho!",
            isBot: true
          };
          setChatMessages(prev => [...prev, friendlyMessage]);
        }
      }
    }
  };

  const handleWebCall = () => {
    // Open Google Meet or similar web calling service
    window.open('https://meet.google.com/new', '_blank');
    setShowCallOptionsPopup(false);
  };

  const handlePhoneCall = () => {
    setShowCallOptionsPopup(false);
    setShowComingSoonPopup(true);
  };

  const handleWhatsAppSend = () => {
    if (!whatsAppMessage.trim()) {
      alert('Please select a message or write your own.');
      return;
    }
    const phoneNumber = whatsappNumber;
    if (!phoneNumber) {
      alert('WhatsApp number is not configured.');
      return;
    }
    const encodedMessage = encodeURIComponent(whatsAppMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    setShowWhatsAppPopup(false);
    setWhatsAppMessage('');
  };

  return (
    <div className="floating-nav">
      {/* Menu Items */}
      <div className={`nav-menu ${isOpen ? 'open' : ''}`}>
        <div
          className="nav-item feedback"
          onClick={() => handleOptionClick('Feedback')}
        >
          <span className="nav-icon">💬</span>
          <span className="nav-label">Feedback</span>
        </div>
        <div
          className="nav-item help"
          onClick={() => handleOptionClick('Help')}
        >
          <span className="nav-icon">❓</span>
          <span className="nav-label">Help & Support</span>
        </div>
        <div
          className="nav-item ai"
          onClick={() => handleOptionClick('AI')}
        >
          <span className="nav-icon">🤖</span>
          <span className="nav-label">AI Help</span>
        </div>

      </div>

      {/* Main Button */}
      <div className="nav-toggle" onClick={toggleMenu}>
        <div className={`nav-icon-main ${isOpen ? 'open' : ''}`}>
          <span className="menu-line top" />
          <span className="menu-line middle" />
          <span className="menu-line bottom" />
        </div>
      </div>

      {/* Hover Bubbles */}
      <div className="bubble feedback">Click to Feedback</div>
      <div className="bubble help">Click to Help & Support</div>
      <div className="bubble ai">Click to AI Chat</div>
      <div className="bubble booking">Click to Book Show</div>
      {/* Floating WhatsApp Button */}
      <button
        type="button"
        className={`floating-whatsapp-button ${isOpen ? 'nav-open' : ''}`}
        onClick={() => setShowWhatsAppPopup(true)}
        title="Chat on WhatsApp"
      >
        <img src="/images/whatsapp-icon.svg" alt="WhatsApp" className="whatsapp-icon" />
      </button>

      {/* WhatsApp Popup */}
      {showWhatsAppPopup && (
        <div className="popup-overlay" onClick={() => setShowWhatsAppPopup(false)}>
          <div className="popup whatsapp-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Chat on WhatsApp</h3>
              <button className="close-btn" onClick={() => setShowWhatsAppPopup(false)}>×</button>
            </div>
            <div className="whatsapp-content">
              <div className="prefilled-messages">
                {prefilledMessages.length > 0 ? (
                  prefilledMessages.map((message, index) => (
                    <button
                      key={index}
                      type="button"
                      className="prefilled-msg-btn"
                      onClick={() => setWhatsAppMessage(message)}
                    >
                      {message}
                    </button>
                  ))
                ) : (
                  <p className="prefill-empty">No quick replies configured yet.</p>
                )}
              </div>
              <textarea
                className="whatsapp-textarea"
                placeholder="Or write your custom message..."
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
              />
              <button type="button" className="whatsapp-send-btn" onClick={handleWhatsAppSend}>
                Send on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Feedback Popup */}
      {showFeedbackPopup && (
        <div className="popup-overlay" onClick={() => setShowFeedbackPopup(false)}>
          <div className="popup feedback-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Send Feedback</h3>
              <button className="close-btn" onClick={() => setShowFeedbackPopup(false)}>×</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="feedback-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={feedbackForm.name}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                  required
                  placeholder="Full Name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={feedbackForm.email}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
                  required
                  placeholder="youremail@feelmetown"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={feedbackForm.phone}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="form-group">
                <label>Avatar</label>
                <div className="avatar-upload-container">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="avatar-upload-btn">
                    📷 Browse Photo
                  </label>
                  <button
                    type="button"
                    className="random-avatar-btn"
                    onClick={getRandomAvatar}
                  >
                    🎲 Random Avatar
                  </button>
                </div>
                {selectedAvatar && (
                  <div className="file-name-display">
                    📁 {uploadedFileName || 'Avatar Selected'}
                    <div className="small-avatar-preview">
                      <img
                        src={selectedAvatar}
                        alt="Small Preview"
                        onLoad={() => console.log('Small preview loaded:', selectedAvatar)}
                        onError={(e) => {
                          console.log('Small preview failed to load:', selectedAvatar);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                {selectedAvatar && (
                  <div className="avatar-preview">
                    <img
                      src={selectedAvatar}
                      alt="Avatar Preview"
                      onLoad={() => console.log('Large preview loaded:', selectedAvatar)}
                      onError={(e) => {
                        console.log('Large preview failed to load:', selectedAvatar);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Social Media Handle</label>
                <input
                  type="text"
                  value={feedbackForm.socialHandle}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, socialHandle: e.target.value })}
                  placeholder="@username or https://instagram.com/username"
                />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${star <= feedbackForm.rating ? 'active' : ''}`}
                      onClick={() => handleRatingClick(star)}
                    >
                      ⭐
                    </span>
                  ))}
                  <span className="rating-text">
                    {feedbackForm.rating > 0 ? `${feedbackForm.rating} star${feedbackForm.rating > 1 ? 's' : ''}` : 'Click to rate'}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  rows={4}
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-btn">Send Feedback</button>
            </form>
          </div>
        </div>
      )}

      {/* Help & Support Popup */}
      {showHelpPopup && (
        <div className="popup-overlay" onClick={() => setShowHelpPopup(false)}>
          <div className="popup help-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Help & Support</h3>
              <button className="close-btn" onClick={() => setShowHelpPopup(false)}>×</button>
            </div>
            <div className="help-content">
              <div className="help-section">
                <h4>📞 Contact Us</h4>
                <p>Phone: <a href="tel:+918700671099">+91 87006 71099</a></p>
                <p>WhatsApp: <a href="https://wa.me/918882669755">+91 88826 69755</a></p>
                <p>Email: <a href="mailto:svstupireburgh@gmail.com">info@feelmetown.com</a></p>
              </div>
              <div className="help-section">
                <h4>🕒 Operating Hours</h4>
                <p>Monday - Sunday: 10:00 AM - 11:00 PM</p>
              </div>
              <div className="help-section">
                <h4>❓ Common Questions</h4>
                <ul>
                  <li>How to book tickets?</li>
                  <li>What are the theater facilities?</li>
                  <li>How to cancel a booking?</li>
                  <li>What payment methods are accepted?</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot Popup */}
      {showAIPopup && (
        <div className="popup-overlay" onClick={() => setShowAIPopup(false)}>
          <div className="popup ai-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 18 20" fill="none">
                  <path d="M7.946 7.75301H7.929C7.84342 8.10247 7.74737 8.4493 7.641 8.79301L7.081 10.456H8.8L8.243 8.80001C8.116 8.42701 8.031 8.08601 7.946 7.75301ZM17.127 11.526C17.3077 11.0389 17.3751 10.517 17.324 9.99995C17.2729 9.48291 17.1046 8.98431 16.832 8.54201C17.002 7.57801 16.8003 6.91767 16.227 6.56101C16.351 5.48301 16.175 4.78534 15.699 4.46801C15.7276 4.20465 15.6781 3.93869 15.5567 3.70326C15.4352 3.46783 15.2472 3.27334 15.016 3.14401C15.0085 2.73366 14.8523 2.33999 14.5764 2.03614C14.3005 1.7323 13.9237 1.53894 13.516 1.49201C13.226 0.844007 12.4993 0.501007 11.336 0.463007C10.2587 -0.214993 9.39367 -0.148327 8.741 0.663007C8.711 0.451007 8.50267 0.30234 8.116 0.217007C7.25252 0.0779919 6.36764 0.246826 5.616 0.694007C5.48489 0.762975 5.34885 0.822137 5.209 0.871007C3.909 1.46501 3.22867 2.10201 3.168 2.78201C2.914 2.97266 2.71964 3.23179 2.6077 3.52899C2.49576 3.8262 2.47089 4.14916 2.536 4.46001C2.31071 4.61552 2.1422 4.84018 2.05595 5.09999C1.96971 5.35981 1.97043 5.64064 2.058 5.90001C1.82796 6.05908 1.64592 6.27817 1.53167 6.53346C1.41743 6.78875 1.37534 7.07047 1.41 7.34801C1.28116 7.50957 1.18638 7.69556 1.13138 7.89476C1.07638 8.09395 1.0623 8.30222 1.09 8.50701C0.850904 8.73712 0.692533 9.03831 0.638475 9.36572C0.584418 9.69313 0.637564 10.0292 0.79 10.324C0.631332 10.9179 0.686553 11.5487 0.946 12.106C0.906506 13.118 1.27052 14.1043 1.958 14.848C2.27118 15.3429 2.52906 15.8708 2.727 16.422C3.05148 16.8776 3.42284 17.2979 3.835 17.676C4.291 18.508 4.79267 18.883 5.34 18.801C5.50735 19.0902 5.76821 19.3137 6.07958 19.4347C6.39096 19.5558 6.73429 19.5672 7.053 19.467C7.757 20.0103 8.24133 19.941 8.506 19.259C8.758 18.9023 8.98 18.891 9.172 19.225C9.61133 20.2317 10.626 20.2573 12.216 19.302C12.5756 19.3312 12.9351 19.2445 13.2419 19.0547C13.5486 18.8648 13.7866 18.5818 13.921 18.247C14.1048 18.2227 14.2819 18.1614 14.4414 18.067C14.601 17.9726 14.7399 17.8469 14.8497 17.6974C14.9595 17.548 15.0381 17.378 15.0806 17.1975C15.123 17.017 15.1286 16.8297 15.097 16.647C15.2439 16.4854 15.3689 16.3052 15.469 16.111C16.379 15.8763 16.879 15.1237 16.969 13.853C17.2141 13.5204 17.3592 13.1248 17.3872 12.7125C17.4152 12.3003 17.3249 11.8887 17.127 11.526ZM9.065 0.900007C9.63433 0.156007 10.3227 0.135673 11.13 0.839007L11.167 0.826007C12.0397 0.524673 12.766 0.870673 13.346 1.86401C14.028 1.95934 14.4947 2.46134 14.746 3.37001C14.956 3.47014 15.1235 3.64173 15.2186 3.85407C15.3137 4.06641 15.3301 4.30566 15.265 4.52901L15.516 4.84001C15.6993 5.11584 15.8263 5.4251 15.89 5.75008C15.9537 6.07507 15.9526 6.40942 15.887 6.73401V6.74701C15.709 6.70766 15.524 6.71398 15.3492 6.76538C15.1743 6.81679 15.0153 6.91161 14.887 7.04101L14.609 6.60001C14.3605 6.3928 14.0404 6.29184 13.718 6.31901V6.15001C13.7179 5.61096 13.5533 5.08477 13.2464 4.64166C12.9394 4.19855 12.5046 3.85959 12 3.67001C12.2151 3.52374 12.4788 3.46707 12.735 3.51201C12.587 3.49467 12.4773 3.33334 12.406 3.02801C12.3212 2.98002 12.2569 2.90275 12.225 2.8107C12.1932 2.71864 12.196 2.61812 12.233 2.52801C11.7937 1.77334 11.5573 1.60667 11.524 2.02801C11.6529 2.22764 11.7081 2.46603 11.68 2.70201C12.052 2.92201 12.202 3.09501 12.13 3.22101L11.648 3.56901C11.4595 3.52755 11.267 3.50643 11.074 3.50601H10.364C10.348 3.48601 10.331 3.46601 10.313 3.44601C9.713 2.93001 9.45933 2.53201 9.552 2.25201C9.506 1.74934 9.81167 1.43234 10.469 1.30101C10.823 1.19101 10.7897 1.10434 10.369 1.04101C9.537 1.19834 9.15067 1.65401 9.21 2.40801L8.71 2.47701C8.65979 2.20379 8.66535 1.92324 8.72636 1.65223C8.78736 1.38122 8.90255 1.12535 9.065 0.900007ZM11.5 8.01701C11.4399 8.01758 11.3804 8.00599 11.3249 7.98294C11.2695 7.95988 11.2193 7.92584 11.1773 7.88286C11.1353 7.83988 11.1025 7.78885 11.0808 7.73285C11.0591 7.67685 11.049 7.61703 11.051 7.55701C11.0492 7.49519 11.06 7.43365 11.0828 7.37615C11.1055 7.31864 11.1397 7.26636 11.1833 7.22249C11.2269 7.17862 11.279 7.14407 11.3363 7.12095C11.3937 7.09783 11.4552 7.08663 11.517 7.08801C11.5797 7.08648 11.6421 7.09766 11.7004 7.12087C11.7586 7.14409 11.8116 7.17885 11.8561 7.22308C11.9006 7.2673 11.9357 7.32007 11.9593 7.37821C11.9828 7.43635 11.9944 7.49865 11.9932 7.56138C11.9921 7.6241 11.9783 7.68594 11.9526 7.74318C11.9269 7.80042 11.8899 7.85187 11.8438 7.89443C11.7978 7.937 11.7435 7.96981 11.6844 7.99087C11.6254 8.01194 11.5626 8.02083 11.5 8.01701ZM11.89 8.71701V12.844H11.144V8.71601L11.89 8.71701ZM9.843 3.39101C9.81173 3.42097 9.79102 3.46027 9.784 3.50301H8.859C8.81626 3.19754 8.75785 2.89447 8.684 2.59501L9.168 2.52601C9.07133 2.95601 9.29633 3.24434 9.843 3.39101ZM4.13 1.86201L4.339 1.88301C4.35233 1.80301 4.49367 1.66201 4.763 1.46001L4.832 1.53701L4.373 2.00001H4.025L4.13 1.86201ZM3.887 2.17801C4.042 2.17201 4.293 2.16601 4.65 2.16001C4.67467 2.16001 4.986 1.86601 5.584 1.27801H5.878C5.8942 1.23392 5.9254 1.19695 5.96613 1.17356C6.00686 1.15018 6.05452 1.14187 6.10076 1.1501C6.147 1.15833 6.18887 1.18257 6.21903 1.21857C6.24919 1.25457 6.26572 1.30004 6.26572 1.34701C6.26572 1.39397 6.24919 1.43944 6.21903 1.47544C6.18887 1.51144 6.147 1.53568 6.10076 1.54391C6.05452 1.55214 6.00686 1.54384 5.96613 1.52045C5.9254 1.49706 5.8942 1.46009 5.878 1.41601H5.593L4.719 2.30701L3.784 2.32101L3.887 2.17801ZM3.642 2.53201H5.142L5.592 2.11201L5.866 2.11901C5.87985 2.06057 5.91468 2.00926 5.96387 1.97481C6.01306 1.94037 6.07319 1.92519 6.13284 1.93216C6.19248 1.93913 6.24749 1.96777 6.28742 2.01263C6.32734 2.05749 6.3494 2.11545 6.3494 2.17551C6.3494 2.23556 6.32734 2.29352 6.28742 2.33838C6.24749 2.38324 6.19248 2.41188 6.13284 2.41885C6.07319 2.42582 6.01306 2.41064 5.96387 2.3762C5.91468 2.34175 5.87985 2.29044 5.866 2.23201H5.611L5.178 2.67301L3.566 2.65401C3.59 2.61401 3.61533 2.57334 3.642 2.53201ZM3.421 2.86901L6.093 2.86101L7.8 1.20001H8.512L8.482 1.34701H7.834L6.153 2.99101L3.353 2.96501L3.421 2.86901ZM8.021 3.36101H8.504V3.48801L8.069 3.48201L8.05 3.50101H7.87L8.021 3.36101ZM7.74 3.01001L7.226 3.50301H7.053L7.71 2.87401H8.419V3.00401L7.74 3.01001ZM3.121 3.36201L6.378 3.35601L6.428 3.31101C6.488 3.24901 6.82133 2.94601 7.428 2.40201L8.423 2.41001V2.52601H7.43L6.382 3.50001L3.067 3.48001C3.083 3.44301 3.1 3.40001 3.121 3.36201ZM2.947 3.84901L5.82 3.84201C5.74258 3.88629 5.66717 3.934 5.594 3.98501L2.919 3.97901C2.92689 3.93538 2.93623 3.89202 2.947 3.84901ZM2.523 5.11701C2.70835 4.88011 2.91126 4.65748 3.13 4.45101H2.891V4.31901L5.218 4.30701C5.17717 4.34796 5.13813 4.39067 5.101 4.43501L3.307 4.45001L2.583 5.18201L2.609 7.05701C2.66033 7.10234 2.94 7.35667 3.448 7.82001V8.05301L4.123 8.68501L4.132 9.61901L4.47 9.95501V10.105L4.032 9.67101L4.015 8.70001L3.34 8.07701V7.83701L2.5 7.08501L2.523 5.11701ZM3.99 15.147V14.974H4.116V15.147H3.99ZM4.116 15.204V15.58H3.992V15.2L4.116 15.204ZM3.979 12.578V12.414H4.123V12.578H3.979ZM3.153 10.266V9.71301L2.753 9.29901C2.72301 9.31804 2.68849 9.32874 2.653 9.33001C2.62877 9.3249 2.60648 9.31304 2.58872 9.29579C2.57096 9.27853 2.55846 9.2566 2.55265 9.23253C2.54685 9.20846 2.54798 9.18324 2.55593 9.15979C2.56387 9.13634 2.5783 9.11562 2.59754 9.10003C2.61678 9.08444 2.64004 9.07463 2.66463 9.07172C2.68922 9.06882 2.71413 9.07294 2.73647 9.08362C2.75881 9.09429 2.77767 9.11107 2.79086 9.13203C2.80405 9.15298 2.81103 9.17725 2.811 9.20201C2.81139 9.21642 2.80866 9.23075 2.803 9.24401L3.215 9.64401V10.206C3.902 10.887 4.315 11.299 4.475 11.458V12.269H4.391L4.399 11.978H4.439L4.451 11.551L3.153 10.266ZM3.903 12.414V12.578H3.741V12.414H3.903ZM3.742 12.273V11.982H3.9V12.273H3.742ZM3.69 12.414V12.578H3.526V12.414H3.69ZM3.467 12.578H3.325V12.414H3.466L3.467 12.578ZM3.267 11.978V12.269H3.067V11.978H3.153C3.1712 11.879 3.1819 11.7787 3.185 11.678C3.1631 11.6875 3.13916 11.6914 3.11537 11.6893C3.09157 11.6872 3.06869 11.6792 3.0488 11.6659C3.02891 11.6527 3.01266 11.6347 3.00151 11.6136C2.99037 11.5925 2.98469 11.5689 2.985 11.545C2.98334 11.5252 2.98582 11.5052 2.99228 11.4863C2.99874 11.4675 3.00903 11.4502 3.02252 11.4355C3.03601 11.4209 3.05239 11.4092 3.07063 11.4012C3.08887 11.3932 3.10858 11.389 3.1285 11.389C3.14842 11.389 3.16812 11.3932 3.18637 11.4012C3.20461 11.4092 3.22099 11.4209 3.23448 11.4355C3.24796 11.4502 3.25826 11.4675 3.26472 11.4863C3.27118 11.5052 3.27366 11.5252 3.272 11.545C3.27172 11.5651 3.26742 11.5849 3.25935 11.6033C3.25128 11.6217 3.23959 11.6382 3.225 11.652C3.21497 11.7618 3.20797 11.8718 3.204 11.982L3.267 11.978ZM2.905 12.859V13.008H2.748V12.859H2.839C2.89034 12.7373 2.96784 12.6284 3.066 12.54V12.41H3.266V12.574H3.113C3.02553 12.6555 2.95339 12.752 2.9 12.859H2.905ZM2.749 14.305V14.13H2.9V14.307L2.749 14.305ZM2.905 14.363V14.522H2.748V14.364L2.905 14.363ZM2.749 14.072V13.922H2.9V14.073L2.749 14.072ZM2.749 13.864V13.723H2.9V13.865L2.749 13.864ZM2.749 13.664V13.506H2.9V13.665L2.749 13.664ZM2.749 13.448V13.3H2.9V13.451L2.749 13.448ZM2.749 13.241V13.07H2.9V13.246L2.749 13.241ZM3.825 8.00401V7.62801C3.47471 7.50263 3.18166 7.25469 3 6.93001L3.1 6.90601C3.13885 6.97158 3.18265 7.03409 3.231 7.09301H3.457V7.18301H3.311C3.39976 7.275 3.50069 7.3544 3.611 7.41901L3.617 7.18101H3.5V7.09001H3.98V7.17901H3.746V7.48701C3.90515 7.56102 4.0768 7.60444 4.252 7.61501V7.17501H4.033V7.08501H4.48V7.17301H4.391V7.61601L4.474 7.61101V9.14101L4.455 8.01801H4.321V7.75201H4.191V8.01801H4.055V8.23201L4.336 8.54101C4.353 9.12101 4.375 9.46701 4.375 9.46701L4.475 9.56701V9.69201C4.34367 9.55201 4.27533 9.48534 4.27 9.49201C4.30157 9.17992 4.28708 8.86488 4.227 8.55701C4.13033 8.45961 4.04045 8.3557 3.958 8.24601V8.01301L3.825 8.00401ZM4.1 6.21401C4.08144 6.2107 4.06237 6.2115 4.04415 6.21636C4.02593 6.22121 4.009 6.23001 3.99454 6.24211C3.98008 6.25422 3.96846 6.26935 3.96048 6.28644C3.95251 6.30352 3.94837 6.32215 3.94837 6.34101C3.94837 6.35986 3.95251 6.37849 3.96048 6.39558C3.96846 6.41266 3.98008 6.42779 3.99454 6.4399C4.009 6.45201 4.02593 6.4608 4.04415 6.46566C4.06237 6.47051 4.08144 6.47131 4.1 6.46801H4.13L4.207 6.55101C4.17279 6.5638 4.13653 6.57024 4.1 6.57001C4.06813 6.57299 4.03599 6.56928 4.00563 6.55913C3.97527 6.54898 3.94737 6.5326 3.9237 6.51105C3.90003 6.48949 3.88113 6.46324 3.86819 6.43396C3.85526 6.40468 3.84858 6.37302 3.84858 6.34101C3.84858 6.309 3.85526 6.27734 3.86819 6.24806C3.88113 6.21878 3.90003 6.19252 3.9237 6.17097C3.94737 6.14941 3.97527 6.13303 4.00563 6.12288C4.03599 6.11273 4.06813 6.10903 4.1 6.11201C4.15414 6.11082 4.2072 6.12724 4.2512 6.15879C4.2952 6.19035 4.32777 6.23535 4.344 6.28701H4.471V6.38701H4.346C4.33227 6.44522 4.2964 6.4958 4.246 6.52801L4.169 6.45501C4.19059 6.4452 4.20908 6.42967 4.22247 6.4101C4.23587 6.39054 4.24366 6.36768 4.245 6.34401C4.24243 6.30776 4.22587 6.27392 4.19881 6.24966C4.17175 6.2254 4.13631 6.21262 4.1 6.21401ZM3.343 6.01401H3.268C3.09 6.01401 2.968 6.01901 2.912 6.02401C2.912 6.07601 2.904 6.12401 2.904 6.18201C2.90294 6.35271 2.9331 6.52216 2.993 6.68201C3.683 6.67401 4.193 6.67301 4.446 6.67301C4.44786 6.64392 4.45605 6.61559 4.47 6.59001V6.80001L4.457 6.76901C3.702 6.76901 3.188 6.78101 3.036 6.78501C3.04933 6.81301 3.06333 6.84067 3.078 6.86801L2.978 6.89601C2.86014 6.67618 2.79896 6.43043 2.8 6.18101C2.79953 5.93225 2.8594 5.68709 2.97448 5.46656C3.08957 5.24602 3.25643 5.05669 3.46075 4.91481C3.66507 4.77292 3.90076 4.68271 4.14761 4.65192C4.39445 4.62113 4.64508 4.65067 4.878 4.73801C4.63552 5.1207 4.49602 5.55955 4.473 6.01201C3.985 6.01001 3.608 6.01034 3.342 6.01301L3.343 6.01401ZM4.532 14.975V15.148H4.384V14.975H4.532ZM4.532 15.206V15.581H4.383V15.2L4.532 15.206ZM4.39 12.578V12.414H4.47V12.578H4.39ZM4.338 12.414V12.578H4.174V12.414H4.338ZM4.168 15.204H4.332V15.579H4.292C4.341 15.694 4.392 15.879 4.435 15.954H4.971L5.029 16.031C4.873 16.0243 4.66733 16.0203 4.412 16.019C4.33566 15.883 4.281 15.7359 4.25 15.583H4.167L4.168 15.204ZM1.786 7.00901L2.465 7.73101V8.14201C2.627 8.31401 2.73 8.42401 2.785 8.49001L2.865 8.59001C3.025 8.59601 3.285 8.59701 3.285 8.59701C3.42673 8.72948 3.55318 8.8774 3.662 9.03801C3.682 9.65001 3.686 9.90801 3.686 9.90801C3.97 10.2007 4.23 10.4673 4.466 10.708V10.817C3.896 10.246 3.598 9.95201 3.598 9.95201C3.575 9.34701 3.581 9.05901 3.581 9.05901C3.47484 8.92598 3.36308 8.79753 3.246 8.67401C3.10676 8.68129 2.96724 8.68129 2.828 8.67401L2.817 8.66401L2.727 8.57201C2.64695 8.49025 2.56925 8.40621 2.494 8.32001L2.348 8.16701L2.357 7.77301L1.734 7.15501L1.786 7.00901ZM2.661 14.756H2.307V14.585H2.661V14.756ZM2.661 14.309H2.307V14.135H2.661V14.309ZM2.661 13.868H2.307V13.786C2.23093 13.7776 2.1552 13.7662 2.08 13.752C2.07659 13.7685 2.06858 13.7837 2.05689 13.7958C2.0452 13.8079 2.03031 13.8165 2.01395 13.8205C1.99759 13.8245 1.98044 13.8237 1.96448 13.8184C1.94852 13.813 1.93441 13.8032 1.92378 13.7902C1.91316 13.7771 1.90646 13.7613 1.90447 13.7446C1.90247 13.7278 1.90526 13.7109 1.91251 13.6957C1.91975 13.6805 1.93116 13.6677 1.94541 13.6587C1.95966 13.6497 1.97616 13.645 1.993 13.645C2.01296 13.6453 2.03223 13.6523 2.0478 13.6648C2.06337 13.6773 2.07435 13.6946 2.079 13.714C2.12567 13.724 2.20167 13.7367 2.307 13.752V13.73H2.661V13.868ZM2.661 13.453H2.307V13.366C2.207 13.349 2.142 13.338 2.097 13.329C2.08731 13.3517 2.06955 13.3701 2.04715 13.3805C2.02474 13.3909 1.99928 13.3926 1.97566 13.3854C1.95205 13.3781 1.93195 13.3624 1.91925 13.3412C1.90655 13.32 1.90214 13.2949 1.90687 13.2706C1.9116 13.2464 1.92514 13.2247 1.94487 13.2099C1.96461 13.195 1.98914 13.188 2.01375 13.1902C2.03836 13.1923 2.0613 13.2035 2.07815 13.2216C2.095 13.2396 2.10456 13.2633 2.105 13.288L2.305 13.321V13.3H2.659L2.661 13.453ZM2.661 13.012H2.307V12.863H2.661V13.012ZM2.617 12.373L2.517 12.316H2.158L1.851 12.67C1.66847 12.6514 1.48452 12.6514 1.302 12.67L1.289 12.086L1.349 12.026C1.24827 11.9327 1.16922 11.8184 1.11739 11.6913C1.06556 11.5641 1.04221 11.4272 1.049 11.29C1.021 10.774 1.05867 10.4613 1.162 10.352C1.20067 10.3187 1.173 10.1853 1.079 9.95201C1.02223 9.80947 0.999009 9.65579 1.01115 9.50284C1.02329 9.3499 1.07045 9.2018 1.149 9.07001C1.17004 8.97997 1.20871 8.895 1.26278 8.81999C1.31684 8.74499 1.38524 8.68143 1.464 8.63301H1.471V8.62601C1.40289 8.52985 1.36877 8.41375 1.37402 8.29603C1.37927 8.17832 1.4236 8.06571 1.5 7.97601L1.846 8.17601L1.837 9.61201L2.676 10.412L2.1 10.4C2.08955 10.3283 2.05173 10.2635 1.99448 10.2191C1.93724 10.1747 1.86502 10.1543 1.793 10.162C1.75662 10.1525 1.71853 10.1514 1.68168 10.159C1.64483 10.1665 1.61019 10.1823 1.58043 10.2053C1.55066 10.2283 1.52656 10.2578 1.50998 10.2915C1.4934 10.3253 1.48477 10.3624 1.48477 10.4C1.48477 10.4376 1.4934 10.4747 1.50998 10.5085C1.52656 10.5422 1.55066 10.5717 1.58043 10.5947C1.61019 10.6177 1.64483 10.6336 1.68168 10.6411C1.71853 10.6486 1.75662 10.6475 1.793 10.638C1.85578 10.643 1.91854 10.6281 1.97238 10.5954C2.02623 10.5628 2.06843 10.514 2.093 10.456L2.686 10.467L2.678 11.051H2.346C2.32815 11.0012 2.29463 10.9584 2.25047 10.9292C2.2063 10.9 2.15386 10.8859 2.101 10.889C2.07056 10.8834 2.03926 10.8845 2.00932 10.8924C1.97938 10.9002 1.95152 10.9145 1.92774 10.9343C1.90395 10.9541 1.88481 10.9789 1.87167 11.007C1.85854 11.035 1.85173 11.0656 1.85173 11.0965C1.85173 11.1275 1.85854 11.158 1.87167 11.1861C1.88481 11.2141 1.90395 11.2389 1.92774 11.2587C1.95152 11.2785 1.97938 11.2928 2.00932 11.3006C2.03926 11.3085 2.07056 11.3096 2.101 11.304C2.15687 11.3079 2.21234 11.2922 2.25782 11.2595C2.30329 11.2268 2.3359 11.1792 2.35 11.125H2.69C2.68133 11.555 2.67733 11.7713 2.678 11.774L2.344 11.765C2.32311 11.7116 2.28579 11.6663 2.23743 11.6356C2.18907 11.6048 2.13218 11.5903 2.075 11.594C2.03252 11.6029 1.99341 11.6236 1.9622 11.6537C1.93099 11.6839 1.90895 11.7223 1.89862 11.7644C1.88829 11.8066 1.89009 11.8508 1.90383 11.8919C1.91756 11.9331 1.94266 11.9695 1.97622 11.997C2.00979 12.0246 2.05045 12.042 2.09351 12.0474C2.13658 12.0528 2.18028 12.0458 2.21958 12.0274C2.25888 12.009 2.29217 11.9799 2.3156 11.9433C2.33903 11.9068 2.35165 11.8644 2.352 11.821L2.686 11.83V12.163L2.997 12.474L2.885 12.591L2.617 12.373ZM3.517 15.856C3.51689 15.8299 3.52608 15.8045 3.54294 15.7846C3.5598 15.7646 3.58322 15.7513 3.609 15.747V15.58H3.526V15.249L3.473 15.234V15.58H3.311V15.203H3.38C3.33275 15.1848 3.28696 15.1631 3.243 15.138V15.147H3.061V15.009C2.97609 14.9372 2.90377 14.8517 2.847 14.756H2.747V14.584H2.9V14.747C2.96819 14.8285 3.04276 14.9044 3.123 14.974H3.242V15.068L3.309 15.114V14.974H3.468V15.147H3.367C3.40033 15.167 3.43367 15.1857 3.467 15.203L3.52 15.228V15.2H3.677V15.577H3.651V15.747C3.67068 15.7526 3.68842 15.7635 3.70221 15.7786C3.71601 15.7937 3.72532 15.8124 3.7291 15.8325C3.73289 15.8526 3.73099 15.8734 3.72362 15.8925C3.71625 15.9115 3.70371 15.9282 3.6874 15.9405C3.67109 15.9529 3.65166 15.9604 3.63129 15.9624C3.61093 15.9643 3.59043 15.9605 3.57211 15.9514C3.55378 15.9423 3.53836 15.9283 3.52756 15.9109C3.51677 15.8935 3.51103 15.8735 3.511 15.853L3.517 15.856ZM4.417 17.785V16.842H3.835C3.78774 16.8384 3.74329 16.8181 3.70959 16.7848C3.67589 16.7514 3.65513 16.7072 3.651 16.66V16.448C3.659 16.313 3.717 16.248 3.824 16.267H4.57C4.62672 16.3075 4.67327 16.3605 4.706 16.422C4.81349 16.4307 4.92151 16.4307 5.029 16.422L5.137 16.322L5.289 16.316C5.44893 16.4682 5.62693 16.6002 5.819 16.709H5.574C5.56536 16.7471 5.54286 16.7806 5.51087 16.8029C5.47889 16.8253 5.43972 16.835 5.401 16.83V17.256H5.291L5.298 16.828C5.154 16.81 5.076 16.748 5.064 16.642H4.627C4.64177 16.5922 4.64001 16.539 4.62198 16.4903C4.60395 16.4417 4.57063 16.4001 4.527 16.372H3.852C3.77867 16.3607 3.74133 16.399 3.74 16.487V16.638C3.76419 16.678 3.80049 16.7093 3.84365 16.7273C3.8868 16.7452 3.93456 16.749 3.98 16.738C4.16371 16.741 4.34735 16.7286 4.529 16.701C4.538 17.286 4.536 17.631 4.536 17.631L4.89 17.622V16.684L5.02 16.666V17.622L5.28 17.631V17.358H5.4V17.642H5.69V17.504L6.08 17.513L6.067 17.953L5.69 17.945V17.78L4.417 17.785ZM5.917 19.024C5.85388 19.024 5.79334 18.9989 5.74871 18.9543C5.70407 18.9097 5.679 18.8491 5.679 18.786C5.679 18.7229 5.70407 18.6623 5.74871 18.6177C5.79334 18.5731 5.85388 18.548 5.917 18.548C5.97455 18.5475 6.03021 18.5685 6.073 18.607L6.002 18.68C5.97793 18.6607 5.94804 18.6502 5.91721 18.6502C5.88638 18.6501 5.85645 18.6606 5.83233 18.6797C5.8082 18.6989 5.79131 18.7258 5.78443 18.7558C5.77755 18.7859 5.78108 18.8174 5.79445 18.8451C5.80781 18.8729 5.83022 18.8953 5.858 18.9087C5.88577 18.9221 5.91727 18.9256 5.94732 18.9188C5.97737 18.9119 6.0042 18.895 6.0234 18.8709C6.0426 18.8468 6.05304 18.8168 6.053 18.786C6.05323 18.7644 6.04807 18.7431 6.038 18.724L6.116 18.655C6.13972 18.691 6.15322 18.7327 6.15508 18.7758C6.15693 18.8188 6.14707 18.8615 6.12654 18.8994C6.10601 18.9373 6.07558 18.9689 6.0385 18.9908C6.00142 19.0128 5.96008 19.0242 5.917 19.024ZM7.33 19.37C7.40333 19.2287 7.34567 19.165 7.157 19.179C7.157 19.206 7.151 19.171 7.131 19.079C7.39833 19.0383 7.51667 19.142 7.486 19.39L7.33 19.37ZM8.33 19.17L7.23 18.12C7.21111 18.1252 7.19157 18.1275 7.172 18.127C7.13276 18.1278 7.09416 18.117 7.061 18.096L7.124 18.014C7.14536 18.0246 7.1696 18.028 7.19306 18.0237C7.21651 18.0193 7.23792 18.0075 7.25405 17.9899C7.27018 17.9723 7.28015 17.95 7.28247 17.9262C7.28479 17.9025 7.27932 17.8786 7.2669 17.8582C7.25447 17.8379 7.23576 17.8221 7.21359 17.8133C7.19142 17.8045 7.16698 17.8031 7.14397 17.8094C7.12095 17.8157 7.10061 17.8293 7.08601 17.8482C7.0714 17.867 7.06333 17.8902 7.063 17.914C7.06226 17.9389 7.07082 17.9631 7.087 17.982L7.02 18.06C7.0008 18.0409 6.98567 18.0182 6.97553 17.9931C6.96538 17.968 6.96044 17.9411 6.961 17.914C6.959 17.885 6.96299 17.8559 6.97272 17.8285C6.98244 17.8011 6.9977 17.776 7.01753 17.7548C7.03737 17.7335 7.06136 17.7166 7.08802 17.705C7.11468 17.6934 7.14343 17.6875 7.1725 17.6875C7.20157 17.6875 7.23032 17.6934 7.25698 17.705C7.28364 17.7166 7.30763 17.7335 7.32747 17.7548C7.3473 17.776 7.36255 17.8011 7.37228 17.8285C7.38201 17.8559 7.38599 17.885 7.384 17.914C7.38461 17.9554 7.37238 17.9959 7.349 18.03L8.419 19.084L8.33 19.17ZM8.477 18.828C8.41971 18.828 8.36477 18.8052 8.32426 18.7647C8.28376 18.7242 8.261 18.6693 8.261 18.612C8.25989 18.567 8.27398 18.523 8.301 18.487C8.121 18.2937 7.636 17.8107 6.846 17.038C6.89933 17.044 6.95367 17.048 7.009 17.05L8.363 18.428C8.3969 18.4061 8.43664 18.3949 8.477 18.396C8.53429 18.396 8.58923 18.4188 8.62973 18.4593C8.67024 18.4998 8.693 18.5547 8.693 18.612C8.693 18.6693 8.67024 18.7242 8.62973 18.7647C8.58923 18.8052 8.53429 18.828 8.477 18.828ZM8.856 18.214L8.623 18.222L8.631 17.634H8.96C8.9327 17.8285 8.89396 18.0211 8.844 18.211L8.856 18.214ZM8.967 11.038H6.929L6.335 12.846H5.572L7.514 7.10001H8.404L10.354 12.846H9.565L8.967 11.038ZM15.439 15.872C15.2624 15.8017 15.1166 15.6708 15.0277 15.5028C14.9389 15.3347 14.9127 15.1406 14.954 14.955C15.03 14.2883 14.759 14.0217 14.141 14.155C14.8397 14.9143 14.6667 15.416 13.622 15.66C13.8887 15.9267 14.2173 15.823 14.608 15.349C14.7019 15.6554 14.8648 15.9362 15.084 16.17L14.79 16.585C14.8206 16.7311 14.8189 16.8821 14.7848 17.0274C14.7507 17.1727 14.6851 17.3088 14.5927 17.426C14.5003 17.5432 14.3833 17.6387 14.25 17.7057C14.1166 17.7728 13.9702 17.8097 13.821 17.814C13.7437 17.9147 13.7493 17.8683 13.838 17.675C13.7753 17.2537 13.5563 17.0463 13.181 17.053C13.0485 17.1421 12.8931 17.1911 12.7335 17.1941C12.5739 17.1971 12.4168 17.154 12.281 17.07C11.8697 16.8953 11.622 16.9877 11.538 17.347C11.219 17.7754 10.7488 18.0661 10.223 18.16C10.4848 18.2743 10.7795 18.2881 11.0507 18.1986C11.322 18.1091 11.5507 17.9226 11.693 17.675C11.511 17.183 11.7993 17.1543 12.558 17.589C13.288 17.3403 13.657 17.5017 13.665 18.073C13.5033 18.3246 13.2841 18.5341 13.0256 18.6845C12.7671 18.8349 12.4766 18.9218 12.178 18.938C11.978 19.3493 11.3203 19.5687 10.205 19.596C10.0381 19.5873 9.87472 19.5442 9.7252 19.4695C9.57569 19.3947 9.44322 19.2899 9.3361 19.1616C9.22899 19.0332 9.14953 18.8842 9.10271 18.7237C9.05588 18.5632 9.04271 18.3948 9.064 18.229C9.16939 18.0497 9.22371 17.8449 9.22107 17.6369C9.21842 17.4289 9.15892 17.2256 9.049 17.049H11.083C11.7698 17.0491 12.4297 16.7822 12.9233 16.3047C13.4168 15.8271 13.7054 15.1764 13.728 14.49L13.752 14.458L13.728 14.452V12.547C13.9279 12.4806 14.1059 12.361 14.243 12.201C14.4567 12.0914 14.7039 12.0667 14.935 12.132C15.2557 13.0033 15.0423 13.407 14.295 13.343C14.573 13.637 14.821 13.6197 15.039 13.291C15.3245 13.2192 15.624 13.2246 15.9067 13.3066C16.1895 13.3887 16.4453 13.5445 16.648 13.758C16.6036 14.1758 16.472 14.5795 16.2617 14.9432C16.0513 15.3068 15.767 15.6222 15.427 15.869L15.439 15.872ZM16.753 13.536C16.5849 13.3114 16.3536 13.142 16.0887 13.0495C15.8238 12.9571 15.5374 12.9458 15.266 13.017C15.55 12.821 15.573 12.5153 15.335 12.1C14.9237 11.9387 14.6813 11.7543 14.608 11.547C14.7317 11.3217 14.8078 11.0733 14.8317 10.8174C14.8556 10.5615 14.8268 10.3034 14.747 10.059C14.931 10.1257 15.0463 10.0923 15.093 9.95901C14.953 9.78234 14.7913 9.79967 14.608 10.011C14.7038 10.5827 14.5803 11.1695 14.262 11.654C14.1214 11.8792 13.9411 12.077 13.73 12.238V8.65301C14.0994 8.59254 14.4778 8.67826 14.785 8.89201C14.6832 8.74462 14.5406 8.63015 14.3747 8.56265C14.2088 8.49515 14.0268 8.47755 13.851 8.51201L13.938 8.09701C13.8693 8.17301 13.8 8.24634 13.73 8.31701V7.14501C13.8581 7.0062 13.9567 6.84293 14.02 6.66501L14.574 6.68201C14.6447 6.68201 14.7483 6.83201 14.885 7.13201C15.873 6.27301 15.468 7.50601 15.937 6.91701L15.894 6.80001C15.9227 6.81334 15.951 6.82767 15.979 6.84301L16 6.82101V6.81201C16.1427 6.81801 16.2503 6.95934 16.323 7.23601C16.5087 7.73305 16.5563 8.27106 16.461 8.79301C16.945 9.21301 16.945 9.61101 16.461 9.98701L16.876 10.073C16.9608 10.5942 16.9193 11.1282 16.755 11.63C16.9092 11.9239 16.9886 12.2513 16.9861 12.5833C16.9837 12.9152 16.8995 13.2414 16.741 13.533L16.753 13.536Z" fill="black" />
                </svg>
                AI Assistant
              </h3>
              <button className="help-call-btn" onClick={() => setShowCallOptionsPopup(true)}>
                📞 Help Call
              </button>
              <button className="close-btn" onClick={() => setShowAIPopup(false)}>×</button>
            </div>
            <div className="chat-container">
              <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.map((message) => (
                  <div key={message.id} className={`message ${message.isBot ? 'bot' : 'user'}`}>
                    <div className={`message-content ${message.isTyping ? 'typing' : ''}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                />
                <button onClick={handleChatSend} className="send-btn">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Options Popup */}
      {showCallOptionsPopup && (
        <div className="popup-overlay" onClick={() => setShowCallOptionsPopup(false)}>
          <div className="popup call-options-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Choose Call Option</h3>
              <button className="close-btn" onClick={() => setShowCallOptionsPopup(false)}>×</button>
            </div>
            <div className="call-options">
              <button className="call-option-btn web-call" onClick={handleWebCall}>
                <span className="call-icon">💻</span>
                <div className="call-info">
                  <div className="call-title">Web Call</div>
                  <div className="call-desc">Video call via Google Meet</div>
                </div>
              </button>
              <button className="call-option-btn phone-call" onClick={handlePhoneCall}>
                <span className="call-icon">📞</span>
                <div className="call-info">
                  <div className="call-title">Phone Call</div>
                  <div className="call-desc">Direct voice call</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Popup */}
      {showComingSoonPopup && (
        <div className="popup-overlay" onClick={() => setShowComingSoonPopup(false)}>
          <div className="popup coming-soon-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Coming Soon</h3>
              <button className="close-btn" onClick={() => setShowComingSoonPopup(false)}>×</button>
            </div>
            <div className="coming-soon-content">
              <div className="coming-soon-icon">🚀</div>
              <h4>Phone Call Feature</h4>
              <p>We&apos;re working on bringing you direct phone calling functionality. Stay tuned!</p>
              <button className="ok-btn" onClick={() => setShowComingSoonPopup(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Popup */}
      {showAvatarSelectionPopup && (
        <div className="popup-overlay" onClick={() => setShowAvatarSelectionPopup(false)}>
          <div className="popup avatar-selection-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Choose Avatar Gender</h3>
              <button className="close-btn" onClick={() => setShowAvatarSelectionPopup(false)}>×</button>
            </div>
            <div className="gender-selection">
              <button className="gender-btn male-btn" onClick={() => selectGenderAvatar('male')}>
                <span className="gender-icon">👨</span>
                <div className="gender-info">
                  <div className="gender-title">Male Avatar</div>
                  <div className="gender-desc">Random male avatar</div>
                </div>
              </button>
              <button className="gender-btn female-btn" onClick={() => selectGenderAvatar('female')}>
                <span className="gender-icon">👩</span>
                <div className="gender-info">
                  <div className="gender-title">Female Avatar</div>
                  <div className="gender-desc">Random female avatar</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .floating-nav {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 1000;
        }

        .nav-toggle {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          position: relative;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }

        .nav-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .nav-toggle:active {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          transform: translateY(0px);
        }

        .nav-icon-main {
  width: 26px;
  height: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}

.menu-line {
  width: 100%;
  height: 2px;
  background: white;
  border-radius: 999px;
  transition: transform 0.25s ease, opacity 0.25s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.menu-line.middle {
  width: 80%;
}

.nav-icon-main.open .top {
  transform: translateY(9px) rotate(45deg);
}

.nav-icon-main.open .middle {
  opacity: 0;
}

.nav-icon-main.open .bottom {
  transform: translateY(-9px) rotate(-45deg);
}
       

        .nav-menu {
          position: absolute;
          bottom: 80px;
          right: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }

        .nav-menu.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          background: white;
          padding: 0.8rem 1.2rem;
          border-radius: 25px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 140px;
          border: 2px solid transparent;
        }

        .nav-item:hover {
          transform: translateX(-5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .nav-item.feedback:hover {
          border-color: #4CAF50;
          background: #f8fff8;
        }

        .nav-item.help:hover {
          border-color: #2196F3;
          background: #f0f8ff;
        }

        .nav-item.ai:hover {
          border-color: #9C27B0;
          background: #faf0ff;
        }

        .nav-item.booking:hover {
          border-color: #FF0005;
          background: #fff5f5;
        }

        .nav-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        .nav-label {
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

       

        

        .nav-icon-main.open {
          background: transparent;
          backdrop-filter: none;
          border: none;
          box-shadow: none;
        }

        .bubble {
          position: absolute;
          right: 70px;
          background: white;
          color: #333;
          padding: 6px 10px;
          border-radius: 15px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transform: translateX(20px) scale(0.8);
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          pointer-events: none;
          z-index: 1001;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .bubble::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid white;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          filter: drop-shadow(1px 0 2px rgba(0, 0, 0, 0.1));
        }

        .bubble.feedback {
          top: 0px;
          border-color: rgba(76, 175, 80, 0.3);
          animation: bubbleCycle 6s infinite;
          animation-delay: 0s;
        }

        .bubble.help {
          top: 0px;
          border-color: rgba(33, 150, 243, 0.3);
          animation: bubbleCycle 6s infinite;
          animation-delay: 2s;
        }

        .bubble.ai {
          top: 0px;
          border-color: rgba(156, 39, 176, 0.3);
          animation: bubbleCycle 6s infinite;
          animation-delay: 4s;
        }

        @keyframes bubbleCycle {
          0% {
            opacity: 0;
            visibility: hidden;
            transform: translateX(20px) scale(0.8);
          }
          10% {
            opacity: 1;
            visibility: visible;
            transform: translateX(0) scale(1);
          }
          40% {
            opacity: 1;
            visibility: visible;
            transform: translateX(0) scale(1);
          }
          50% {
            opacity: 0;
            visibility: hidden;
            transform: translateX(20px) scale(0.8);
          }
          100% {
            opacity: 0;
            visibility: hidden;
            transform: translateX(20px) scale(0.8);
          }
        }

        .bubble.feedback:hover {
          background: #f8fff8;
          border-color: #4CAF50;
          color: #2e7d32;
        }

        .bubble.help:hover {
          background: #f0f8ff;
          border-color: #2196F3;
          color: #1565c0;
        }

        .bubble.ai:hover {
          background: #faf0ff;
          border-color: #9C27B0;
          color: #7b1fa2;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .floating-nav {
            bottom: 1.5rem;
            right: 1.5rem;
          }

          .nav-toggle {
            width: 55px;
            height: 55px;
          }

          .nav-icon-main {
            font-size: 1.3rem;
          }

          .nav-menu {
            bottom: 70px;
            right: -10px;
          }

          .nav-item {
            padding: 0.7rem 1rem;
            min-width: 120px;
            font-size: 0.85rem;
          }

          .nav-icon {
            font-size: 1.1rem;
          }
        }

        @media (max-width: 480px) {
          .floating-nav {
            bottom: 1rem;
            right: 1rem;
          }

          .nav-toggle {
            width: 50px;
            height: 50px;
          }

          .nav-icon-main {
            font-size: 1.2rem;
          }

          .nav-menu {
            bottom: 65px;
            right: -15px;
          }

          .nav-item {
            padding: 0.6rem 0.8rem;
            min-width: 100px;
            font-size: 0.8rem;
          }
        }

        /* Popup Styles */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          z-index: 2000;
          backdrop-filter: blur(5px);
          overflow-y: auto;
          padding: 3rem 1rem;
        }

        @media (max-width: 768px) {
          .popup-overlay {
            align-items: center;
            padding: 1.5rem 1rem;
          }
        }

        .popup {
          background: #e4e4e4ff;
          border-radius: 20px;
          padding: 2rem;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: popupSlideIn 0.3s ease-out;
        }

        .feedback-popup {
          width: 500px;
          margin-top: 5rem;
          margin-bottom: 5rem;
          background: #010101;
          color: #f5f5f5;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.65);
        }

        .feedback-popup .popup-header {
          border-bottom-color: rgba(255, 255, 255, 0.12);
        }

        .feedback-popup .popup-header h3 {
          color: #ffffff;
        }

        .feedback-popup .form-group label {
          color: rgba(255, 255, 255, 0.82);
        }

        .feedback-popup .form-group input,
        .feedback-popup .form-group textarea {
          background: rgba(18, 18, 18, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f5f5f5;
        }

        .feedback-popup .form-group input::placeholder,
        .feedback-popup .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }

        .feedback-popup .form-group input:focus,
        .feedback-popup .form-group textarea:focus {
          border-color: rgba(255, 0, 5, 0.6);
        }

        .feedback-popup .rating-text {
          color: rgba(255, 255, 255, 0.6);
        }

        @keyframes popupSlideIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
         
          border-bottom: 2px solid #f0f0f0;
          gap: 1rem;
        }

        .popup-header h3 {
          margin: 0;
          color: #000000ff;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .robot-icon {
          width: 24px;
          height: 24px;
          transition: transform 0.3s ease;
        }

        .robot-icon:hover {
          transform: rotate(10deg) scale(1.1);
        }

        .close-btn {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: #ff2222;
          transform: scale(1.1);
        }

        /* Feedback Form Styles */
        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group textarea {
          padding: 0.8rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #ff4444;
        }

        /* Rating Styles */
        .rating-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .star {
          font-size: 2rem;
          cursor: pointer;
          transition: all 0.2s ease;
          filter: grayscale(100%);
          opacity: 0.5;
        }

        .star:hover {
          transform: scale(1.2);
          filter: grayscale(0%);
          opacity: 1;
        }

        .star.active {
          filter: grayscale(0%);
          opacity: 1;
          transform: scale(1.1);
        }

        .rating-text {
          font-size: 0.9rem;
          color: #666;
          margin-left: 0.5rem;
          font-style: italic;
        }

        /* Avatar Upload Styles */
        .avatar-upload-container {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .avatar-upload-btn {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border: none;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-block;
          text-align: center;
          flex: 1;
        }

        .avatar-upload-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        }

        .random-avatar-btn {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          border: none;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
          flex: 1;
        }

        .random-avatar-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(33, 150, 243, 0.4);
        }

        /* Avatar Preview Styles */
        .avatar-preview {
          margin-top: 0.5rem;
          display: flex;
          justify-content: center;
        }

        .avatar-preview img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e0e0e0;
          transition: border-color 0.3s ease;
        }

        .avatar-preview img:hover {
          border-color: #ff4444;
        }

        /* File Name Display */
        .file-name-display {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #666;
          text-align: center;
          border: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .small-avatar-preview {
          display: flex;
          align-items: center;
        }

        .small-avatar-preview img {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #ccc;
        }

        .submit-btn {
          background: linear-gradient(135deg, #ff4444, #cc0000);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 68, 68, 0.4);
        }

        /* Help & Support Styles */
        .help-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .help-section h4 {
          color: #333;
          margin-bottom: 0.8rem;
          font-size: 1.1rem;
        }

        .help-section p {
          margin: 0.5rem 0;
          color: #666;
        }

        .help-section a {
          color: #ff4444;
          text-decoration: none;
          font-weight: 600;
        }

        .help-section a:hover {
          text-decoration: underline;
        }

        .help-section ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .help-section li {
          margin: 0.3rem 0;
          color: #666;
        }

        /* AI Chatbot Styles */
        .ai-popup {
          width: 400px;
          height: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .help-call-btn {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
          white-space: nowrap;
        }

        .help-call-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
          background: linear-gradient(135deg, #45a049, #4CAF50);
        }

        .help-call-btn:active {
          transform: translateY(0);
        }

        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1rem 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
          min-height: 300px;
          scroll-behavior: smooth;
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        .message {
          display: flex;
          margin-bottom: 0.5rem;
        }

        .message.user {
          justify-content: flex-end;
        }

        .message.bot {
          justify-content: flex-start;
        }

        .message-content {
          max-width: 80%;
          padding: 0.8rem 1rem;
          border-radius: 18px;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .message.user .message-content {
          background: linear-gradient(135deg, #ff4444, #cc0000);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.bot .message-content {
          background: #f0f0f0;
          color: #333;
          border-bottom-left-radius: 4px;
        }

        .message.bot .message-content.typing {
          background: #e8f5e8;
          color: #666;
          font-style: italic;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .chat-input {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 2px solid #f0f0f0;
        }

        .chat-input input {
          flex: 1;
          padding: 0.8rem;
          border: 2px solid #e0e0e0;
          border-radius: 20px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.3s ease;
        }

        .chat-input input:focus {
          border-color: #ff4444;
        }

        .send-btn {
          background: linear-gradient(135deg, #ff4444, #cc0000);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 0.8rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .send-btn:hover {
          transform: scale(1.05);
        }

        /* Call Options Popup Styles */
        .call-options-popup {
          width: 400px;
          max-width: 90vw;
        }

        .call-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .call-option-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .call-option-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .call-option-btn.web-call:hover {
          border-color: #2196F3;
          background: #f0f8ff;
        }

        .call-option-btn.phone-call:hover {
          border-color: #4CAF50;
          background: #f8fff8;
        }

        .call-icon {
          font-size: 2rem;
          width: 50px;
          text-align: center;
        }

        .call-info {
          flex: 1;
        }

        .call-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.3rem;
        }

        .call-desc {
          font-size: 0.9rem;
          color: #666;
        }

        /* Coming Soon Popup Styles */
        .coming-soon-popup {
          width: 350px;
          max-width: 90vw;
          text-align: center;
        }

        .coming-soon-content {
          padding: 1rem 0;
        }

        .coming-soon-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .coming-soon-content h4 {
          color: #333;
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }

        .coming-soon-content p {
          color: #666;
          line-height: 1.5;
          margin-bottom: 2rem;
        }

        .ok-btn {
          background: linear-gradient(135deg, #ff4444, #cc0000);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.8rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ok-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 68, 68, 0.4);
        }

        /* Avatar Selection Popup Styles */
        .avatar-selection-popup {
          width: 400px;
          max-width: 90vw;
        }

        .gender-selection {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .gender-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .gender-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .gender-btn.male-btn:hover {
          border-color: #2196F3;
          background: #f0f8ff;
        }

        .gender-btn.female-btn:hover {
          border-color: #E91E63;
          background: #fce4ec;
        }

        .gender-icon {
          font-size: 2rem;
          width: 50px;
          text-align: center;
        }

        .gender-info {
          flex: 1;
        }

        .gender-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.3rem;
        }

        .gender-desc {
          font-size: 0.9rem;
          color: #666;
        }

        /* Mobile Responsive for Popups */
        @media (max-width: 768px) {
          .popup {
            padding: 1.5rem;
            max-width: 95vw;
            max-height: 95vh;
          }

          .ai-popup {
            width: 90vw;
            height: 70vh;
          }

          .feedback-popup {
            width: 95vw;
          }

          .call-options-popup {
            width: 90vw;
          }

          .coming-soon-popup {
            width: 90vw;
          }

          .avatar-selection-popup {
            width: 90vw;
          }

          .popup-header h3 {
            font-size: 1.3rem;
          }

          .form-group input,
          .form-group textarea {
            padding: 0.7rem;
          }

          .star {
            font-size: 2.5rem;
          }

          .rating-text {
            font-size: 0.8rem;
          }

          .avatar-upload-container {
            flex-direction: column;
            gap: 0.3rem;
          }

          .avatar-upload-btn,
          .random-avatar-btn {
            padding: 0.5rem 0.8rem;
            font-size: 0.8rem;
          }

          .avatar-preview img {
            width: 50px;
            height: 50px;
          }

          .submit-btn {
            padding: 0.8rem 1.5rem;
          }

          .call-option-btn {
            padding: 0.8rem;
          }

          .call-icon {
            font-size: 1.5rem;
            width: 40px;
          }

          .call-title {
            font-size: 1rem;
          }

          .call-desc {
            font-size: 0.8rem;
          }
            
        }

                .floating-whatsapp-button {
          position: fixed;
          bottom: 7rem;
          right: 2rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(0.19, 1, 0.22, 1),
            opacity 0.25s ease,
            box-shadow 0.25s ease;
          opacity: 1;
          z-index: 1100;
        }

        .floating-whatsapp-button.nav-open {
          transform: translateY(90px) scale(0.85);
          opacity: 0;
          pointer-events: none;
        }

        .floating-whatsapp-button:hover {
          transform: translateY(-4px) scale(1.05);
          
        }

        .floating-whatsapp-button:active {
          transform: scale(0.96);
        }

        .whatsapp-icon {
          width: 2.5rem;
          height: 2.5rem;
          animation: whatsapp-shake 2.8s ease-in-out infinite;
        }

        @keyframes whatsapp-shake {
          0% { transform: rotate(0deg); }
          8% { transform: rotate(-10deg); }
          16% { transform: rotate(11deg); }
          24% { transform: rotate(-7deg); }
          32% { transform: rotate(6deg); }
          40% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }

        .whatsapp-popup {
          width: 420px;
          max-width: 90vw;
          background: #000000ff;
          color: #fff;
        }

        .whatsapp-popup .popup-header h3 {
          color: #fff;
        }

        .whatsapp-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .prefilled-messages {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .prefilled-msg-btn {
          text-align: left;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(15, 23, 42, 0.6);
          color: #f8fafc;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s ease, border 0.2s ease;
        }

        .prefilled-msg-btn:hover {
          background: rgba(37, 211, 102, 0.15);
          border-color: rgba(37, 211, 102, 0.6);
        }

        .whatsapp-textarea {
          width: 100%;
          min-height: 90px;
          border: 2px solid rgba(255, 255, 255, 0.18);
          border-radius: 10px;
          padding: 0.9rem;
          font-size: 1rem;
          color: #f8fafc;
          background: rgba(15, 23, 42, 0.35);
          resize: vertical;
          transition: border 0.2s ease;
        }

        .whatsapp-textarea:focus {
          outline: none;
          border-color: #25d366;
        }

        .whatsapp-send-btn {
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 0.85rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .whatsapp-send-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(37, 211, 102, 0.35);
        }

        .whatsapp-swipe-button {
          position: relative;
          width: 100%;
          height: 50px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.3);
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          overflow: hidden;
        }

        .whatsapp-swipe-button:active {
          cursor: grabbing;
        }

        .swipe-text {
          position: absolute;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: opacity 0.05s linear;
          pointer-events: none;
          z-index: 1;
        }

        .swipe-slider {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 60px;
          background: linear-gradient(135deg, #25d366, #128c7e);
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: width 0.05s linear;
          z-index: 2;
        }

        .swipe-thumb {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          animation: slideArrow 1.5s ease-in-out infinite;
        }

        @keyframes slideArrow {
          0% {
            transform: translateX(0);
            opacity: 1;
          }
          50% {
            transform: translateX(6px);
            opacity: 1;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .floating-whatsapp-button {
            bottom: 4.5rem;
            right: 1rem;
            width: 50px;
            height: 50px;
          }

          .floating-whatsapp-button.nav-open {
            transform: translateY(70px) scale(0.8);
          }

          .whatsapp-popup {
            width: 95vw;
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingNavigation;