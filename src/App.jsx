import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract-config';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';

import WalletConnect from './components/WalletConnect';
import CampaignList from './components/CampaignList';
import CampaignDetail from './components/CampaignDetail';
import AdminPanel from './components/AdminPanel';
import MyDonations from './components/MyDonations';
import CancelledCampaigns from './components/CancelledCampaigns';
import MyCampaigns from './components/MyCampaigns';

export const Web3Context = createContext();

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [adminAddress, setAdminAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Global Data State
  const [globalCampaigns, setGlobalCampaigns] = useState([]);
  const [globalMetaData, setGlobalMetaData] = useState({});
  const [globalDataLoading, setGlobalDataLoading] = useState(true);

  const fetchGlobalData = async (contractInstance) => {
    if (!contractInstance) return;
    try {
      setGlobalDataLoading(true);
      // 1. Fetch on-chain truth
      const allCampaigns = await contractInstance.getAllCampaigns();
      setGlobalCampaigns(allCampaigns);

      // 2. Fetch off-chain meta data from Supabase
      const { data, error } = await supabase
        .from('campaigns_meta')
        .select('*');
      
      if (!error && data) {
        const metaMap = {};
        data.forEach(item => {
          metaMap[item.campaign_id] = item;
        });
        setGlobalMetaData(metaMap);
      }
    } catch (err) {
      console.error("Error fetching global campaigns:", err);
    } finally {
      setGlobalDataLoading(false);
    }
  };

  const checkIfWalletIsConnected = async () => {
    // If the user explicitly disconnected, do not auto-connect
    if (localStorage.getItem('walletDisconnected') === 'true') {
      return;
    }

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
    const fetchAdmin = async (instance) => {
      try {
        const admin = await instance.getAdmin();
        setAdminAddress(admin);
      } catch (err) {
        console.error("Failed to fetch admin:", err);
      }
    };

    if (provider) {
      try {
        const contractInstance = new Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer || provider
        );
        setContract(contractInstance);
        fetchAdmin(contractInstance);
        fetchGlobalData(contractInstance);
      } catch (err) {
        console.error("Failed to initialize contract:", err);
      }
    }
  }, [provider, signer]);

  // Expose manual refresh function
  const refreshGlobalData = () => {
    fetchGlobalData(contract);
  };

  const isAdmin = account && adminAddress && account.toLowerCase() === adminAddress.toLowerCase();

  const connectWallet = async () => {
    if (window.ethereum) {
      setIsConnecting(true);
      const toastId = toast.loading("Connecting to MetaMask...");
      
      try {
        // Clear the disconnected flag since they are explicitly connecting
        localStorage.removeItem('walletDisconnected');
        // Force MetaMask to open the account selection prompt
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }]
        });

        // Switch to Sepolia automatically
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
          });
        } catch (switchError) {
          console.error("Failed to switch to Sepolia:", switchError);
        }

        const _provider = new BrowserProvider(window.ethereum);
        await _provider.send("eth_requestAccounts", []);
        
        // Artificial delay so the UI feels like a real process
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const _signer = await _provider.getSigner();
        const _account = await _signer.getAddress();
        
        setProvider(_provider);
        setSigner(_signer);
        setAccount(_account);
        toast.success("Wallet connected successfully!", { id: toastId });
      } catch (error) {
        console.error("Wallet connection failed:", error);
        toast.error("Connection cancelled or failed.", { id: toastId });
      } finally {
        setIsConnecting(false);
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  const disconnectWallet = () => {
    const toastId = toast.loading("Disconnecting wallet...");
    
    // Artificial delay to make it feel like a process
    setTimeout(() => {
      setAccount("");
      setSigner(null);
      setProvider(null);
      setContract(null);
      // Remember that the user disconnected explicitly
      localStorage.setItem('walletDisconnected', 'true');
      toast.success("Wallet disconnected!", { id: toastId });
    }, 600);
  };

  return (
    <Web3Context.Provider value={{ 
        provider, 
        signer, 
        account, 
        contract, 
        connectWallet, 
        disconnectWallet,
        isConnecting, 
        isAdmin,
        globalCampaigns,
        globalMetaData,
        globalDataLoading,
        refreshGlobalData
      }}>
      <Router>
        {/* If no account is connected, show a dedicated full-screen Login Page */}
        {!account ? (
          <div className="min-h-screen bg-[var(--nb-mustard)] flex flex-col items-center justify-center p-4">
            <Toaster position="bottom-right" toastOptions={{ className: 'neo-card', style: { borderRadius: '12px', border: '4px solid #000000', background: '#fff', color: '#000000', boxShadow: '4px 4px 0px 0px #EAB308' } }} />
            <div className="neo-card bg-white p-10 md:p-16 max-w-lg w-full text-center space-y-8 shadow-[12px_12px_0_0_#000] mx-4">
              <h1 className="text-6xl md:text-7xl font-black text-[var(--nb-black)] uppercase tracking-tighter leading-none">
                <span className="block">Charity</span>
                <span className="block text-[var(--nb-blue)]">Tracker</span>
              </h1>
              <p className="text-xl md:text-2xl font-bold text-[var(--nb-black)] opacity-80 leading-relaxed">
                A transparent, on-chain charity platform.
                <br/> Connect your MetaMask wallet to get started.
              </p>
              
              <div className="pt-8">
                <button 
                  onClick={connectWallet} 
                  disabled={isConnecting} 
                  className="w-full neo-button neo-button-blue text-2xl px-12 py-6 uppercase tracking-wider"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet to Enter"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-screen flex flex-col">
            <Toaster position="bottom-right" toastOptions={{ className: 'neo-card', style: { borderRadius: '12px', border: '4px solid #000000', background: '#fff', color: '#000000', boxShadow: '4px 4px 0px 0px #EAB308' } }} />
            
            {/* Navbar for Authenticated Users */}
            <nav className="neo-nav sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex justify-between items-center h-16 relative">
                  
                  {/* Logo - Left */}
                  <div className="flex-shrink-0 flex items-center z-10">
                    <Link to="/" className="font-black text-2xl" style={{ color: 'var(--nb-mustard)' }}>
                      CharityTracker
                    </Link>
                  </div>
                  
                  {/* Center Menu */}
                  <div className="hidden sm:flex absolute inset-0 justify-center items-center pointer-events-none">
                    <div className="pointer-events-auto flex space-x-6 md:space-x-8 items-center">
                      {isAdmin ? (
                        <>
                          <Link to="/" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            Active Campaigns
                          </Link>
                          <Link to="/past" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            Past Campaigns
                          </Link>
                          <Link to="/admin" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            Admin Panel
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to="/" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            Other Campaigns
                          </Link>
                          <Link to="/my-campaigns" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            My Campaigns
                          </Link>
                          <Link to="/my-donations" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            My Donations
                          </Link>
                          <Link to="/past" className="text-white inline-flex items-center px-1 pt-1 border-b-4 border-transparent hover:border-[var(--nb-mustard)] hover:text-[var(--nb-mustard)] transition-colors text-xs font-bold uppercase">
                            Past Campaigns
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Wallet - Right */}
                  <div className="flex-shrink-0 flex items-center z-10">
                    <WalletConnect />
                  </div>
                  
                </div>
              </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<CampaignList />} />
                <Route path="/my-campaigns" element={<MyCampaigns />} />
                <Route path="/campaign/:id" element={<CampaignDetail />} />
                <Route path="/past" element={<CancelledCampaigns />} />
                {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
                {!isAdmin && <Route path="/my-donations" element={<MyDonations />} />}
                {/* Fallback route */}
                <Route path="*" element={<div className="text-center font-black text-3xl py-20 uppercase">404 - Page Not Found</div>} />
              </Routes>
            </main>
          </div>
        )}
      </Router>
    </Web3Context.Provider>
  );
}

export default App;
