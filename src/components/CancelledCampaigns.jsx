import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import { supabase } from '../supabaseClient';

export default function CancelledCampaigns() {
  const { contract } = useContext(Web3Context);
  const [campaigns, setCampaigns] = useState([]);
  const [metaData, setMetaData] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (!contract) return;
    try {
      // 1. Fetch on-chain truth
      const allCampaigns = await contract.getAllCampaigns();
      setCampaigns(allCampaigns);

      // 2. Fetch off-chain meta data from Supabase
      const { data, error } = await supabase
        .from('campaigns_meta')
        .select('*');
      
      if (!error && data) {
        const metaMap = {};
        data.forEach(item => {
          metaMap[item.campaign_id] = item;
        });
        setMetaData(metaMap);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [contract]);

  if (!contract) {
    return <div className="text-center py-10">Please connect your wallet to view cancelled campaigns.</div>;
  }

  if (loading) {
    return <div className="text-center py-10">Loading cancelled campaigns...</div>;
  }

  const cancelledList = campaigns.filter(camp => camp.isCancelled);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Cancelled Campaigns</h1>
        <p className="text-white opacity-80 text-base font-medium">These campaigns have been cancelled by their creators. Donors can claim refunds.</p>
      </div>
      
      {cancelledList.length === 0 ? (
        <p className="text-[var(--nb-black)] bg-[#D1D5DB] p-6 rounded-xl border-4 border-[var(--nb-black)] font-bold text-lg">No cancelled campaigns found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cancelledList.map((camp) => {
            const cid = camp.id.toString();
            const raised = parseFloat(formatEther(camp.raisedAmount));
            const target = parseFloat(formatEther(camp.targetAmount));
            const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
            const deadlineDate = new Date(Number(camp.deadline) * 1000);
            
            const meta = metaData[cid] || {};

            return (
              <div key={cid} className="neo-card overflow-hidden flex flex-col opacity-80 border-[var(--nb-red)]">
                {/* Meta Image */}
                {meta.image_url ? (
                  <img src={meta.image_url} alt={camp.name} className="w-full h-48 object-cover grayscale border-b-4 border-[var(--nb-black)]" />
                ) : (
                  <div className="w-full h-48 bg-[#D1D5DB] flex items-center justify-center text-[var(--nb-black)] font-bold border-b-4 border-[var(--nb-black)]">
                    No Image
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="text-2xl font-black text-[var(--nb-black)] truncate">{camp.name}</h3>
                    <span className="neo-badge px-2 py-1 bg-[var(--nb-red)] text-white text-xs">Cancelled</span>
                  </div>
                  
                  <p className="text-xs font-bold text-[var(--nb-blue)] uppercase mb-3">
                    {meta.org_name || "Unknown Org"} {meta.org_verified && "✓"}
                  </p>
                  
                  <div className="text-sm text-[var(--nb-black)] font-bold mb-4">
                    Target: {target} ETH
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-[#D1D5DB] border-4 border-[var(--nb-black)] rounded-full h-4 mb-2 overflow-hidden">
                    <div className="h-full bg-gray-400" style={{ width: `${progress}%`, borderRight: progress > 0 ? '4px solid var(--nb-black)' : 'none' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--nb-black)] font-bold mb-4">
                    <span>{raised} ETH raised</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  
                  <div className="text-xs text-[var(--nb-black)] font-bold mb-6 flex-1">
                    Deadline: {deadlineDate.toLocaleDateString()}
                  </div>

                  <Link 
                    to={`/campaign/${cid}`}
                    className="block w-full text-center px-4 py-3 neo-button text-sm mt-auto"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
