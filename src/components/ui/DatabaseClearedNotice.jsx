// Shows a dismissible notice explaining why user was logged out and setup is required again.

import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';

export function DatabaseClearedNotice() {
  const [visible, setVisible] = useState(true);
  
  if (!visible) return null;
  
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#1E1E1E] rounded-xl px-5 py-4 flex items-start gap-3 max-w-md w-full mx-4 animate-slide-up">
      <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-[13px] font-medium text-[#F0F0F0] mb-1">
          Vault data was reset
        </p>
        <p className="text-[12px] text-[#888888] leading-relaxed">
          Your vault data was cleared because it could not be read correctly. This happens after app updates. Please set up your vault again.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-[#666666] hover:text-[#F0F0F0] cursor-pointer transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default DatabaseClearedNotice;
