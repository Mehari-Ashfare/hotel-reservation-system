import React, { useState, useEffect } from 'react';
import StaffService from '../../services/staffService';
import { Button, Input, Modal } from '../../components/common';
import toast from 'react-hot-toast';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Password Form
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Profile Form
  const [formData, setFormData] = useState({ phone: '', address: '', first_name: '', last_name: '', email: '', position: '' });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await StaffService.getProfile();
      let data = response.data || response;
      if (data) {
        setProfile(data);
        setFormData({
          phone: data.phone || '',
          address: data.address || '',
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          position: data.position
        });
      }
    } catch (error) { toast.error("Failed to load profile"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const staffId = profile.staff_id || profile.id;
      await StaffService.updateStaff(staffId, { phone: formData.phone, address: formData.address });
      toast.success("Profile updated!");
      setIsEditing(false);
      fetchProfile();
    } catch (error) { toast.error("Update failed"); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) return toast.error("New passwords do not match");
    if (passData.newPassword.length < 6) return toast.error("Password must be at least 6 chars");

    try {
      await StaffService.changePassword({ 
        currentPassword: passData.currentPassword, 
        newPassword: passData.newPassword 
      });
      toast.success("Password changed successfully!");
      setShowPasswordModal(false);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Full Password Error:", error);
      
      // === IMPROVED ERROR HANDLING ===
      if (error.response) {
          // Backend replied with an error
          const status = error.response.status;
          const msg = error.response.data?.message || error.response.statusText;
          
          if (status === 404) toast.error("Error 404: Endpoint not found. Did you restart the backend?");
          else if (status === 400) toast.error(`Invalid: ${msg}`);
          else toast.error(`Server Error (${status}): ${msg}`);
      } else {
          // Network error or backend down
          toast.error(`Network Error: ${error.message}`);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found.</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>My Profile</h1>
      
      <div className="card" style={{ padding: '30px', borderTop: '5px solid #1976d2' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                backgroundColor: '#e3f2fd', color: '#1976d2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 'bold', marginRight: '20px'
            }}>
                {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
            </div>
            <div>
                <h2 style={{ margin: 0 }}>{profile.first_name} {profile.last_name}</h2>
                <p style={{ margin: '5px 0', color: '#666' }}>{profile.position} &bull; {profile.department || 'General'}</p>
                <div style={{display: 'flex', gap: '10px'}}>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', backgroundColor: '#e0f2f1', color: '#00695c' }}>Active Staff</span>
                    <button onClick={() => setShowPasswordModal(true)} style={{fontSize: '0.8rem', color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'}}>Change Password</button>
                </div>
            </div>
        </div>

        <form onSubmit={handleProfileUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div><label style={{ display: 'block', color: '#666', fontSize: '0.9rem' }}>Email</label><div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>{profile.email}</div></div>
                <div><label style={{ display: 'block', color: '#666', fontSize: '0.9rem' }}>Joined</label><div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>{new Date(profile.hire_date).toLocaleDateString()}</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={!isEditing} />
                <Input label="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} disabled={!isEditing} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>Edit Info</Button>
                ) : (
                    <>
                        <Button variant="secondary" onClick={() => { setIsEditing(false); setFormData({...formData, phone: profile.phone, address: profile.address}); }}>Cancel</Button>
                        <Button type="submit">Save Info</Button>
                    </>
                )}
            </div>
        </form>
      </div>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <form onSubmit={handlePasswordChange}>
            <Input label="Current Password" type="password" value={passData.currentPassword} onChange={(e) => setPassData({...passData, currentPassword: e.target.value})} required />
            <Input label="New Password" type="password" value={passData.newPassword} onChange={(e) => setPassData({...passData, newPassword: e.target.value})} required />
            <Input label="Confirm New Password" type="password" value={passData.confirmPassword} onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})} required />
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button type="submit" variant="danger">Update Password</Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Profile;
