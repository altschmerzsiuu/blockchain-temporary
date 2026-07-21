import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract-config';
import { Toaster, toast } from 'react-hot-toast';

import WalletConnect from './components/WalletConnect';
import CampaignList from './components/CampaignList';
import CampaignDetail from './components/CampaignDetail';
import CreateCampaign from './components/CreateCampaign';
import AdminPanel from './components/AdminPanel';
import MyDonations from './components/MyDonations';

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
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Toaster position="bottom-right" />
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <Link to="/" className="flex-shrink-0 flex items-center font-bold text-xl text-blue-600">
                    CharityTracker
                  </Link>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    <Link to="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                      Campaigns
                    </Link>
                    <Link to="/create" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                      Create Campaign
                    </Link>
                    <Link to="/my-donations" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                      My Donations
                    </Link>
                    <Link to="/admin" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                      Admin Panel
                    </Link>
                  </div>
                </div>
                <div className="flex items-center">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </nav>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<CampaignList />} />
              <Route path="/campaign/:id" element={<CampaignDetail />} />
              <Route path="/create" element={<CreateCampaign />} />
              <Route path="/my-donations" element={<MyDonations />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Context.Provider>
  );
}

export default App;
