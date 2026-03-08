"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function GmailConnectButton() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const authStatus = searchParams.get('auth');

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Could not get auth URL");
      }
    } catch (error) {
      console.error("Failed to connect", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (authStatus === 'success') {
      return (
          <div className="flex items-center gap-2 text-sm text-green-500 bg-green-950 border border-green-800 p-2.5 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>Successfully re-authenticated with Google.</span>
          </div>
      );
  }
  
  if (authStatus === 'partial') {
       return (
          <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-950 border border-yellow-800 p-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>Could not get a new refresh token. Please ensure you are logged out and try again.</span>
          </div>
      );
  }

  return (
    <Button onClick={handleConnect} disabled={loading} variant="outline" className="gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white">
      <Zap className="w-4 h-4 text-yellow-400" />
      {loading ? 'Redirecting...' : 'Reconnect Gmail'}
    </Button>
  );
}
