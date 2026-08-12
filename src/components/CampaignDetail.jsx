import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { useParams } from 'react-router-dom';
import { formatEther, parseEther } from 'ethers';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

export default function CampaignDetail() {
  const { id } = useParams();
  const { contract, account } = useContext(Web3Context);
  
  // On-chain state
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  
  // Off-chain state
  const [meta, setMeta] = useState(null);

  const [donateAmount, setDonateAmount] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const fetchCampaignData = async () => {
    if (!contract) return;
    try {
      // 1. On-chain truth
      const camp = await contract.getCampaign(id);
      setCampaign(camp);
      const history = await contract.getDonationHistory(id);
      setDonations(history);

      // 2. Off-chain meta
      const { data, error } = await supabase
        .from('campaigns_meta')
        .select('*')
        .eq('campaign_id', id)
        .single();
        
      if (!error && data) {
        setMeta(data);
      }
    } catch (err) {
      console.error("Error fetching campaign detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();

    // Listen for live events
    if (contract) {
      const onDonation = (campaignId) => {
        if (campaignId.toString() === id) {
          fetchCampaignData(); // Refresh data
        }
      };
      contract.on("DonationMade", onDonation);
      return () => {
        contract.off("DonationMade", onDonation);
      };
    }
  }, [contract, id]);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!contract || !donateAmount) return;
    try {
      const value = parseEther(donateAmount);
      const txPromise = contract.donate(id, isAnonymous, { value }).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Processing donation...',
        success: 'Donation successful! Thank you.',
        error: 'Donation failed.',
      });

      await txPromise;
      setDonateAmount("");
      // Event listener will trigger refresh
    } catch (err) {
      console.error("Donation failed:", err);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!contract) return;
    try {
      const txPromise = contract.requestWithdrawal(id).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Requesting withdrawal...',
        success: 'Withdrawal requested!',
        error: 'Request failed.',
      });
      
      await txPromise;
      fetchCampaignData();
    } catch (err) {
      console.error("Request withdrawal failed:", err);
    }
  };

  const handleWithdrawFunds = async () => {
    if (!contract) return;
    try {
      const txPromise = contract.withdrawFunds(id).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Withdrawing funds...',
        success: 'Funds withdrawn successfully!',
        error: 'Withdrawal failed.',
      });

      await txPromise;
      fetchCampaignData();
    } catch (err) {
      console.error("Withdraw funds failed:", err);
    }
  };

  const handleCancelCampaign = async () => {
    if (!contract) return;
    setIsCancelModalOpen(false); // Close modal
    try {
      const txPromise = contract.cancelCampaign(id).then(tx => tx.wait());
      toast.promise(txPromise, {
        loading: 'Cancelling campaign...',
        success: 'Campaign cancelled successfully!',
        error: 'Cancellation failed.',
      });
      await txPromise;
      fetchCampaignData();
    } catch (err) {
      console.error("Cancel campaign failed:", err);
    }
  };

  if (!contract || loading) return <div className="text-center py-10">Loading...</div>;
  if (!campaign || campaign.id.toString() === "0") return <div className="text-center py-10">Campaign not found.</div>;

  const isOwner = account && campaign.owner.toLowerCase() === account.toLowerCase();
  const raised = parseFloat(formatEther(campaign.raisedAmount));
  const target = parseFloat(formatEther(campaign.targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Meta Image Header */}
      {meta?.image_url && (
        <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden border-4 border-[var(--nb-black)]">
          <img src={meta.image_url} alt={campaign.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Campaign Info */}
      <div className="neo-card p-8">
        <h1 className="text-4xl font-black text-[var(--nb-black)] mb-2 uppercase tracking-tight">{campaign.name}</h1>
        
        {meta?.org_name && (
          <p className="text-sm text-[var(--nb-blue)] uppercase font-bold mb-4">
            By {meta.org_name} {meta.org_verified && "✓ (Verified)"}
          </p>
        )}

        <div className="w-full bg-[#D1D5DB] border-4 border-[var(--nb-black)] rounded-full h-6 mb-2 overflow-hidden">
          <div className="h-full" style={{ width: `${progress}%`, backgroundColor: 'var(--nb-green)', borderRight: progress > 0 ? '4px solid var(--nb-black)' : 'none' }}></div>
        </div>
        <div className="flex justify-between text-sm text-[var(--nb-black)] font-bold mb-6">
          <span>{raised} ETH raised of {target} ETH</span>
          <span>{progress.toFixed(1)}%</span>
        </div>

        {meta?.full_description && (
          <div className="prose max-w-none text-[var(--nb-black)] mb-8 border-t-4 border-b-4 border-[var(--nb-black)] py-6 text-lg font-medium">
            {meta.full_description.split('\n').map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        )}

        {/* Owner Controls */}
        {isOwner && (
          <div className="bg-[#D1D5DB] p-6 rounded-xl border-4 border-[var(--nb-black)] mb-6 space-y-4">
            <h3 className="font-black text-xl uppercase">Owner Controls</h3>
            <p className="text-sm font-bold text-[var(--nb-black)]">
              Withdrawal Approved by Admin: {campaign.withdrawalApproved ? "Yes" : "No"}
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={handleRequestWithdrawal}
                disabled={campaign.fundsWithdrawn || campaign.withdrawalApproved || campaign.isCancelled}
                className="px-4 py-2 neo-button disabled:opacity-50 text-sm"
              >
                Request Withdrawal
              </button>
              <button 
                onClick={handleWithdrawFunds}
                disabled={!campaign.withdrawalApproved || campaign.fundsWithdrawn || campaign.isCancelled}
                className="px-4 py-2 neo-button neo-button-green disabled:opacity-50 text-sm"
              >
                Withdraw Funds
              </button>
              {!campaign.isCancelled && !campaign.fundsWithdrawn && (
                <button 
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2 neo-button neo-button-red disabled:opacity-50 text-sm"
                >
                  Cancel Campaign
                </button>
              )}
            </div>
            {campaign.fundsWithdrawn && <p className="text-[var(--nb-green)] font-black text-lg">Funds have been withdrawn.</p>}
          </div>
        )}

        {/* Donate Form or Cancelled Message */}
        {campaign.isCancelled ? (
          <div className="bg-[var(--nb-red)] p-6 rounded-xl border-4 border-[var(--nb-black)] mt-6">
            <h3 className="font-black text-2xl text-white text-center uppercase">This campaign has been cancelled.</h3>
            <p className="text-lg font-bold text-white text-center mt-2">Donors can claim their refunds in the "My Donations" tab.</p>
          </div>
        ) : (
          <form onSubmit={handleDonate} className="space-y-4 border-t-4 border-[var(--nb-black)] pt-6 mt-6">
            <h3 className="text-2xl font-black uppercase">Make a Donation</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="number"
                step="0.001"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                placeholder="Amount in ETH"
                className="flex-1 neo-input p-3"
                required
              />
              <label className="flex items-center space-x-2 whitespace-nowrap font-bold cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded w-5 h-5 border-2 border-[var(--nb-black)] text-[var(--nb-blue)]"
                />
                <span>Donate Anonymously</span>
              </label>
              <button type="submit" className="px-8 py-3 neo-button neo-button-blue whitespace-nowrap text-lg">
                Donate
              </button>
            </div>
            <p className="text-sm font-bold text-[var(--nb-black)] opacity-80">Note: Anonymous means hidden in UI. Address remains on-chain.</p>
          </form>
        )}
      </div>

      {/* Donation History Table */}
      <div className="neo-card p-8">
        <h3 className="text-3xl font-black mb-6 text-[var(--nb-black)] uppercase tracking-tight">Donation History (On-chain)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-sm font-black text-[var(--nb-black)] uppercase tracking-wider border-b-4 border-[var(--nb-black)]">Donor</th>
                <th className="px-6 py-4 text-left text-sm font-black text-[var(--nb-black)] uppercase tracking-wider border-b-4 border-[var(--nb-black)]">Amount (ETH)</th>
                <th className="px-6 py-4 text-left text-sm font-black text-[var(--nb-black)] uppercase tracking-wider border-b-4 border-[var(--nb-black)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-[var(--nb-black)]">
              {donations.map((d, idx) => (
                <tr key={idx} className="hover:bg-[#F3F4F6] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--nb-black)] font-bold text-lg">
                    {d.isAnonymous ? "Anonymous" : d.donor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-black text-lg text-[var(--nb-green)]">
                    {formatEther(d.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--nb-black)] font-bold">
                    {new Date(Number(d.timestamp) * 1000).toLocaleString()}
                  </td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-6 text-center text-[var(--nb-black)] font-bold text-lg">No donations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
          <div className="neo-card p-8 max-w-md w-full relative">
            <h2 className="text-3xl font-black mb-4 text-[var(--nb-red)] uppercase tracking-tight">Are you sure?</h2>
            <p className="text-lg font-bold text-[var(--nb-black)] mb-8">
              Do you really want to cancel this campaign? Donors will be able to claim refunds. This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={handleCancelCampaign}
                className="flex-1 neo-button neo-button-red py-3 text-lg"
              >
                Yes, Cancel It
              </button>
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 neo-button py-3 text-lg bg-[#D1D5DB]"
              >
                No, Keep It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
