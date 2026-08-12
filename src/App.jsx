import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract-config';
import { Toaster, toast } from 'react-hot-toast';

import WalletConnect from './components/WalletConnect';
import CampaignList from './components/CampaignList';
import CampaignDetail from './components/CampaignDetail';
import AdminPanel from './components/AdminPanel';
import MyDonations from './components/MyDonations';
import CancelledCampaigns from './components/CancelledCampaigns';

export const Web3Context = createContext();

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);

  const checkIfWalletIsConnected = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const _provider = new BrowserProvider(window.ethereum);
          const _signer = await _provider.getSigner();
          const _account = await _signer.getAddress();
          
          setProvider(_provider);
          setSigner(_signer);
          setAccount(_account);
        }
      } catch (error) {
        console.error("Auto connect failed:", error);
      }
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          checkIfWalletIsConnected();
        } else {
          setAccount("");
          setSigner(null);
        }
      });
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  useEffect(() => {
    if (provider) {
      try {
        const contractInstance = new Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer || provider
        );
        setContract(contractInstance);
      } catch (err) {
        console.error("Failed to initialize contract:", err);
      }
    }
  }, [provider, signer]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const _provider = new BrowserProvider(window.ethereum);
        await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        const _account = await _signer.getAddress();
        
        setProvider(_provider);
        setSigner(_signer);
        setAccount(_account);
        toast.success("Wallet connected!");
      } catch (error) {
        console.error("Wallet connection failed:", error);
        toast.error("Failed to connect wallet.");
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  return (
    <Web3Context.Provider value={{ provider, signer, account, contract, connectWallet }}>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Toaster position="bottom-right" toastOptions={{ className: 'neo-card', style: { borderRadius: '12px', border: '4px solid #000000', background: '#fff', color: '#000000', boxShadow: '4px 4px 0px 0px #EAB308' } }} />
          <nav className="neo-nav sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16 relative">
                
                {/* Logo - Left */}
                <div className="flex-shrink-0 flex items-center z-10">
                  <Link to="/" className="font-black text-2xl" style={{ color: 'var(--nb-mustard)' }}>
                    CharityTracker
                  </Link>
                </div>
                
                {/* Center Menu */}
                <div className="hidden sm:flex absolute inset-0 justify-center items-center pointer-events-none">
                  <div className="pointer-events-auto flex space-x-6 md:space-x-8">
                    <Link to="/" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                      Campaigns
                    </Link>
                    <Link to="/my-donations" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                      My Donations
                    </Link>
                    <Link to="/cancelled" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                      Cancelled
                    </Link>
                    <Link to="/admin" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                      Admin Panel
                    </Link>
                  </div>
                </div>
                
                {/* Wallet - Right */}
                <div className="flex-shrink-0 flex items-center z-10">
                  <WalletConnect />
                </div>
                
              </div>
            </div>
          </nav>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<CampaignList />} />
              <Route path="/campaign/:id" element={<CampaignDetail />} />
              <Route path="/my-donations" element={<MyDonations />} />
              <Route path="/cancelled" element={<CancelledCampaigns />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Context.Provider>
  );
}

export default App;
