import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/ui/CustomSelect.tsx';
import { createSten } from '../api/stenApi';

const CreateSten: React.FC = () => {
  const navigate = useNavigate();
  const [stenText, setStenText] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [expiresAfter, setExpiresAfter] = useState('after_viewing');
  const [maxWinners, setMaxWinners] = useState('1');
  const [oneTimeView, setOneTimeView] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Rotating placeholder examples
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderExamples = [
    "Write a secret message. Only allowed viewers will be able to see it.",
    "The prize code is hidden here...",
    "First one wins 🎁",
    "Confidential message"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Password validation requirements
  const passwordRequirements = [
    {
      id: 'length',
      label: 'At least 8 characters',
      check: (pwd: string) => pwd.length >= 8,
      regex: /.{8,}/
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter',
      check: (pwd: string) => /[A-Z]/.test(pwd),
      regex: /[A-Z]/
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter',
      check: (pwd: string) => /[a-z]/.test(pwd),
      regex: /[a-z]/
    },
    {
      id: 'numbers',
      label: 'At least one number',
      check: (pwd: string) => /\d/.test(pwd),
      regex: /\d/
    },
    {
      id: 'symbols',
      label: 'At least one symbol (!@#$%^&*...)',
      check: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      regex: /[!@#$%^&*(),.?":{}|<>]/
    }
  ];

  // Check password strength
  const getPasswordStrength = (pwd: string) => {
    const passed = passwordRequirements.filter(req => req.check(pwd)).length;
    const strength = passed / passwordRequirements.length;
    
    if (strength >= 0.8) return { level: 'Strong', color: 'text-green-400', bgColor: 'bg-green-400' };
    if (strength >= 0.6) return { level: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-400' };
    if (strength >= 0.4) return { level: 'Weak', color: 'text-orange-400', bgColor: 'bg-orange-400' };
    return { level: 'Very Weak', color: 'text-red-400', bgColor: 'bg-red-400' };
  };

  const passwordStrength = getPasswordStrength(password);
  const isPasswordValid = passwordRequirements.every(req => req.check(password));

  const expiresOptions = [
    { 
      value: 'after_viewing', 
      label: 'After Viewing',
      description: 'Expires immediately after being opened'
    },
    { 
      value: '1_hour', 
      label: '1 Hour',
      description: 'Automatically expires after time limit'
    },
    { 
      value: '24_hours', 
      label: '24 Hours',
      description: 'Automatically expires after time limit'
    },
    { 
      value: '7_days', 
      label: '7 Days',
      description: 'Automatically expires after time limit'
    },
    { 
      value: '30_days', 
      label: '30 Days',
      description: 'Automatically expires after time limit'
    }
  ];

  const winnersOptions = [
    { value: '1', label: '1 Winner' },
    { value: '5', label: '5 Winners' },
    { value: '10', label: '10 Winners' },
    { value: 'unlimited', label: 'Unlimited' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stenText.trim() || (isPasswordProtected && !isPasswordValid)) {
      setShowValidationError(true);
      return;
    }

    setShowValidationError(false);
    setIsLoading(true);
    setError('');

    try {
      const stenData = {
        message: stenText.trim(),
        isPasswordProtected,
        ...(isPasswordProtected && { password: password.trim() }),
        expiresIn: expiresAfter,
        maxWinners: maxWinners === 'unlimited' ? null : parseInt(maxWinners),
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

  // Get current expiration description
  const getCurrentExpirationDescription = () => {
    const option = expiresOptions.find(opt => opt.value === expiresAfter);
    return option?.description || '';
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
                  placeholder={placeholderExamples[placeholderIndex]}
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
                    : isPasswordProtected && !isPasswordValid
                    ? 'Password does not meet the required criteria. Please check the requirements below.'
                    : 'Please enter a message to create your Sten.'
                  }
                </p>
              </div>

              {/* Password Protection Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    Password Protection
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordProtected(!isPasswordProtected);
                      if (isPasswordProtected) {
                        setPassword('');
                      }
                    }}
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
                
                <p className="text-xs text-white/60 leading-relaxed">
                  If enabled, users must enter a password to view this Sten.
                </p>
              </div>

              {/* Password Input - Conditional */}
              {isPasswordProtected && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-[#0A0A0A] border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-1 transition-all duration-200 ${
                        password.length === 0 
                          ? 'border-[rgba(255,255,255,0.08)] focus:border-[#7C3AED] focus:ring-[#7C3AED]'
                          : isPasswordValid 
                          ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/30' 
                          : 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                      }`}
                      placeholder="Choose a strong password"
                      required={isPasswordProtected}
                    />
                  </div>

                  {/* Password Requirements */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/80">Password Requirements:</p>
                    <div className="space-y-2">
                      {passwordRequirements.map((req) => {
                        const isPassed = req.check(password);
                        return (
                          <div key={req.id} className="flex items-center space-x-2">
                            <span className={`text-xs ${isPassed ? 'text-green-400' : 'text-white/40'}`}>
                              {isPassed ? '✓' : '○'}
                            </span>
                            <span className={`text-xs ${isPassed ? 'text-green-400' : 'text-white/60'}`}>
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/80">Password Strength:</span>
                        <span className={`text-xs font-medium ${passwordStrength.color}`}>
                          {passwordStrength.level}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.bgColor}`}
                          style={{ 
                            width: `${Math.max(10, (passwordRequirements.filter(req => req.check(password)).length / passwordRequirements.length) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* One-time View Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    One-time View
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
                
                <div className="flex items-start space-x-2">
                  <p className="text-xs text-white/60 leading-relaxed flex-1">
                    When enabled, this Sten disappears after the first successful view.
                  </p>
                  {oneTimeView && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-500/30">
                        ⚠️ Cannot be undone
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expires After Select */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-white/80">
                  Expires After
                </label>
                <CustomSelect
                  value={expiresAfter}
                  onChange={setExpiresAfter}
                  options={expiresOptions}
                  placeholder="Select expiration time"
                />
                <p className="text-xs text-white/60 leading-relaxed">
                  {getCurrentExpirationDescription()}
                </p>
              </div>

              {/* Maximum Winners Select */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-white/80">
                  Maximum Winners
                </label>
                <CustomSelect
                  value={maxWinners}
                  onChange={setMaxWinners}
                  options={winnersOptions}
                  placeholder="Select winner limit"
                />
                <div className="space-y-1">
                  <p className="text-xs text-white/60">
                    Number of users who can successfully view this Sten.
                  </p>
                  {maxWinners === '1' && (
                    <p className="text-xs text-green-400">
                      ✨ Perfect for giveaways and secret drops.
                    </p>
                  )}
                </div>
              </div>

              {/* API Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 red-glow">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:from-[#6D28D9] hover:to-[#9333EA] shadow-lg hover:shadow-xl hover:shadow-[#7C3AED]/25'
                }`}
              >
                {isLoading ? 'Creating...' : 'Create Sten'}
              </button>
            </form>
        </div>
    </div>
  );
};

export default CreateSten;
