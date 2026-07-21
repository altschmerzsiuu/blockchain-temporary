import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { formatEther } from 'ethers';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MyDonations() {
  const { contract, account } = useContext(Web3Context);
  const [myDonations, setMyDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyDonations = async () => {
    if (!contract || !account) return;
    try {
      const allCampaigns = await contract.getAllCampaigns();
      let userDonations = [];

      for (let i = 0; i < allCampaigns.length; i++) {
        const camp = allCampaigns[i];
        const history = await contract.getDonationHistory(camp.id);
        
        let totalDonatedToCamp = 0n;
        for (let j = 0; j < history.length; j++) {
          if (history[j].donor.toLowerCase() === account.toLowerCase()) {
            totalDonatedToCamp += history[j].amount;
          }
        }

        if (totalDonatedToCamp > 0n) {
          userDonations.push({
            campaign: camp,
            amount: totalDonatedToCamp,
            canRefund: Number(camp.deadline) * 1000 < Date.now() && 
                       camp.raisedAmount < camp.targetAmount &&
                       !camp.fundsWithdrawn
          });
        }
      }
      setMyDonations(userDonations);
    } catch (err) {
      console.error("Error fetching my donations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, [contract, account]);

  const handleRefund = async (campaignId) => {
    if (!contract) return;
    try {
      const txPromise = contract.refund(campaignId).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Processing refund...',
        success: 'Refund successful!',
        error: 'Refund failed.',
      });

      await txPromise;
      fetchMyDonations(); // Refresh
    } catch (err) {
      console.error("Refund failed:", err);
    }
  };

  if (!account) return <div className="text-center py-10">Please connect your wallet.</div>;
  if (loading) return <div className="text-center py-10">Loading your donations...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Donations</h1>
      
      {myDonations.length === 0 ? (
        <p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          You haven't made any donations yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myDonations.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-2">{item.campaign.name}</h3>
              <p className="text-sm text-gray-600 mb-4">
                You donated: <span className="font-bold">{formatEther(item.amount)} ETH</span>
              </p>
              
              <div className="flex space-x-4">
                <Link 
                  to={`/campaign/${item.campaign.id.toString()}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                >
                  View Campaign
                </Link>
                
                {item.canRefund && (
                  <button
                    onClick={() => handleRefund(item.campaign.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Claim Refund
                  </button>
                )}
              </div>
              {item.canRefund && (
                <p className="mt-2 text-xs text-red-600">Campaign failed its goal. You can claim a refund.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
