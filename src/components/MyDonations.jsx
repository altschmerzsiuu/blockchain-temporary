import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { formatEther } from 'ethers';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MyDonations() {
  const { contract, account, globalCampaigns, globalDataLoading, refreshGlobalData } = useContext(Web3Context);
  const [myDonations, setMyDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyDonations = async () => {
    if (!contract || !account || globalDataLoading) return;
    try {
      setLoading(true);
      
      // Fetch donation histories concurrently for all campaigns
      const histories = await Promise.all(
        globalCampaigns.map(camp => contract.getDonationHistory(camp.id))
      );

      let userDonations = [];

      for (let i = 0; i < globalCampaigns.length; i++) {
        const camp = globalCampaigns[i];
        const history = histories[i];
        
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
            canRefund: !camp.fundsWithdrawn
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
  }, [contract, account, globalCampaigns, globalDataLoading]);

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
      fetchMyDonations(); // Refresh locally
      refreshGlobalData(); // Refresh global to update campaign raised amounts etc
    } catch (err) {
      console.error("Refund failed:", err);
    }
  };

  if (!account) return <div className="text-center py-10">Please connect your wallet.</div>;
  if (loading) return <div className="text-center py-10">Loading your donations...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">My Donations</h1>
        <p className="text-white opacity-80 text-base font-medium">View all your past contributions and track refunds for cancelled campaigns.</p>
      </div>
      
      {myDonations.length === 0 ? (
        <p className="text-[var(--nb-black)] bg-[#D1D5DB] p-6 rounded-xl border-4 border-[var(--nb-black)] font-bold text-lg">
          You haven't made any donations yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myDonations.map((item, idx) => {
            const camp = item.campaign;
            const raised = parseFloat(formatEther(camp.raisedAmount));
            const target = parseFloat(formatEther(camp.targetAmount));
            const isFailed = (Date.now() / 1000) >= Number(camp.deadline) && raised < target;
            const isWithdrawn = camp.fundsWithdrawn;
            
            return (
            <div key={idx} className="neo-card p-6 flex flex-col relative">
              <div className="absolute top-6 right-6 flex flex-col gap-2 items-end z-10">
                {camp.isCancelled && <span className="neo-badge red px-2 py-1 text-xs">Cancelled</span>}
                {isWithdrawn && <span className="neo-badge green px-2 py-1 text-xs">Successfully Withdrawn</span>}
                {isFailed && !camp.isCancelled && <span className="neo-badge red px-2 py-1 text-xs">Unsuccessful</span>}
              </div>
              <h3 className="text-2xl font-black text-[var(--nb-black)] mb-2 pr-24">{camp.name}</h3>
              <p className="text-sm text-[var(--nb-black)] font-bold mb-6">
                You donated: <span className="font-black text-[var(--nb-blue)] text-lg">{formatEther(item.amount)} ETH</span>
              </p>
              
              <div className="flex space-x-4">
                <Link 
                  to={`/campaign/${item.campaign.id.toString()}`}
                  className="px-4 py-2 neo-button bg-white text-sm"
                >
                  View Campaign
                </Link>
                
                {item.canRefund && (
                  <button
                    onClick={() => handleRefund(item.campaign.id)}
                    className="px-4 py-2 neo-button neo-button-red text-sm"
                  >
                    Claim Refund
                  </button>
                )}
              </div>
              {item.canRefund && (
                <p className="mt-4 text-sm font-black text-[var(--nb-red)]">
                  Funds haven't been withdrawn. You can claim a refund at any time.
                </p>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
