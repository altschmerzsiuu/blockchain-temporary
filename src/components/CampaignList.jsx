import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import { supabase } from '../supabaseClient';

export default function CampaignList() {
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
    return <div className="text-center py-10">Please connect your wallet to view campaigns.</div>;
  }

  if (loading) {
    return <div className="text-center py-10">Loading campaigns...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Active Campaigns</h1>
      {campaigns.length === 0 ? (
        <p className="text-gray-500">No campaigns found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const cid = camp.id.toString();
            const raised = parseFloat(formatEther(camp.raisedAmount));
            const target = parseFloat(formatEther(camp.targetAmount));
            const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
            const deadlineDate = new Date(Number(camp.deadline) * 1000);
            
            const meta = metaData[cid] || {};

            return (
              <div key={cid} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {/* Meta Image */}
                {meta.image_url ? (
                  <img src={meta.image_url} alt={camp.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{camp.name}</h3>
                  <p className="text-xs text-blue-600 mb-2 font-medium">
                    {meta.org_name || "Unknown Org"} {meta.org_verified && "✓"}
                  </p>
                  
                  <div className="text-sm text-gray-500 mb-4">
                    Target: {target} ETH
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-4">
                    <span>{raised} ETH raised</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-6 flex-1">
                    Deadline: {deadlineDate.toLocaleDateString()}
                  </div>

                  <Link 
                    to={`/campaign/${cid}`}
                    className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 mt-auto"
                  >
                    View & Donate
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
