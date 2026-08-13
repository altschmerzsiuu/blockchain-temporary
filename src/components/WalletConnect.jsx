import { useContext, useState, useRef, useEffect } from 'react';
import { Web3Context } from '../App';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';

export default function WalletConnect() {
  const { account, connectWallet, disconnectWallet, isConnecting, isAdmin } = useContext(Web3Context);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (account) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="neo-badge px-4 py-2 flex items-center space-x-2 cursor-pointer hover:bg-[#FACC15] transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-[var(--nb-green)] border border-[var(--nb-black)]"></div>
          <span className="text-sm font-bold text-[var(--nb-black)]">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <ChevronDown className="w-4 h-4 ml-1 text-[var(--nb-black)]" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border-4 border-[var(--nb-black)] rounded-xl shadow-[4px_4px_0px_0px_#000000] overflow-hidden z-50 flex flex-col">
            <div className="px-4 py-3 border-b-4 border-[var(--nb-black)] flex justify-center bg-[#F3F4F6]">
              {isAdmin ? (
                <span className="neo-badge red px-2 py-1 text-xs w-full text-center">ADMIN MODE</span>
              ) : (
                <span className="neo-badge px-2 py-1 text-xs text-white w-full text-center" style={{ backgroundColor: 'var(--nb-blue)' }}>USER MODE</span>
              )}
            </div>
            <button
              onClick={() => {
                disconnectWallet();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left font-bold text-[var(--nb-black)] hover:bg-[var(--nb-red)] hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isConnecting) {
    return (
      <button disabled className="neo-button px-4 py-2 flex items-center text-sm opacity-80 cursor-wait">
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--nb-black)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Connecting...
      </button>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="neo-button px-4 py-2 flex items-center text-sm cursor-pointer"
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </button>
  );
}
