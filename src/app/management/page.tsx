'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Users } from 'lucide-react';

export default function StaffLogin() {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Call API to verify staff credentials
            const response = await fetch('/api/staff/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();
            

            if (data.success) {
                
                // Store staff session
                localStorage.setItem('staffToken', 'authenticated');
                localStorage.setItem('staffLoginTime', Date.now().toString());
                localStorage.setItem('staffUser', JSON.stringify(data.staff));

                // Redirect to staff dashboard
                window.location.href = '/management/dashboard';
                return;
            } else {
                setError(data.error || 'Invalid password. Please try again.');
                setPassword('');
                setIsLoading(false);
            }
        } catch (error) {
            
            setError('Connection error. Please try again.');
            setPassword('');
            setIsLoading(false);
        }
    };

    return (
        <div className="staff-login">
            <div className="animated-bg">
                <div className="grid-container">
                    <div className="grid-overlay"></div>

                    {/* Colored animated grid lines - horizontal */}
                    <div className="colored-grid-line horizontal-line-1"></div>
                    <div className="colored-grid-line horizontal-line-2"></div>
                    <div className="colored-grid-line horizontal-line-4"></div>

                    {/* Colored animated grid lines - vertical */}
                    <div className="colored-grid-line vertical-line-1"></div>
                    <div className="colored-grid-line vertical-line-2"></div>
                    <div className="colored-grid-line vertical-line-4"></div>
                    <div className="colored-grid-line vertical-line-5"></div>
                </div>
            </div>

            <div className="login-container">
                <div className="login-header">
                    <div className="logo-section">
                        <Users size={48} className="staff-icon" />
                        <h1>FeelMe Town</h1>
                        <p>Staff Access</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="password">Staff Password</label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter staff password"
                                required
                                className="password-input"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="toggle-password"
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="login-button"
                    >
                        {isLoading ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                <span>Loading...</span>
                            </div>
                        ) : (
                            'Access Staff Portal'
                        )}
                    </button>

                    <div className="additional-buttons">
                        <button type="button" className="secondary-button">
                            Login with Face
                        </button>
                        <button type="button" className="secondary-button">
                            Forgot Password
                        </button>
                    </div>
                </form>

                <div className="login-footer">
                    <p>Staff members only</p>
                    <div className="back-to-site">
                        <Link href="/" className="back-link">
                            ← Back to FeelME Town
                        </Link>
                    </div>
                </div>
            </div>

            <style jsx>{`
        :root {
          --accent-color:rgb(255, 0, 0);
          --accent-hover:rgb(255, 0, 0);
          --text-primary: #ffffff;
        }

        .staff-login {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #141414;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          overflow: hidden;
        }

        .animated-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .grid-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 80px 80px;
        }

        /* Colored animated grid lines */
        .colored-grid-line {
          position: absolute;
          opacity: 0;
          z-index: 10;
        }

        /* Horizontal colored lines - aligned with grid */
        .horizontal-line-1 {
          height: 0.5px;
          width: 10vw;
          top: calc(80px * 1);
          left: -100vw;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
          
          animation: coloredSlideHorizontal 4s infinite ease-in-out;
          animation-delay: 0s;
        }

        .horizontal-line-2 {
          height: 0.5px;
          width: 10vw;
          top: calc(80px * 3);
          left: 100vw;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
          
          animation: coloredSlideHorizontalReverse 4.5s infinite ease-in-out;
          animation-delay: 1s;
        }

        .horizontal-line-4 {
          height: 0.5px;
          width: 10vw;
          top: calc(80px * 7);
          left: 100vw;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
          
          animation: coloredSlideHorizontalReverse 3.5s infinite ease-in-out;
          animation-delay: 3s;
        }

        /* Vertical colored lines - aligned with grid */
        .vertical-line-1 {
          width: 0.5px;
          height: 20vh;
          left: calc(80px * 2);
          top: -100vh;
          background: linear-gradient(0deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
          
          animation: coloredSlideVertical 4.5s infinite ease-in-out;
          animation-delay: 0.5s;
        }

        .vertical-line-2 {
          width: 0.5px;
          height: 20vh;
          left: calc(80px * 5);
          top: 100vh;
          background: linear-gradient(0deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
          
          animation: coloredSlideVerticalReverse 5s infinite ease-in-out;
          animation-delay: 1.5s;
        }

        .vertical-line-4 {
          width: 0.5px;
          height: 20vh;
          left: calc(80px * 11);
          top: 100vh;
          background: linear-gradient(0deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
         
          animation: coloredSlideVerticalReverse 3.8s infinite ease-in-out;
          animation-delay: 3.5s;
        }

        .vertical-line-5 {
          width: 0.5px;
          height: 20vh;
          left: calc(80px * 14);
          top: -100vh;
          background: linear-gradient(0deg, 
            transparent 0%, 
            rgb(255, 0, 0) 30%, 
            rgb(255, 0, 0) 70%, 
            transparent 100%);
         
          animation: coloredSlideVertical 4.7s infinite ease-in-out;
          animation-delay: 4.5s;
        }

        /* Animation keyframes for colored lines */
        @keyframes coloredSlideHorizontal {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(200vw);
            opacity: 0;
          }
        }

        @keyframes coloredSlideHorizontalReverse {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(-200vw);
            opacity: 0;
          }
        }

        @keyframes coloredSlideVertical {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(200vh);
            opacity: 0;
          }
        }

        @keyframes coloredSlideVerticalReverse {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-200vh);
            opacity: 0;
          }
        }

        .login-container {
          background: transparent;
          backdrop-filter: blur(50px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 3rem;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .staff-icon {
          color: var(--accent-color);
          filter: drop-shadow(0 0 10px var(--accent-color));
        }

        .logo-section h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .logo-section p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: rgba(255, 255, 255, 0.5);
          z-index: 1;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 3rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.85rem;
        }

        .form-input:disabled {
          background: rgba(255, 255, 255, 0.02);
          cursor: not-allowed;
        }

        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .password-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .password-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.85rem;
        }

        .password-input:disabled {
          background: rgba(255, 255, 255, 0.02);
          cursor: not-allowed;
        }

        .toggle-password {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.3s ease;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-password:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .toggle-password:disabled {
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          border-radius: 8px;
          padding: 0.75rem;
          color: #ff6b6b;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          text-align: center;
        }

        .login-button {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .login-button:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .additional-buttons {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .secondary-button {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.75rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .login-footer {
          text-align: center;
          margin-top: 2rem;
        }

        .login-footer p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 1rem 0;
        }

        .back-to-site {
          margin-top: 1rem;
        }

        .back-link {
          color: var(--accent-color);
          text-decoration: none;
          font-size: 0.9rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          transition: color 0.3s ease;
        }

        .back-link:hover {
          color: var(--accent-hover);
        }

        @media (max-width: 480px) {
          .login-container {
            margin: 1rem;
            padding: 2rem;
          }

          .logo-section h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
        </div>
    );
}
