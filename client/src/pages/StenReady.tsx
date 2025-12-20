import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const StenReady: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copiedPrimary, setCopiedPrimary] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const shareUrl = `${window.location.origin}/solve/${id}`;
  const challengeUrl = `${window.location.origin}/solve/${id}?challenge=true`;
  const decryptionKey = id || 'STEN-KEY-EXAMPLE';

  const handleCopyPrimary = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedPrimary(true);
      setTimeout(() => setCopiedPrimary(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyChallenge = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopiedChallenge(true);
      setTimeout(() => setCopiedChallenge(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(decryptionKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 pt-4 pb-8">
        <div className="max-w-[480px] mx-auto">
          {/* 1) Title + subtitle */}
          <div className="text-left mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Your Sten is ready</h1>
            <p className="text-gray-400 text-base">Only one person can unlock it.</p>
          </div>

          {/* 2) Lottery rules warning card */}
          <div className="bg-gradient-to-r from-red-900/20 to-black/30 border border-red-500/30 rounded-xl p-5 mb-6 red-glow">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-2xl">⚠️</div>
              <div>
                <h3 className="text-red-400 font-bold mb-3 text-lg">Lottery Rules</h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  Only ONE person can succeed!<br />
                  The first correct solve wins this Sten.<br />
                  All others will find it locked forever. 🎁
                </p>
              </div>
            </div>
          </div>

          {/* 2.5) Self-destruct timing info card */}
          <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-500/30 rounded-xl p-5 mb-6 yellow-glow">
            <div className="flex items-center space-x-3">
              <div className="text-amber-400 text-xl">⏰</div>
              <p className="text-white/90 text-sm leading-relaxed">
                This Sten also self-destructs immediately after unlocking.
              </p>
            </div>
          </div>

          {/* 3) Self-destruct info card */}
          <div className="bg-gradient-to-r from-red-900/20 to-pink-900/20 border border-red-500/30 rounded-xl p-5 mb-6 red-glow">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-2xl">💥</div>
              <div>
                <h3 className="text-red-400 font-semibold mb-2">Self-Destruct</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  This message will automatically delete itself after being solved.
                  Keep your decryption key safe if you want to access it later.
                </p>
              </div>
            </div>
          </div>

          {/* 4) Primary access block */}
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 mb-6 shadow-inner">
            <h3 className="text-white font-semibold mb-2">Primary access</h3>
            <p className="text-white/70 text-sm mb-4">Direct attempt — no key required</p>

            {/* Row layout: [Copy button] [Masked URL field] */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyPrimary}
                className="bg-white text-black font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 min-w-[100px]"
              >
                {copiedPrimary ? '✓ Copied' : 'Copy link'}
              </button>

              <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-white/60 font-mono text-sm">••••••••••••••••••••</span>
              </div>
            </div>
          </div>

          {/* 5) Challenge access block */}
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 mb-6 shadow-inner">
            <h3 className="text-white font-semibold mb-2">Challenge access</h3>
            <p className="text-white/70 text-sm mb-4">Requires solving the Sten key</p>

            {/* Row layout: [Copy button] [Masked URL field] */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyChallenge}
                className="bg-gray-700 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex-shrink-0 min-w-[100px]"
              >
                {copiedChallenge ? '✓ Copied' : 'Copy link'}
              </button>

              <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-white/60 font-mono text-sm">••••••••••••••••••••</span>
              </div>
            </div>
          </div>

          {/* 6) Decryption key block */}
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 mb-8 shadow-inner">
            <h3 className="text-white font-semibold mb-2">Decryption key</h3>

            {/* Row layout: [Copy button] [Masked key field] */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyKey}
                className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors flex-shrink-0 min-w-[100px]"
              >
                {copiedKey ? '✓ Copied' : 'Copy key'}
              </button>

              <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-white/60 font-mono text-sm">••••••••••••••••••••</span>
              </div>
            </div>
          </div>

          {/* 7) Primary CTA button */}
          <div className="mb-8">
            <Link
              to="/create"
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-5 px-8 rounded-full purple-glow hover:from-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-2xl transition-all duration-300 text-center text-xl transform"
            >
              Create a new Sten
            </Link>
          </div>

          {/* 8) Minimal footer */}
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
