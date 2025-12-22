import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStenMetadata, viewSten, unlockSten } from '../api/stenApi';
import type { StenMetadata, StenContent } from '../api/stenApi';

type StenState = 
  | 'loading'
  | 'not_found'
  | 'destroyed'
  | 'expired'
  | 'active';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const ViewSten: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stenState, setStenState] = useState<StenState>('loading');
  const [metadata, setMetadata] = useState<StenMetadata | null>(null);
  const [content, setContent] = useState<string>('');
  const [_viewInfo, setViewInfo] = useState<StenContent | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true
  });
  
  // Password-related state
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate time remaining until expiration
  const calculateTimeRemaining = (expirationTime: string): TimeRemaining => {
    const expiry = new Date(expirationTime);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  // Format time remaining for display
  const formatTimeRemaining = (time: TimeRemaining): string => {
    if (time.isExpired) return 'Expired';

    const parts: string[] = [];
    
    if (time.days > 0) {
      parts.push(`${time.days} day${time.days > 1 ? 's' : ''}`);
    }
    if (time.hours > 0) {
      parts.push(`${time.hours} hour${time.hours > 1 ? 's' : ''}`);
    }
    if (time.minutes > 0) {
      parts.push(`${time.minutes} minute${time.minutes > 1 ? 's' : ''}`);
    }
    if (time.seconds > 0 && parts.length === 0) {
      parts.push(`${time.seconds} second${time.seconds > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? `Expires in ${parts.join(' ')}` : 'Expires in less than a second';
  };

  // Update countdown every second
  useEffect(() => {
    if (!metadata?.expiresAt) return;

    const updateCountdown = () => {
      const remaining = calculateTimeRemaining(metadata.expiresAt!);
      setTimeRemaining(remaining);
      
      // Auto-expire if time is up
      if (remaining.isExpired && stenState === 'active') {
        setStenState('expired');
      }
    };

    // Initial calculation
    updateCountdown();

    // Set up interval
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [metadata?.expiresAt, stenState]);

  // Initial load
  useEffect(() => {
    if (!id) {
      setStenState('not_found');
      return;
    }

    const loadSten = async () => {
      try {
        const metadataResponse = await getStenMetadata(id);
        setMetadata(metadataResponse);

        if (!metadataResponse.exists) {
          setStenState('not_found');
        } else if (metadataResponse.reason === 'destroyed' || metadataResponse.destroyed) {
          setStenState('destroyed');
        } else if (metadataResponse.expired) {
          setStenState('expired');
        } else {
          setStenState('active');
        }
      } catch (err) {
        console.error('Failed to load STEN:', err);
        setStenState('not_found');
      }
    };

    loadSten();
  }, [id]);

  // Handle viewing the STEN (for unprotected STENs)
  const handleViewSten = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const result = await viewSten(id);
      setContent(result.content);
      setViewInfo(result);
    } catch (err) {
      console.error('Failed to view STEN:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password unlock (for protected STENs)
  const handleUnlockSten = async () => {
    if (!id || !password.trim()) return;

    setIsUnlocking(true);
    setPasswordError('');
    
    try {
      const result = await unlockSten(id, password);
      setContent(result.content);
      setViewInfo(result);
      setPassword(''); // Clear password after successful unlock
    } catch (err: unknown) {
      console.error('Failed to unlock STEN:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'INVALID_PASSWORD') {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError(error.message || 'Failed to unlock STEN');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Enter key press for password input
  const handlePasswordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isUnlocking && password.trim()) {
      handleUnlockSten();
    }
  };

  // Handle navigation
  const handleCreateNew = () => {
    navigate('/create');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  // Copy content to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Loading State
  if (stenState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[640px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
            <p className="text-white/70">Loading STEN...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (stenState === 'not_found') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[640px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[#7C3AED]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">STEN Not Found</h1>
            <p className="text-white/60 mb-8">
              This STEN doesn't exist or has already been accessed.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoHome}
                className="px-6 py-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white font-medium rounded-full transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-full transition-colors"
              >
                Create New
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Destroyed State
  if (stenState === 'destroyed') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[640px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">STEN Destroyed</h1>
            <p className="text-white/60 mb-8">
              This STEN has been destroyed after viewing.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoHome}
                className="px-6 py-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white font-medium rounded-full transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-full transition-colors"
              >
                Create New
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired State
  if (stenState === 'expired') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[640px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">STEN Expired</h1>
            <p className="text-white/60 mb-6">
              This STEN has expired.
            </p>
            {metadata?.expiresAt && (
              <p className="text-white/40 text-sm mb-8">
                Expired at: {new Date(metadata.expiresAt).toLocaleString()}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoHome}
                className="px-6 py-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white font-medium rounded-full transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-full transition-colors"
              >
                Create New
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active State
  if (stenState === 'active') {
    const isLowTime = timeRemaining.minutes < 10 && !timeRemaining.isExpired;
    const isPasswordProtected = metadata?.requiresPassword || metadata?.isPasswordProtected;
    
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[640px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-8 pb-6">
              <h1 className="text-3xl font-bold text-white text-center mb-6">STEN</h1>
              
              {/* Time-based information */}
              {metadata?.expiresAt && (
                <div className={`text-center mb-6 p-4 rounded-xl ${
                  isLowTime 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : 'bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)]'
                }`}>
                  <p className={`text-sm font-medium mb-1 ${
                    isLowTime ? 'text-red-400' : 'text-white/70'
                  }`}>
                    Expiration Status
                  </p>
                  <p className={`text-lg font-semibold ${
                    isLowTime ? 'text-red-400' : 'text-white'
                  }`}>
                    {formatTimeRemaining(timeRemaining)}
                  </p>
                  {timeRemaining.isExpired && (
                    <p className="text-red-400 text-sm mt-2">This STEN has expired</p>
                  )}
                </div>
              )}

              {/* One-time view warning */}
              {metadata?.oneTime && (
                <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-yellow-400 text-sm font-medium">
                      This STEN will be permanently destroyed after closing this page.
                    </p>
                  </div>
                </div>
              )}

              {/* Password protection section */}
              {isPasswordProtected && !content && (
                <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-blue-400 text-sm font-medium">
                      This STEN is password protected
                    </p>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handlePasswordKeyPress}
                      placeholder="Enter password"
                      className="w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
                    />
                    {passwordError && (
                      <p className="text-red-400 text-sm">{passwordError}</p>
                    )}
                    <button
                      onClick={handleUnlockSten}
                      disabled={isUnlocking || !password.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      {isUnlocking ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Unlocking...
                        </div>
                      ) : (
                        'Unlock STEN'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="px-8 pb-8">
              {!content ? (
                /* View Button (for non-password-protected STENs) */
                !isPasswordProtected && (
                  <div className="text-center">
                    <p className="text-white/60 mb-6">
                      Ready to reveal this secure message?
                    </p>
                    <button
                      onClick={handleViewSten}
                      disabled={isLoading}
                      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Loading...
                        </div>
                      ) : (
                        'View STEN'
                      )}
                    </button>
                  </div>
                )
              ) : (
                /* Content Display */
                <div className="space-y-6">
                  <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Message</h3>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white/70 hover:text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <pre className="text-white/90 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                      {content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ViewSten;
