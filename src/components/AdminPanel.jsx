import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { formatEther } from 'ethers';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const { contract, account } = useContext(Web3Context);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const checkAdminAndFetchRequests = async () => {
    if (!contract || !account) return;
    try {
      const adminAddress = await contract.admin();
      if (adminAddress.toLowerCase() === account.toLowerCase()) {
        setIsAdmin(true);
        const allCampaigns = await contract.getAllCampaigns();
        
        // Filter campaigns that have requested withdrawal but not yet approved
        const pending = [];
        for (let i = 0; i < allCampaigns.length; i++) {
          const camp = allCampaigns[i];
          const hasRequested = await contract.withdrawalRequested(camp.id);
          if (hasRequested && !camp.withdrawalApproved && !camp.fundsWithdrawn) {
            pending.push(camp);
          }
        }
        setPendingRequests(pending);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Admin check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAndFetchRequests();
    
    if (contract && isAdmin) {
      const onWithdrawalRequested = () => checkAdminAndFetchRequests();
      contract.on("WithdrawalRequested", onWithdrawalRequested);
      return () => {
        contract.off("WithdrawalRequested", onWithdrawalRequested);
      };
    }
  }, [contract, account, isAdmin]);

  const handleApprove = async (campaignId) => {
    if (!contract) return;
    try {
      const txPromise = contract.approveWithdrawal(campaignId).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Approving withdrawal...',
        success: 'Withdrawal approved successfully!',
        error: 'Approval failed.',
      });

      await txPromise;
      checkAdminAndFetchRequests(); // Refresh
    } catch (err) {
      console.error("Approval failed:", err);
    }
  };

  if (loading) return <div className="text-center py-10">Checking permissions...</div>;

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto neo-card bg-[var(--nb-red)] p-8 text-center">
        <h2 className="text-3xl font-black text-white uppercase">Access Denied</h2>
        <p className="text-white font-bold text-lg mt-4">Only the contract administrator can view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Admin Panel</h1>
        <p className="text-white opacity-80 text-base font-medium">Review and approve pending withdrawal requests from campaign owners.</p>
      </div>
      
      {pendingRequests.length === 0 ? (
        <p className="text-[var(--nb-black)] bg-[#D1D5DB] p-6 rounded-xl border-4 border-[var(--nb-black)] font-bold text-lg">
          No pending withdrawal requests.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingRequests.map(camp => (
            <div key={camp.id.toString()} className="neo-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-2xl font-black text-[var(--nb-black)] mb-1">{camp.name}</h3>
                <p className="text-sm text-[var(--nb-black)] font-bold">Owner: {camp.owner}</p>
                <p className="text-sm text-[var(--nb-black)] font-bold">Raised: {formatEther(camp.raisedAmount)} ETH</p>
              </div>
              <button
                onClick={() => handleApprove(camp.id)}
                className="px-6 py-3 neo-button neo-button-green whitespace-nowrap"
              >
                Approve Withdrawal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
