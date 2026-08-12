import { useContext } from 'react';
import { Web3Context } from '../App';
import { Wallet } from 'lucide-react';

export default function WalletConnect() {
  const { account, connectWallet } = useContext(Web3Context);

  if (account) {
    return (
      <div className="neo-badge px-4 py-2 flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-[var(--nb-green)] border border-[var(--nb-black)]"></div>
        <span className="text-sm font-bold text-[var(--nb-black)]">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="neo-button px-4 py-2 flex items-center text-sm"
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </button>
  );
}
