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
  const [showPassword, setShowPassword] = useState(false);

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

  // Generate random secure password
  const generateRandomPassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let newPassword = '';
    
    // Ensure at least one of each type
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    newPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
    newPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
    newPassword += numbers[Math.floor(Math.random() * numbers.length)];
    newPassword += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = newPassword.length; i < length; i++) {
      newPassword += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    newPassword = newPassword.split('').sort(() => Math.random() - 0.5).join('');
    
    setPassword(newPassword);
    setShowPassword(true);
  };

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
        title: stenTitle.trim() || undefined,
        message: stenText.trim(),
        isPasswordProtected: !!password.trim(),
        password: password.trim() || undefined,
        expiresIn: expiresAfter,
        maxViews: maxViews === 'unlimited' ? null : parseInt(maxViews)
      };

      const response = await createSten(stenData);
      
      // Extract ID from the link (format: http://localhost:5173/#/solve/123456789)
      const linkParts = response.link.split('/');
      const stenId = linkParts[linkParts.length - 1];
      
      navigate(`/ready/${stenId}`, { 
        state: { 
          isPasswordProtected: !!password.trim(),
          password: password.trim() || null,
          expiresIn: expiresAfter,
          maxViews: maxViews 
        }
      });
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
                Access Password (optional)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10"
                  title="Generate random password"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                </button>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password or generate one"
                  className="w-full pl-11 pr-11 py-2 bg-black border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/50 focus:outline-none transition-all"
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
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
                )}
              </div>
              <p className="text-xs text-gray-400">
                {password 
                  ? "This password is required to decrypt and view the Sten."
                  : "Leave empty for no password protection, or click the refresh icon to generate a strong password."}
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