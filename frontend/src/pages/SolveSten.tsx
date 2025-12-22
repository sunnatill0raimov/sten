import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStenMetadata, viewSten } from '../api/stenApi';
import type { StenMetadata } from '../api/stenApi';

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
  const [metadata, setMetadata] = useState<StenMetadata | null>(null);
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
        setMetadata(metadataResponse);

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

  // Handle immediate view for unprotected STENs
  const handleViewSten = async () => {
    if (!id) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await viewSten(id);
      setContent(result.content);
      setState('sten_revealed');
    } catch (err) {
      console.error('View failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to view STEN';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle navigation to create page
  const handleCreateNew = () => {
    navigate('/create');
  };

  // STATE A: Sten Not Found
  if (state === 'not_found') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              STEN Not Found
            </h1>
            <p className="text-red-400 mb-6">
              This STEN does not exist or has been deleted.
            </p>
            <button
              onClick={handleCreateNew}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 px-6 rounded-full transition-colors"
            >
              Create New STEN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE B: Sten Expired
  if (state === 'expired') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              STEN Expired
            </h1>
            <p className="text-red-400 mb-6">
              This STEN is no longer available.
            </p>
            <button
              onClick={handleCreateNew}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 px-6 rounded-full transition-colors"
            >
              Create New STEN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE C: Views Reached
  if (state === 'views_reached') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Views Limit Reached
            </h1>
            <p className="text-red-400 mb-6">
              This STEN has reached its maximum number of views.
            </p>
            <button
              onClick={handleCreateNew}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 px-6 rounded-full transition-colors"
            >
              Create New STEN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE D: Password Required
  if (state === 'password_required') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              Unlock STEN
            </h1>

            {metadata && (
              <div className="mb-6 p-4 bg-[#0A0A0A] rounded-lg">
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">Views remaining:</span> {metadata.viewsRemaining}
                </p>
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">Title:</span> {metadata.title || 'Untitled'}
                </p>
              </div>
            )}

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
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
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
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-full transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? 'Unlocking...' : 'Unlock Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STATE E: Ready To View (No Password Required)
  if (state === 'ready_to_view') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              View STEN
            </h1>

            {metadata && (
              <div className="mb-6 p-4 bg-[#0A0A0A] rounded-lg">
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">Views remaining:</span> {metadata.viewsRemaining}
                </p>
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">Title:</span> {metadata.title || 'Untitled'}
                </p>
              </div>
            )}

            <button
              onClick={handleViewSten}
              disabled={isLoading}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-full transition-colors disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'View Message'}
            </button>

            {error && (
              <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STATE F: Access Denied (Wrong Password)
  if (state === 'access_denied') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              Access Denied
            </h1>

            <div className="text-center mb-6">
              <p className="text-red-400 mb-4">
                Invalid password or access denied.
              </p>
              
              <button
                onClick={() => {
                  setState('password_required');
                  setPassword('');
                  setError('');
                }}
                className="text-[#7C3AED] hover:text-[#6D28D9] underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE G: Sten Revealed
  if (state === 'sten_revealed') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              STEN Revealed
            </h1>

            <div className="mb-6 p-4 bg-[#0A0A0A] rounded-lg">
              <h3 className="text-sm font-medium text-white/70 mb-3">Message:</h3>
              <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>

            <button
              onClick={handleCreateNew}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 px-6 rounded-full transition-colors"
            >
              Create New STEN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE H: Loading
  return (
    <div className="flex items-center justify-center min-h-screen px-6 py-8">
      <div className="w-full max-w-[420px]">
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
          <p className="text-white">Loading STEN...</p>
        </div>
      </div>
    </div>
  );
};

export default SolveSten;
