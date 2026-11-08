import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input } from '../../components/common';
import GuestService from '../../services/guestService';
import toast from 'react-hot-toast';

const EditGuest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    id_type: 'passport',
    id_number: '',
    nationality: '',
    guest_type: 'standard'
  });

  useEffect(() => {
    const fetchGuest = async () => {
      try {
        const response = await GuestService.getGuestById(id);
        console.log("RAW GUEST DATA:", response);

        let guest = null;
        // SMART ADAPTER
        if (response.first_name) guest = response;
        else if (response.data) guest = response.data;
        else if (response.guest) guest = response.guest;

        if (guest) {
          setFormData({
            first_name: guest.first_name || '',
            last_name: guest.last_name || '',
            email: guest.email || '',
            phone: guest.phone || '',
            address: guest.address || '',
            id_type: guest.id_type || 'passport',
            id_number: guest.id_number || '',
            nationality: guest.nationality || '',
            guest_type: guest.guest_type || 'standard'
          });
        } else {
          toast.error("Guest data not found");
        }
      } catch (error) {
        toast.error("Failed to load guest details");
      } finally {
        setLoading(false);
      }
    };
    fetchGuest();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await GuestService.updateGuest(id, formData);
      toast.success('Guest updated successfully!');
      navigate('/guests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update guest');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Edit Guest</h1>
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
            <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
            <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} required />
          </div>

          <Input label="Address" name="address" value={formData.address} onChange={handleChange} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
             <div className="input-group">
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 500}}>ID Type</label>
                <select name="id_type" value={formData.id_type} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}}>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="drivers_license">Drivers License</option>
                </select>
             </div>
             <Input label="ID Number" name="id_number" value={formData.id_number} onChange={handleChange} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Button variant="secondary" onClick={() => navigate('/guests')}>Cancel</Button>
            <Button type="submit">Update Guest</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGuest;
