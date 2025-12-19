import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';

// Prize types
interface Prize {
  id: string;
  type: 'cash' | 'crypto' | 'coupon';
  title: string;
  description: string;
  amount: string;
  currency: string;
  claimed: boolean;
  claimCode: string;
  icon: string;
}

// Mock prize data
const mockPrizes: Prize[] = [
  {
    id: '1',
    type: 'cash',
    title: 'You won $25 CASH!',
    description: 'Amazing job! Your STEN-solving skills just earned you real money.',
    amount: '$25.00',
    currency: 'USD',
    claimed: false,
    claimCode: '',
    icon: '💰'
  },
  {
    id: '2',
    type: 'crypto',
    title: 'Bitcoin Bonus Claimed!',
    description: 'Your crypto wallet just got a little heavier. Time to HODL!',
    amount: '0.001',
    currency: 'BTC',
    claimed: true,
    claimCode: 'STEN-BTC-2K9L',
    icon: '₿'
  },
  {
    id: '3',
    type: 'coupon',
    title: '50% OFF Everything!',
    description: 'Treat yourself! Use this exclusive discount on your next purchase.',
    amount: '50%',
    currency: 'OFF',
    claimed: false,
    claimCode: '',
    icon: '🎫'
  },
  {
    id: '4',
    type: 'cash',
    title: 'Weekly Winner - $100!',
    description: 'You\'re the champion! This week\'s prize pool is all yours.',
    amount: '$100.00',
    currency: 'USD',
    claimed: false,
    claimCode: '',
    icon: '🏆'
  },
  {
    id: '5',
    type: 'crypto',
    title: 'ETH Reward Secured!',
    description: 'Your DeFi journey continues. More ETH in your wallet!',
    amount: '0.05',
    currency: 'ETH',
    claimed: true,
    claimCode: 'STEN-ETH-7M3P',
    icon: '⟠'
  }
];

const PrizeMessage: React.FC<{ prize: Prize; onClaim: (id: string) => void }> = ({ prize, onClaim }) => {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const partiallyRevealCode = (code: string) => {
    if (code.length <= 8) return code;
    const start = code.slice(0, 4);
    const end = code.slice(-4);
    const dots = '••••';
    return start + dots + end;
  };

  const handleCopyCode = async () => {
    if (!prize.claimed || !prize.claimCode) return;

    try {
      await navigator.clipboard.writeText(prize.claimCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div
      className={`bg-gradient-to-br from-green-900 to-emerald-900 border border-emerald-700/30 rounded-[20px] p-4 mb-4 purple-glow transition-all duration-300 relative ${
        prize.claimed ? 'opacity-75' : 'hover:scale-[1.02] hover:shadow-2xl ring-1 ring-emerald-400/20'
      }`}
    >
      {/* Prize Badge - Bottom Right */}
      <div className="absolute bottom-3 right-3 bg-emerald-500 rounded-full px-2 py-1">
        <span className="text-white text-xs font-medium">Prize</span>
      </div>

      {/* 1. Emoji + Bold Title */}
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-3xl">{prize.icon}</span>
        <h3 className="text-white font-bold text-lg leading-tight">{prize.title}</h3>
      </div>

      {/* 2. Short Congratulation Text */}
      <p className="text-white/80 text-sm mb-4 leading-relaxed">{prize.description}</p>

      {/* 3. Claim Code Box */}
      <div className="mb-4">
        {prize.claimed ? (
          <div className="bg-black/40 border border-white/20 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-black/50" onClick={handleCopyCode}>
            <div className="text-white/60 text-xs mb-1">Claim Code</div>
            <div className="font-mono text-white font-bold text-sm bg-white/10 rounded px-2 py-1 relative">
              {copyFeedback ? (
                <span className="text-green-400">Copied!</span>
              ) : (
                partiallyRevealCode(prize.claimCode)
              )}
            </div>
            <div className="text-white/50 text-xs mt-1 text-center">Tap code to copy</div>
          </div>
        ) : (
          <div className="bg-black/20 border border-dashed border-white/30 rounded-lg p-3">
            <div className="text-white/50 text-xs mb-1">Claim Code</div>
            <div className="font-mono text-white/40 text-sm">•••••••••••</div>
          </div>
        )}
      </div>

      {/* Claim Button */}
      <div className="flex justify-center">
        {!prize.claimed ? (
          <button
            onClick={() => onClaim(prize.id)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-6 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
          >
            Claim Prize
          </button>
        ) : (
          <div className="flex items-center space-x-2 text-green-400 font-semibold">
            <span className="text-lg">✓</span>
            <span>Claimed</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Inbox: React.FC = () => {
  const [prizes, setPrizes] = useState<Prize[]>(mockPrizes);
  const { setUnclaimedPrizes } = useNotifications();

  const generateClaimCode = (type: string) => {
    const prefix = type === 'cash' ? 'STEN-CASH-' :
                   type === 'crypto' ? 'STEN-CRYPTO-' : 'STEN-COUPON-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + code;
  };

  const handleClaim = (id: string) => {
    setPrizes(prev => prev.map(prize =>
      prize.id === id ? {
        ...prize,
        claimed: true,
        claimCode: generateClaimCode(prize.type)
      } : prize
    ));
  };

  const totalPrizes = prizes.length;
  const claimedPrizes = prizes.filter(p => p.claimed).length;
  const unclaimedPrizes = totalPrizes - claimedPrizes;

  // Update global notification state
  useEffect(() => {
    setUnclaimedPrizes(unclaimedPrizes);
  }, [unclaimedPrizes, setUnclaimedPrizes]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#111111] px-6 py-8">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Inbox</h1>
              <p className="text-white/60">Your prize notifications</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{unclaimedPrizes}</div>
              <div className="text-white/50 text-sm">unclaimed</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-white">{totalPrizes}</div>
              <div className="text-white/50 text-sm">Total</div>
            </div>
            <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-green-400">{claimedPrizes}</div>
              <div className="text-white/50 text-sm">Claimed</div>
            </div>
            <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-purple-400">{unclaimedPrizes}</div>
              <div className="text-white/50 text-sm">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prize List */}
      <div className="flex-1 px-6 pb-8">
        <div className="max-w-[480px] mx-auto">
          {prizes.length > 0 ? (
            <div>
              {prizes.map((prize) => (
                <PrizeMessage key={prize.id} prize={prize} onClaim={handleClaim} />
              ))}
            </div>
          ) : (
            <div className="bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 purple-glow text-center">
              <div className="text-6xl mb-6">📬</div>
              <h2 className="text-xl font-semibold text-white mb-4">No prizes yet</h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Start solving STENs to earn cash, crypto, and exclusive coupons.
              </p>
              <Link
                to="/create"
                className="inline-block bg-white text-black font-medium py-3 px-8 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                Create Your First STEN
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
