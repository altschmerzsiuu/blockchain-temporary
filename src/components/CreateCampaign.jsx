import { useContext, useState } from 'react';
import { Web3Context } from '../App';
import { useNavigate } from 'react-router-dom';
import { parseEther } from 'ethers';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

export default function CreateCampaign() {
  const { contract } = useContext(Web3Context);
  const navigate = useNavigate();
  
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

      // 1. Upload image to Supabase Storage if a file was selected
      if (imageFile) {
        toast.loading('Uploading image...', { id: 'upload' });
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ampaign-images')
          .upload(fileName, imageFile);
          
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error("Image upload failed. Is your Supabase Storage bucket created?", { id: 'upload' });
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('ampaign-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrlData.publicUrl;
        toast.success('Image uploaded!', { id: 'upload' });
      }

      // 2. Create on-chain campaign
      const targetWei = parseEther(target);
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      
      const txPromise = contract.createCampaign(name, targetWei, deadlineTimestamp).then(tx => tx.wait());
      
      toast.promise(txPromise, {
        loading: 'Creating campaign on-chain...',
        success: 'Campaign created on-chain!',
        error: 'Failed to create campaign.',
      });

      await txPromise;
      
      // 3. Get the new campaign ID directly from the contract to be completely safe
      const count = await contract.campaignCount();
      const campaignId = Number(count);
      
      // 4. Write metadata to Supabase
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

      navigate('/');
    } catch (err) {
      console.error("Error creating campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-4">
          <h3 className="font-bold text-gray-700">On-Chain Core Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Amount (ETH)</label>
            <input
              type="number"
              step="0.001"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 space-y-4">
          <h3 className="font-bold text-blue-800">Off-Chain Metadata</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Name</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Image</label>
            
            {imagePreview ? (
              <div className="relative mb-4 group">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md border border-gray-300" />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors bg-white relative cursor-pointer">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
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
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-blue-300"
        >
          {loading ? "Processing..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}
