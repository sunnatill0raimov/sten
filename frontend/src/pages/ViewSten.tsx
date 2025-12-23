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
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
      parts.push(`${time.days}d`);
    }
    if (time.hours > 0) {
      parts.push(`${time.hours}h`);
    }
    if (time.minutes > 0) {
      parts.push(`${time.minutes}m`);
    }
    if (time.seconds > 0 && parts.length === 0) {
      parts.push(`${time.seconds}s`);
    }

    return parts.join(' ');
  };

  // Update countdown every second
  useEffect(() => {
    if (!metadata?.expiresAt) return;

    const updateCountdown = () => {
      const remaining = calculateTimeRemaining(metadata.expiresAt!);
      setTimeRemaining(remaining);
      
      if (remaining.isExpired && stenState === 'active') {
        setStenState('expired');
      }
    };

    updateCountdown();
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
      setPassword('');
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
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Error State Component
  const ErrorState = ({ 
    icon, 
    title, 
    description, 
    iconBg 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string;
    iconBg: string;
  }) => (
    <div className="flex items-center justify-center min-h-screen px-6 py-8 bg-gradient-to-br from-black via-[#0A0A0A] to-black">
      <div className="w-full max-w-[560px]">
        <div className="relative bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/10 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-xl">
          {/* Decorative glow */}
          <div className={`absolute inset-0 ${iconBg} opacity-5 blur-3xl rounded-3xl`}></div>
          
          <div className="relative z-10">
            {/* Icon */}
            <div className={`w-20 h-20 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-105 transition-transform`}>
              {icon}
            </div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              {title}
            </h1>
            
            {/* Description */}
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              {description}
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={handleGoHome}
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg backdrop-blur-sm"
              >
                Go Home
              </button>
              <button
                onClick={handleCreateNew}
                className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-xl shadow-purple-500/50"
              >
                Create New Sten
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Loading State
  if (stenState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8 bg-gradient-to-br from-black via-[#0A0A0A] to-black">
        <div className="w-full max-w-[560px]">
          <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/10 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-xl">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600/20 border-t-purple-600 mx-auto mb-6"></div>
              <div className="absolute inset-0 bg-purple-600/20 blur-2xl rounded-full"></div>
            </div>
            <p className="text-white/80 text-lg font-medium">Loading secure content...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (stenState === 'not_found') {
    return (
      <ErrorState
        icon={
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        }
        title="Sten Not Found"
        description="This secure message doesn't exist or has already been viewed and destroyed."
        iconBg="bg-red-500/20"
      />
    );
  }

  // Destroyed State
  if (stenState === 'destroyed') {
    return (
      <ErrorState
        icon={
          <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        }
        title="Sten Destroyed"
        description="This message has been permanently destroyed after viewing. Create a new one to share secure content."
        iconBg="bg-orange-500/20"
      />
    );
  }

  // Expired State
  if (stenState === 'expired') {
    return (
      <ErrorState
        icon={
          <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="Sten Expired"
        description="This secure message has expired and is no longer accessible. Time-limited content ensures maximum security."
        iconBg="bg-yellow-500/20"
      />
    );
  }

  // Active State
  if (stenState === 'active') {
    const isLowTime = timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes < 10 && !timeRemaining.isExpired;
    const isPasswordProtected = metadata?.requiresPassword || metadata?.isPasswordProtected;
    
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8 bg-gradient-to-br from-black via-[#0A0A0A] to-black">
        <div className="w-full max-w-[680px]">
          <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="p-8 pb-6 border-b border-white/5">
              <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 via-white to-purple-400 bg-clip-text text-transparent">
                Secure Message
              </h1>
              <p className="text-center text-white/50 text-sm">End-to-end encrypted content</p>
            </div>

            <div className="p-8">
              {/* Time-based information */}
              {metadata?.expiresAt && (
                <div className={`mb-6 p-5 rounded-2xl backdrop-blur-sm transition-all ${
                  isLowTime 
                    ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 shadow-lg shadow-red-500/20' 
                    : 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isLowTime ? 'bg-red-500/30' : 'bg-white/10'
                      }`}>
                        <svg className={`w-5 h-5 ${isLowTime ? 'text-red-400' : 'text-white/70'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className={`text-xs font-medium mb-0.5 ${isLowTime ? 'text-red-400' : 'text-white/60'}`}>
                          {isLowTime ? '⚠️ Expiring Soon' : 'Valid Until'}
                        </p>
                        <p className={`text-lg font-bold ${isLowTime ? 'text-red-400' : 'text-white'}`}>
                          {formatTimeRemaining(timeRemaining)}
                        </p>
                      </div>
                    </div>
                    {isLowTime && (
                      <span className="px-3 py-1 bg-red-500/30 rounded-full text-red-400 text-xs font-semibold animate-pulse">
                        URGENT
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* One-time view warning */}
              {metadata?.oneTime && (
                <div className="mb-6 p-5 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl backdrop-blur-sm shadow-lg shadow-yellow-500/10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-yellow-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-yellow-400 font-semibold mb-1">One-Time View Warning</p>
                      <p className="text-yellow-400/80 text-sm leading-relaxed">
                        This message will be permanently destroyed after you view it. Make sure you're ready before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Password protection section */}
              {isPasswordProtected && !content && (
                <div className="mb-6 p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl backdrop-blur-sm shadow-lg shadow-blue-500/10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-blue-400 font-semibold">Password Required</p>
                      <p className="text-blue-400/70 text-sm">Enter the password to unlock this message</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handlePasswordKeyPress}
                        placeholder="Enter password"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {passwordError && (
                      <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm animate-shake">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <p className="text-red-400 text-sm font-medium">{passwordError}</p>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleUnlockSten}
                      disabled={isUnlocking || !password.trim()}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-xl shadow-blue-500/30 disabled:hover:scale-100"
                    >
                      {isUnlocking ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                          Unlocking...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Unlock Message
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Content Area */}
              {!content ? (
                !isPasswordProtected && (
                  <div className="text-center">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <p className="text-white/70 text-lg mb-2">Ready to reveal?</p>
                      <p className="text-white/50 text-sm">Click the button below to view the secure message</p>
                    </div>
                    
                    <button
                      onClick={handleViewSten}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-2xl shadow-purple-500/50"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                          Loading...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Message
                        </div>
                      )}
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">Decrypted Message</h3>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                          copySuccess
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                        }`}
                      >
                        {copySuccess ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                      <pre className="text-white/90 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                        {content}
                      </pre>
                    </div>
                  </div>

                  {/* Success Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleGoHome}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Home
                      </div>
                    </button>
                    <button
                      onClick={handleCreateNew}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-xl shadow-purple-500/30"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New
                      </div>
                    </button>
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