import { useContext } from 'react';
import { Web3Context } from '../App';
import { Wallet } from 'lucide-react';

export default function WalletConnect() {
  const { account, connectWallet } = useContext(Web3Context);

  if (account) {
    return (
      <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-sm font-medium text-blue-800">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </button>
  );
}
