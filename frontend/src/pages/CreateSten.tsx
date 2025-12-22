import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSten } from '../api/stenApi';

const CreateSten: React.FC = () => {
  const navigate = useNavigate();
  const [stenTitle, setStenTitle] = useState('');
  const [stenText, setStenText] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAfter, setExpiresAfter] = useState('1_hour');
  const [maxViews, setMaxViews] = useState('1');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const expiresOptions = [
    { value: '1_hour', label: '1 Hour' },
    { value: '24_hours', label: '24 Hours' },
    { value: '7_days', label: '7 Days' },
    { value: '30_days', label: '30 Days' }
  ];

  const viewsOptions = [
    { value: '1', label: '1 View' },
    { value: '5', label: '5 Views' },
    { value: '10', label: '10 Views' },
    { value: 'unlimited', label: 'Unlimited' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stenText.trim()) {
      setError('Secret content is required');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const stenData = {
        message: stenText.trim(),
        isPasswordProtected: !!password.trim(),
        password: password.trim() || undefined,
        expiresIn: expiresAfter,
        maxWinners: maxViews === 'unlimited' ? null : parseInt(maxViews),
        oneTime: false
      };

      const response = await createSten(stenData);
      navigate(`/ready/${response.stenId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create STEN');
    } finally {
      setIsLoading(false);
    }
  };

  const hasContent = stenText.trim().length > 0;

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-black border border-white/30 rounded-xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Create Your Sten
            </h1>
            <p className="text-gray-300 text-xs">
              Create an encrypted, time-limited secure message.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-white">
                Title (optional)
              </label>
              <input
                type="text"
                value={stenTitle}
                onChange={(e) => setStenTitle(e.target.value)}
                placeholder="e.g. Database password, Prize rules, API key"
                className="w-full px-3 py-2 bg-black border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/50 focus:outline-none transition-all"
              />
              <p className="text-xs text-gray-400">
                This title helps describe what the Sten contains.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-white">
                Secret Content <span className="text-red-400">*</span>
              </label>
              <textarea
                value={stenText}
                onChange={(e) => setStenText(e.target.value)}
                placeholder="Write or paste the sensitive information here..."
                rows={4}
                className="w-full px-3 py-2 bg-black border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/50 focus:outline-none resize-none transition-all"
                required
              />
              <p className="text-xs text-gray-400">
                This content is encrypted in your browser before being sent.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white">
                  Expiration Time
                </label>
                <select
                  value={expiresAfter}
                  onChange={(e) => setExpiresAfter(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-white/30 rounded-lg text-white focus:border-white/50 focus:outline-none transition-all"
                >
                  {expiresOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-black text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-white">
                  Max Views
                </label>
                <select
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-white/30 rounded-lg text-white focus:border-white/50 focus:outline-none transition-all"
                >
                  {viewsOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-black text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-white">
                Access Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to protect this Sten (optional)"
                className="w-full px-3 py-2 bg-black border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/50 focus:outline-none transition-all"
              />
              <p className="text-xs text-gray-400">
                This password is required to decrypt and view the Sten.
              </p>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-500 rounded-lg p-3">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-5 font-bold rounded-lg transition-all ${
                isLoading
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-600'
                  : hasContent
                  ? 'bg-white text-black border border-white hover:bg-gray-100 focus:outline-none'
                  : 'bg-gray-800 text-gray-400 border border-gray-600 cursor-pointer'
              }`}
            >
              {isLoading ? 'Creating...' : 'Create Secure Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSten;
