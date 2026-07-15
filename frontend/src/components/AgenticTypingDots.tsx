import React from 'react';

// Shared loading indicator for the Agentic AI section - previously duplicated identically
// (as .rc-typing / .sttb-typing) in RecoveryClock.tsx and SmallThingsThatHold.tsx.
export const AgenticTypingDots: React.FC = () => (
  <span className="agentic-typing-dots" aria-label="thinking">
    <span />
    <span />
    <span />
    <style>{`
      .agentic-typing-dots { display: inline-flex; gap: 4px; align-items: center; height: 24px; }
      .agentic-typing-dots span {
        width: 6px; height: 6px; border-radius: 50%;
        background-color: rgba(234, 246, 255, 0.55);
        animation: agentic-typing-bounce 1.2s infinite ease-in-out;
      }
      .agentic-typing-dots span:nth-child(2) { animation-delay: 0.15s; }
      .agentic-typing-dots span:nth-child(3) { animation-delay: 0.3s; }
      @keyframes agentic-typing-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-4px); opacity: 1; }
      }
    `}</style>
  </span>
);
