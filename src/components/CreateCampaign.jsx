import { useContext, useState } from 'react';
import { Web3Context } from '../App';
import { parseEther } from 'ethers';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

export default function CreateCampaign({ onClose, onSuccess }) {
  const { contract } = useContext(Web3Context);
  
  // On-chain fields
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  
  // Off-chain (Metadata) fields
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [description, setDescription] = useState("");
  const [orgName, setOrgName] = useState("");

  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      
      let finalImageUrl = "";

      if (imageFile) {
        toast.loading('Uploading image...', { id: 'upload' });
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ampaign-images')
          .upload(fileName, imageFile);
          
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error("Image upload failed.", { id: 'upload' });
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('ampaign-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrlData.publicUrl;
        toast.success('Image uploaded!', { id: 'upload' });
      }

      const targetWei = parseEther(target);
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      
      const txPromise = contract.createCampaign(name, targetWei, deadlineTimestamp).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Creating campaign on-chain...',
        success: 'Campaign created on-chain!',
        error: 'Failed to create campaign.',
      });

      await txPromise;
      
      const count = await contract.campaignCount();
      const campaignId = Number(count);
      
      const { error: dbError } = await supabase.from('campaigns_meta').insert([
        {
          campaign_id: campaignId,
          image_url: finalImageUrl,
          full_description: description,
          org_name: orgName,
          org_verified: false
        }
      ]);

      if (dbError) {
        console.error("Supabase insert error:", dbError);
        toast.error("Failed to save off-chain metadata (RLS issue?), but campaign is live.");
      } else {
        toast.success("Metadata saved successfully.");
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error creating campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l-8 border-[var(--nb-black)] z-50 shadow-[-10px_0px_0px_0px_var(--nb-mustard)] flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="bg-[var(--nb-black)] text-white p-6 flex justify-between items-center border-b-4 border-[var(--nb-black)]">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Create Campaign</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-[var(--nb-mustard)] transition-colors"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-[#D1D5DB] p-4 border-4 border-[var(--nb-black)] rounded-xl space-y-4">
              <h3 className="font-black text-lg uppercase text-[var(--nb-black)]">On-Chain Core Details</h3>
              <div>
                <label className="block text-sm font-bold text-[var(--nb-black)] mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full neo-input p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--nb-black)] mb-1">Target Amount (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full neo-input p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--nb-black)] mb-1">Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full neo-input p-2"
                />
              </div>
            </div>

            <div className="bg-[var(--nb-blue)] p-4 border-4 border-[var(--nb-black)] rounded-xl space-y-4">
              <h3 className="font-black text-lg uppercase text-[var(--nb-black)]">Off-Chain Metadata</h3>
              <div>
                <label className="block text-sm font-bold text-[var(--nb-black)] mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full neo-input p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--nb-black)] mb-2">Campaign Image</label>
                
                {imagePreview ? (
                  <div className="relative mb-2 group">
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border-4 border-[var(--nb-black)]" />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview("");
                        }}
                        className="neo-button neo-button-red px-3 py-1 text-xs"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex justify-center px-4 pt-3 pb-4 border-4 border-[var(--nb-black)] border-dashed rounded-xl bg-white hover:bg-gray-50 transition-colors relative cursor-pointer">
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm text-[var(--nb-black)] font-bold justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[var(--nb-blue)] underline focus-within:outline-none">
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept="image/*"
                            required
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <p className="text-xs font-bold text-[var(--nb-black)] opacity-80 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--nb-black)] mb-1">Full Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full neo-input p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full neo-button neo-button-green py-3 text-lg mt-4 mb-8"
            >
              {loading ? "Processing..." : "Create Campaign"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
