import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStenMetadata, unlockSten, viewSten } from '../api/stenApi';
import type { StenMetadata, StenContent } from '../api/stenApi';

type ViewState = 
  | 'loading'
  | 'not_found'
  | 'expired'
  | 'solved'
  | 'winners_reached'
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
  const [viewInfo, setViewInfo] = useState<StenContent | null>(null);

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
        } else if (metadataResponse.reason === 'already_solved') {
          setState('solved');
        } else if (metadataResponse.reason === 'winners_reached') {
          setState('winners_reached');
        } else if (metadataResponse.passwordProtected) {
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

  // Handle password unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await unlockSten(id, password);
      setContent(result.content);
      setViewInfo(result);
      setState('sten_revealed');
    } catch (err) {
      console.error('Unlock failed:', err);
      setError(err instanceof Error ? err.message : 'Incorrect password');
      setState('access_denied');
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
      setViewInfo(result);
      setState('sten_revealed');
    } catch (err) {
      console.error('View failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to view STEN');
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
              This STEN does not exist or has expired.
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
            <h1 className="text-2xl font-bold text-white mb-4 Expired
           ">
              STEN </h1>
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

  // STATE C: Already Solved
  if (state === 'solved') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              STEN Already Solved
            </h1>
            <p className="text-red-400 mb-6">
              This STEN has already been solved.
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

  // STATE D: Maximum Winners Reached
  if (state === 'winners_reached') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Maximum Winners Reached
            </h1>
            <p className="text-red-400 mb-6">
              This STEN has reached its maximum number of winners.
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

  // STATE E: Password Required
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
                  <span className="font-medium">Remaining views:</span> {metadata.remainingViews}
                </p>
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">One-time view:</span> {metadata.oneTime ? 'Yes' : 'No'}
                </p>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-6">
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

  // STATE F: Ready To View (No Password Required)
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
                  <span className="font-medium">Remaining views:</span> {metadata.remainingViews}
                </p>
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">One-time view:</span> {metadata.oneTime ? 'Yes' : 'No'}
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

  // STATE G: Access Denied (Wrong Password)
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

  // STATE H: Sten Revealed
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

            {viewInfo && (
              <div className="mb-6 p-4 bg-[#0A0A0A] rounded-lg">
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">Current winners:</span> {viewInfo.currentWinners}
                </p>
                <p className="text-sm text-white/70 mb-2">
                  <span className="font-medium">Status:</span> {viewInfo.solved ? 'Solved' : 'Active'}
                </p>
                {viewInfo.consumed && (
                  <p className="text-sm text-yellow-400">
                    <span className="font-medium">Note:</span> This STEN has been consumed and will no longer be available.
                  </p>
                )}
              </div>
            )}

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

  // STATE I: Loading
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
