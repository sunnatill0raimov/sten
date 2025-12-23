import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStenMetadata, viewSten, type StenMetadata } from '../api/stenApi';

type ViewState = 
  | 'loading'
  | 'not_found'
  | 'expired'
  | 'views_reached'
  | 'password_required'
  | 'ready_to_view'
  | 'access_denied'
  | 'sten_revealed';

const SolveSten: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ViewState>('loading');
  const [sten, setSten] = useState<StenMetadata | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Timer effect for countdown
  useEffect(() => {
    if (!sten?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(sten.expiresAt!).getTime();
      const timeLeft = expiresAt - now;

      if (timeLeft <= 0) {
        setTimeRemaining('Expired');
        setState('expired');
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      let timeString = '';
      if (days > 0) {
        timeString = `${days}d ${hours}h ${minutes}m remaining`;
      } else if (hours > 0) {
        timeString = `${hours}h ${minutes}m ${seconds}s remaining`;
      } else if (minutes > 0) {
        timeString = `${minutes}m ${seconds}s remaining`;
      } else {
        timeString = `${seconds}s remaining`;
      }

      setTimeRemaining(timeString);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [sten?.expiresAt]);

  // INITIAL LOAD: Get STEN metadata
  useEffect(() => {
    if (!id) {
      setState('not_found');
      return;
    }

    const loadStenMetadata = async () => {
      try {
        const metadataResponse = await getStenMetadata(id);
        setSten(metadataResponse);

        // Handle all metadata response cases
        if (!metadataResponse.exists) {
          setState('not_found');
        } else if (metadataResponse.expired) {
          setState('expired');
        } else if (typeof metadataResponse.viewsRemaining === 'number' && metadataResponse.viewsRemaining <= 0) {
          setState('views_reached');
        } else if (metadataResponse.isPasswordProtected) {
          setState('password_required');
        } else {
          // Password not required, can view immediately
          setState('ready_to_view');
        }
      } catch (err) {
        console.error('Failed to load STEN metadata:', err);
        setState('not_found');
      }
    };

    loadStenMetadata();
  }, [id]);

  // Handle password unlock and viewing (unified function)
  const handleAccessSten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !sten) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await viewSten(id, password || undefined);
      setContent(result.content);
      
      // Update sten data with new view count
      setSten(prev => prev ? {
        ...prev,
        currentViews: (prev.currentViews || 0) + 1
      } : null);
      
      setState('sten_revealed');
    } catch (err) {
      console.error('Access failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to access STEN';
      
      if (errorMessage.includes('Invalid password') || errorMessage.includes('Incorrect password')) {
        setError('Incorrect password');
        setState('access_denied');
      } else if (errorMessage.includes('expired')) {
        setState('expired');
      } else if (errorMessage.includes('views') && errorMessage.includes('reached')) {
        setState('views_reached');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle navigation to create page
  const handleCreateNew = () => {
    navigate('/create');
  };

  // Copy content to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format Share ID for display
  const formatShareId = () => {
    if (!id) return 'N/A';
    return `${id.slice(0, 8)}...${id.slice(-4)}`;
  };

  // Format view count from real backend data
  const formatViewCount = () => {
    if (!sten) return '0/1';
    const currentViews = sten.currentViews || 0;
    const maxViews = sten.maxViews;
    
    if (maxViews === null || maxViews === undefined) {
      return `${currentViews}/∞`;
    }
    return `${currentViews}/${maxViews}`;
  };

  // Get title from real backend data
  const getTitle = () => {
    return sten?.title || 'Secure Message';
  };

  // Get password protection status from real backend data
  const hasPassword = () => {
    return sten?.isPasswordProtected || false;
  };

  // Get creation date from real backend data
  const getCreatedAt = () => {
    if (!sten?.createdAt) return 'Unknown';
    return new Date(sten.createdAt).toLocaleDateString();
  };

  // EARLY RETURN PATTERN - NO SWITCH STATEMENT
  
  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading secure content...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (state === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px] text-center">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Content Not Found</h1>
            <p className="text-white/70 mb-8">
              The secure content you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Create New Sten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expired state
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px] text-center">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <div className="w-16 h-16 bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Content Expired</h1>
            <p className="text-white/70 mb-8">
              This secure content has expired and is no longer accessible.
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Create New Sten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Views reached state
  if (state === 'views_reached') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px] text-center">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">View Limit Reached</h1>
            <p className="text-white/70 mb-8">
              This content has reached its maximum view limit and can no longer be accessed.
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Create New Sten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password required / Ready to view / Access denied states
  if (state === 'password_required' || state === 'ready_to_view' || state === 'access_denied') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h1 className="text-3xl font-bold text-white text-center mb-8">
                Access Secure Content
              </h1>

              {/* Security Info Block */}
              <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="text-white/70 text-sm">Accessing:</p>
                      <p className="text-white font-medium">{getTitle()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-white/70 text-sm">Share ID:</p>
                      <p className="text-white font-mono font-medium">{formatShareId()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <p className="text-white/70 text-sm">Security:</p>
                      <p className="text-white font-medium">
                        {hasPassword() ? 'Password Protected' : 'No Password Required'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-2M7 3h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                    <div>
                      <p className="text-white/70 text-sm">Created:</p>
                      <p className="text-white font-medium">{getCreatedAt()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <div>
                      <p className="text-white/70 text-sm">Views:</p>
                      <p className="text-white font-medium">{formatViewCount()}</p>
                    </div>
                  </div>

                  {sten?.expiresAt && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-white/70 text-sm">Expires:</p>
                        <p className="text-white font-medium">{timeRemaining}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Form or Access Button */}
              <form onSubmit={handleAccessSten} className="space-y-4">
                {state === 'password_required' && (
                  <div>
                    <label htmlFor="password" className="block text-white/70 text-sm mb-2">
                      Enter Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="Password"
                      required
                      autoFocus
                    />
                  </div>
                )}

                {error && state === 'access_denied' && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#7C3AED]/50 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  {isLoading ? 'Accessing...' : state === 'password_required' ? 'Unlock Content' : 'View Content'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sten revealed state
  if (state === 'sten_revealed') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[800px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Secure Content</h1>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-semibold py-2 px-4 rounded-xl border border-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    Create New
                  </button>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6">
                <pre className="text-white whitespace-pre-wrap break-words font-mono text-sm">
                  {content}
                </pre>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-semibold text-sm mb-1">Security Notice</p>
                    <p className="text-yellow-400/80 text-sm">
                      This content has been viewed and may have reduced availability. Save it now if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should never reach here)
  return null;
};

export default SolveSten;