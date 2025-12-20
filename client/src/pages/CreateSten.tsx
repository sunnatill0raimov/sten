import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/ui/CustomSelect.tsx';
import { createSten } from '../api/stenApi';

const CreateSten: React.FC = () => {
  const navigate = useNavigate();
  const [stenText, setStenText] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [expiresAfter, setExpiresAfter] = useState('after-viewing');
  const [maxWinners, setMaxWinners] = useState('1');
  const [oneTimeView, setOneTimeView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const expiresOptions = [
    { value: 'after-viewing', label: 'After Viewing' },
    { value: '1-hour', label: '1 Hour' },
    { value: '24-hours', label: '24 Hours' },
    { value: '7-days', label: '7 Days' },
    { value: '30-days', label: '30 Days' }
  ];

  const winnersOptions = [
    { value: '1', label: '1 Winner' },
    { value: '5', label: '5 Winners' },
    { value: '10', label: '10 Winners' },
    { value: 'unlimited', label: 'Unlimited' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stenText.trim() || (isPasswordProtected && !password.trim())) {
      setShowValidationError(true);
      return;
    }

    setShowValidationError(false);
    setIsLoading(true);
    setError('');

    try {
      // Convert expiresAfter to Date
      const calculateExpiresAt = (expiresAfter: string): Date => {
        const now = new Date();
        switch (expiresAfter) {
          case 'after-viewing':
            return now; // Will be set to current time, expires immediately after viewing
          case '1-hour':
            return new Date(now.getTime() + 60 * 60 * 1000);
          case '24-hours':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
          case '7-days':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          case '30-days':
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          default:
            return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours
        }
      };

      const stenData = {
        message: stenText.trim(),
        isPasswordProtected,
        ...(isPasswordProtected && { password: password.trim() }),
        expiresAt: calculateExpiresAt(expiresAfter),
        maxWinners: maxWinners === 'unlimited' ? 999999 : parseInt(maxWinners),
        oneTime: oneTimeView
      };

      const response = await createSten(stenData);
      navigate(`/ready/${response.stenId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create STEN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center min-h-screen p-0.5 mt-[10px]">
        <div className="w-full max-w-[420px] bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 purple-glow">
            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-8">
              Create a Sten
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sten Textarea */}
              <div>
                <textarea
                  value={stenText}
                  onChange={(e) => {
                    setStenText(e.target.value);
                    if (showValidationError && e.target.value.trim()) {
                      setShowValidationError(false);
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-xl text-white placeholder-white/40 focus:outline-none transition-all duration-200 resize-none ${
                    showValidationError
                      ? 'bg-red-900/10 border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 shadow-lg shadow-red-500/10'
                      : 'bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] border-white/20 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30 shadow-lg shadow-[#7C3AED]/5 hover:border-white/30 hover:shadow-xl hover:shadow-[#7C3AED]/10'
                  }`}
                  rows={4}
                  placeholder="Type your Sten..."
                />
              </div>


              {/* Validation Error */}
              <div className={`rounded-lg p-3 transition-opacity duration-200 ${
                showValidationError
                  ? 'bg-red-900/20 border border-red-500/30 red-glow opacity-100'
                  : 'opacity-0'
              }`}>
                <p className={`text-red-400 text-sm ${
                  showValidationError ? 'block' : 'invisible'
                }`}>
                  {!stenText.trim() 
                    ? 'Your Sten message cannot be empty. Please enter a message.'
                    : isPasswordProtected && !password.trim()
                    ? 'Password is required when protection is enabled. Please enter a password.'
                    : 'Please enter a message to create your Sten.'
                  }
                </p>
              </div>

              {/* API Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 red-glow">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Expires After Select */}
              <div>
                <label className="block text-xs font-medium text-white/80 mb-2">
                  Expires After
                </label>
                <CustomSelect
                  value={expiresAfter}
                  onChange={setExpiresAfter}
                  options={expiresOptions}
                  placeholder="Select expiration time"
                />
              </div>

              {/* Maximum Winners Select */}
              <div>
                <label className="block text-xs font-medium text-white/80 mb-2">
                  Maximum Winners
                </label>
                <CustomSelect
                  value={maxWinners}
                  onChange={setMaxWinners}
                  options={winnersOptions}
                  placeholder="Select winner limit"
                />
                <p className="text-xs text-white/50 mt-2">
                  How many users can successfully solve this Sten.
                </p>
              </div>

              {/* One-time View Toggle */}
              <div className="flex items-center justify-between !mt-2">
                <label className="text-sm font-medium text-white">
                  One-time view
                </label>
                <button
                  type="button"
                  onClick={() => setOneTimeView(!oneTimeView)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    oneTimeView ? 'bg-[#7C3AED]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      oneTimeView ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Password Protection Toggle */}
              <div className="flex items-center justify-between !mt-2">
                <label className="text-sm font-medium text-white">
                  Password Protection
                </label>
                <button
                  type="button"
                  onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPasswordProtected ? 'bg-[#7C3AED]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPasswordProtected ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Password Input - Conditional */}
              {isPasswordProtected && (
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                    placeholder="Enter password to protect your Sten"
                    required={isPasswordProtected}
                  />
                </div>
              )}

              {/* Challenge Rules Section */}
              <div className="border-t border-white/10 my-6"></div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Challenge Rules</h3>

                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex items-start space-x-2">
                    <span className="text-[#7C3AED] mt-1.5">•</span>
                    <p>Sten expires immediately after the first successful view, regardless of winner limit</p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="text-[#7C3AED] mt-1.5">•</span>
                    <p>Multiple users can attempt to solve, but only the winner limit can succeed</p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="text-[#7C3AED] mt-1.5">•</span>
                    <p>Once solved, all future attempts will be rejected</p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="text-[#7C3AED] mt-1.5">•</span>
                    <p>One-time view prevents multiple views by the same winner</p>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-medium py-3 px-6 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create a Sten'}
              </button>
            </form>
        </div>
    </div>
  );
};

export default CreateSten;
