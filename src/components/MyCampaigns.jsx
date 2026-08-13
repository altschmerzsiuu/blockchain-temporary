import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../App';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import { supabase } from '../supabaseClient';
import CreateCampaign from './CreateCampaign';

export default function MyCampaigns() {
  const { account, globalCampaigns, globalMetaData, globalDataLoading, refreshGlobalData } = useContext(Web3Context);
  const [showCreateSidebar, setShowCreateSidebar] = useState(false);

  if (globalDataLoading) {
    return <div className="text-center py-10 text-white">Loading your campaigns...</div>;
  }

  const myCampaigns = globalCampaigns.filter(camp => camp.owner.toLowerCase() === account.toLowerCase());

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">My Campaigns</h1>
        <button 
          onClick={() => setShowCreateSidebar(true)}
          className="neo-button px-6 py-3 text-sm flex items-center gap-2 cursor-pointer"
        >
          <span className="text-xl leading-none">+</span> Create Campaign
        </button>
      </div>
      
      {showCreateSidebar && (
        <CreateCampaign 
          onClose={() => setShowCreateSidebar(false)}
          onSuccess={() => {
            refreshGlobalData();
            setShowCreateSidebar(false);
          }}
        />
      )}
      
      {myCampaigns.length === 0 ? (
        <p className="text-[var(--nb-black)] bg-[#D1D5DB] p-6 rounded-xl border-4 border-[var(--nb-black)] font-bold text-lg text-center">You haven't created any campaigns yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCampaigns.map((camp) => {
            const cid = camp.id.toString();
            const raised = parseFloat(formatEther(camp.raisedAmount));
            const target = parseFloat(formatEther(camp.targetAmount));
            const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
            const deadlineDate = new Date(Number(camp.deadline) * 1000);
            
            const meta = globalMetaData[cid] || {};

            const isFailed = (Date.now() / 1000) >= Number(camp.deadline) && raised < target;
            const isWithdrawn = camp.fundsWithdrawn;
            const isGoalReached = raised >= target && !camp.fundsWithdrawn;

            return (
              <div key={cid} className="neo-card overflow-hidden flex flex-col">
                {/* Meta Image */}
                <div className="relative">
                  {meta.image_url ? (
                    <img src={meta.image_url} alt={camp.name} className="w-full h-48 object-cover border-b-4 border-[var(--nb-black)]" />
                  ) : (
                    <div className="w-full h-48 bg-[#D1D5DB] border-b-4 border-[var(--nb-black)] flex items-center justify-center text-[var(--nb-black)] font-bold">
                      No Image
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                    {camp.isCancelled && <span className="neo-badge red px-2 py-1 text-xs">CANCELLED</span>}
                    {!camp.isCancelled && isWithdrawn && <span className="neo-badge green px-2 py-1 text-xs">Successfully Withdrawn</span>}
                    {!camp.isCancelled && isFailed && <span className="neo-badge red px-2 py-1 text-xs">Unsuccessful</span>}
                    {!camp.isCancelled && isGoalReached && <span className="neo-badge px-2 py-1 text-xs">Goal Reached</span>}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-[var(--nb-black)] mb-1 truncate">{camp.name}</h3>
                  <p className="text-xs mb-3 font-bold text-[var(--nb-blue)] uppercase">
                    {meta.org_name || "Unknown Org"} {meta.org_verified && "✓"}
                  </p>
                  
                  <div className="text-sm text-[var(--nb-black)] font-bold mb-4">
                    Target: {target} ETH
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-[#D1D5DB] border-4 border-[var(--nb-black)] rounded-full h-4 mb-2 overflow-hidden">
                    <div className="h-full" style={{ width: `${progress}%`, backgroundColor: 'var(--nb-green)', borderRight: progress > 0 ? '4px solid var(--nb-black)' : 'none' }}></div>
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
                    className="block w-full text-center px-4 py-3 text-sm neo-button mt-auto"
                  >
                    Manage Campaign
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
