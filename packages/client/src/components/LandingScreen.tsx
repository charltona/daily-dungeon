import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Sword, Sparkles, LogIn, Loader2 } from 'lucide-react';

interface User {
  id: string;
  displayName: string;
  isGuest: boolean;
  email?: string;
}

interface LandingScreenProps {
  onLoginSuccess: (token: string, user: User, character?: any) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      
      if (!res.ok) throw new Error('Failed to authenticate with Google');
      
      const data = await res.json();
      onLoginSuccess(data.token, data.user, data.character);
    } catch (err) {
      console.error(err);
      setErrorMsg('Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to create guest session');
      
      const data = await res.json();
      onLoginSuccess(data.token, data.user, data.character);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to join as guest. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon-darkest text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dungeon-card border border-dungeon-border rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 shadow-inner shadow-amber-500/20">
            <Sword className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-amber-400 tracking-tighter mb-2">
            CARPE DELVE
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Seize the day. Survive the crypt.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/50 border border-red-900 text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex justify-center">
            {isLoading ? (
              <div className="flex items-center justify-center py-2 h-10 w-full rounded border border-slate-700 bg-slate-800 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErrorMsg('Google Login was cancelled or failed.')}
                useOneTap
                theme="filled_black"
                shape="rectangular"
                text="continue_with"
                size="large"
                width="100%"
              />
            )}
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-sm tracking-wide border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
            Quick Join as Guest
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-500">
            Guests can upgrade to a permanent account later to save progression.
          </p>
        </div>

      </div>
    </div>
  );
};
