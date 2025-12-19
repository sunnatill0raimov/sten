import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { solveSten } from '../api/stenApi';

const SolveSten: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await solveSten(id, { password });

      if (result.success) {
        // Handle success - maybe navigate to a success page or show the content
        alert('STEN solved successfully!');
      } else {
        setError(result.message || 'Incorrect password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to solve STEN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-[420px]">
          {/* Main Card with Purple Glow */}
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 purple-glow">
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              Solve STEN
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 red-glow">
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
};

export default SolveSten;
