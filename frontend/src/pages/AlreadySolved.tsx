import React from 'react';
import { useParams, Link } from 'react-router-dom';

const AlreadySolved: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-[480px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white">STEN</span>
            <Link
              to="/"
              className="text-white/60 hover:text-white transition-colors"
            >
              INBOX
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-[420px]">
          {/* Main Card with Purple Glow */}
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 purple-glow text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-4">STEN Already Solved</h1>
            <p className="text-white/60 mb-4 leading-relaxed">
              This encrypted message has already been unlocked by someone else.
            </p>
            <p className="text-white/40 text-sm mb-8">
              STEN ID: {id}
            </p>

            <div className="space-y-3">
              <Link
                to="/"
                className="block w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 px-6 rounded-full transition-colors"
              >
                Back to Inbox
              </Link>
              <Link
                to="/create"
                className="block w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-full transition-colors border border-[rgba(255,255,255,0.08)]"
              >
                Create New STEN
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlreadySolved;
