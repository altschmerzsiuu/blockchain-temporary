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
        <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-sm">
          <img src={meta.image_url} alt={campaign.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Campaign Info */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
        
        {meta?.org_name && (
          <p className="text-sm text-blue-600 font-medium mb-4">
            By {meta.org_name} {meta.org_verified && "✓ (Verified)"}
          </p>
        )}

        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mb-6">
          <span>{raised} ETH raised of {target} ETH</span>
          <span>{progress.toFixed(1)}%</span>
        </div>

        {meta?.full_description && (
          <div className="prose max-w-none text-gray-700 mb-8 border-t border-b py-4">
            {meta.full_description.split('\n').map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        )}

        {/* Owner Controls */}
        {isOwner && (
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-6 space-y-2">
            <h3 className="font-bold text-yellow-800">Owner Controls</h3>
            <p className="text-sm text-yellow-700">
              Withdrawal Approved by Admin: {campaign.withdrawalApproved ? "Yes" : "No"}
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={handleRequestWithdrawal}
                disabled={campaign.fundsWithdrawn || campaign.withdrawalApproved}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                Request Withdrawal
              </button>
              <button 
                onClick={handleWithdrawFunds}
                disabled={!campaign.withdrawalApproved || campaign.fundsWithdrawn}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Withdraw Funds
              </button>
            </div>
            {campaign.fundsWithdrawn && <p className="text-green-600 font-bold">Funds have been withdrawn.</p>}
          </div>
        )}

        {/* Donate Form */}
        <form onSubmit={handleDonate} className="space-y-4 border-t pt-6">
          <h3 className="text-xl font-bold">Make a Donation</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="number"
              step="0.001"
              value={donateAmount}
              onChange={(e) => setDonateAmount(e.target.value)}
              placeholder="Amount in ETH"
              className="flex-1 px-4 py-2 border rounded-md"
              required
            />
            <label className="flex items-center space-x-2 whitespace-nowrap">
              <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Donate Anonymously</span>
            </label>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap">
              Donate
            </button>
          </div>
          <p className="text-xs text-gray-400">Note: Anonymous means hidden in UI. Address remains on-chain.</p>
        </form>
      </div>

      {/* Donation History Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold mb-4">Donation History (On-chain)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (ETH)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {donations.map((d, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {d.isAnonymous ? "Anonymous" : d.donor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEther(d.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(Number(d.timestamp) * 1000).toLocaleString()}
                  </td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No donations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
