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
      <div className="max-w-2xl mx-auto bg-red-50 p-8 rounded-lg text-center border border-red-200">
        <h2 className="text-xl font-bold text-red-700">Access Denied</h2>
        <p className="text-red-600 mt-2">Only the contract administrator can view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel - Pending Withdrawals</h1>
      
      {pendingRequests.length === 0 ? (
        <p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          No pending withdrawal requests.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingRequests.map(camp => (
            <div key={camp.id.toString()} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{camp.name}</h3>
                <p className="text-sm text-gray-500">Owner: {camp.owner}</p>
                <p className="text-sm text-gray-500">Raised: {formatEther(camp.raisedAmount)} ETH</p>
              </div>
              <button
                onClick={() => handleApprove(camp.id)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
