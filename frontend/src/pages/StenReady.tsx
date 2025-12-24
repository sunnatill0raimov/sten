import React, { useState} from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';

const StenReady: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Get data passed from CreateSten component
  const { isPasswordProtected, password: stenPassword, qrCode } = location.state || {
    isPasswordProtected: false,
    password: null,
    qrCode: null
  };

  // Updated URLs to work with HashRouter
  const shareUrl = `${window.location.origin}/#/solve/${id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyPassword = async () => {
    if (stenPassword) {
      try {
        await navigator.clipboard.writeText(stenPassword);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } catch (err) {
        console.error('Failed to copy password:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Main Container */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-black border border-white/30 rounded-xl p-6 md:p-8 shadow-2xl">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Your Sten is Ready
            </h1>
            <p className="text-gray-400 text-base md:text-lg">
              Share this link securely. It will self-destruct based on your settings.
            </p>
          </div>

          {/* Single Sten Link Section */}
          <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5 md:p-6 mb-6">
            <h3 className="text-white font-semibold mb-3 text-lg">Share Link</h3>
            
            {/* Desktop Layout */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                <span className="text-white/90 font-mono text-sm break-all">
                  {shareUrl}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                {copiedLink ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 mb-3">
                <span className="text-white/90 font-mono text-sm break-all">
                  {shareUrl}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {copiedLink ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>

            <p className="text-gray-400 text-sm mt-3">
              Anyone with this link can access the Sten until limits are reached.
            </p>
          </div>

          {/* Password Display (Conditional) */}
          {isPasswordProtected && stenPassword && (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5 md:p-6 mb-6">
              <h3 className="text-white font-semibold mb-3 text-lg">Access Password</h3>
              
              {/* Desktop Layout */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                  <span className="text-white/90 font-mono text-sm">
                    {stenPassword.replace(/./g, '•')}
                  </span>
                </div>
                <button
                  onClick={handleCopyPassword}
                  className="bg-gray-700 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors flex-shrink-0"
                >
                  {copiedPassword ? '✓ Copied' : 'Copy Password'}
                </button>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden">
                <div className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 mb-3">
                  <span className="text-white/90 font-mono text-sm">
                    {stenPassword.replace(/./g, '•')}
                  </span>
                </div>
                <button
                  onClick={handleCopyPassword}
                  className="w-full bg-gray-700 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {copiedPassword ? '✓ Copied' : 'Copy Password'}
                </button>
              </div>
            </div>
          )}

          {/* QR Code Section (Conditional) */}
          {qrCode && (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5 md:p-6 mb-6">
              <h3 className="text-white font-semibold mb-4 text-lg">QR Code</h3>

              <div className="flex flex-col items-center space-y-4">
                {/* QR Code Image */}
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <img
                    src={qrCode}
                    alt="QR Code for Sten access"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                {/* Download Button */}
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCode;
                    link.download = `sten-qr-${id}.png`;
                    link.click();
                  }}
                  className="bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download QR Code</span>
                </button>

                <p className="text-gray-400 text-sm text-center">
                  Scan this QR code with any device to access your Sten
                </p>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5 md:p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="text-amber-400 text-xl">⚠️</div>
              <p className="text-amber-100 text-sm leading-relaxed">
                For security reasons, this page will not be accessible again.
              </p>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="mb-8">
            <Link
              to="/create"
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-8 rounded-full hover:from-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-2xl transition-all duration-300 text-center text-lg md:text-xl transform"
            >
              Create a new Sten
            </Link>
          </div>

          {/* Minimal Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-xs">
              © Sten &nbsp;&nbsp;&nbsp; Privacy &nbsp;&nbsp;&nbsp; How it works
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StenReady;
