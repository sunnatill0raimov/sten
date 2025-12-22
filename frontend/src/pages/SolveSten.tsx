import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStenMetadata, viewSten } from '../api/stenApi';

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
  const [content, setContent] = useState<string>('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // INITIAL LOAD: Get STEN metadata
  useEffect(() => {
    if (!id) {
      setState('not_found');
      return;
    }

    const loadStenMetadata = async () => {
      try {
        const metadataResponse = await getStenMetadata(id);

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
    if (!id) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await viewSten(id, password || undefined);
      setContent(result.content);
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

  // Secure Access Page Component
  const SecureAccessPage = ({ isPasswordError = false }: { isPasswordError?: boolean }) => (
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
                    <p className="text-white font-medium">Secure Message</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-white/70 text-sm">Share ID:</p>
                    <p className="text-white font-mono font-medium">{id ? `${id.slice(0, 8)}...${id.slice(-4)}` : 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="text-white/70 text-sm">Encryption:</p>
                    <p className="text-white font-medium">Client-side decryption with AES-256</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer and Views Section */}
            <div className="flex justify-between items-center mb-8 p-4 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-medium">59m 48s remaining</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-white font-medium">0/1 views</span>
              </div>
            </div>

            <form onSubmit={handleAccessSten} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Enter Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className={`w-full px-4 py-3 bg-[#0A0A0A] border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-1 ${
                    isPasswordError 
                      ? 'border-red-500/30 focus:border-red-500 focus:ring-red-500' 
                      : 'border-[rgba(255,255,255,0.08)] focus:border-[#7C3AED] focus:ring-[#7C3AED]'
                  }`}
                  placeholder="Enter password to unlock"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Accessing Content...
                  </div>
                ) : (
                  'Access Content'
                )}
              </button>
            </form>

            {/* UX Information */}
            <div className="text-center mt-6 mb-6">
              <p className="text-white/60 text-sm leading-relaxed">
                This content is encrypted and can only be accessed within the allowed time and view limit.
                Once opened, view count will increase.
              </p>
            </div>

            {/* Secondary Action */}
            <div className="text-center">
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white font-medium rounded-full transition-colors"
              >
                Create New Sten
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // STATE A: Loading
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
            <p className="text-white/70">Loading secure content...</p>
          </div>
        </div>
      </div>
    );
  }

  // STATE B: Sten Not Found
  if (state === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Content Not Found
            </h1>
            <p className="text-red-400 mb-6">
              This secure content doesn't exist or has already been accessed.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-full transition-colors"
            >
              Create New Sten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE C: Sten Expired
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Content Expired
            </h1>
            <p className="text-red-400 mb-6">
              This secure content has expired and is no longer accessible.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-full transition-colors"
            >
              Create New Sten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE D: Views Reached
  if (state === 'views_reached') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Views Limit Reached
            </h1>
            <p className="text-red-400 mb-6">
              This secure content has reached its maximum number of views.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-full transition-colors"
            >
              Create New Sten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE E: Access Denied (Invalid Password)
  if (state === 'access_denied') {
    return <SecureAccessPage isPasswordError={true} />;
  }

  // STATE F: Password Required
  if (state === 'password_required') {
    return <SecureAccessPage />;
  }

  // STATE G: Ready To View (No Password Required)
  if (state === 'ready_to_view') {
    return <SecureAccessPage />;
  }

  // STATE H: Sten Revealed (Content Display)
  if (state === 'sten_revealed') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h1 className="text-3xl font-bold text-white text-center mb-8">
                Secure Content Revealed
              </h1>

              <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6">
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
                <div className="bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
                  <p className="text-white leading-relaxed whitespace-pre-wrap">{content}</p>
                </div>
              </div>

              {/* Security Status */}
              <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-white/70 text-sm">Security Status:</p>
                    <p className="text-white font-medium">Content successfully decrypted and viewed</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Content
                </button>
                <button
                  onClick={handleCreateNew}
                  className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Create New Sten
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SolveSten;
