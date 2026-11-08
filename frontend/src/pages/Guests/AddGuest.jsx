import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/common';
import GuestService from '../../services/guestService';
import toast from 'react-hot-toast';
import '../../assets/styles/global.css';

const AddGuest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    id_number: '',
    guest_type: 'walk-in'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await GuestService.createGuest(formData);
      toast.success('Guest added successfully!');
      navigate('/guests');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to add guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Add New Guest</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input 
              label="First Name" 
              name="first_name" 
              value={formData.first_name} 
              onChange={handleChange} 
              required 
            />
            <Input 
              label="Last Name" 
              name="last_name" 
              value={formData.last_name} 
              onChange={handleChange} 
              required 
            />
          </div>

          <Input 
            label="Email" 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
          />
          
          <Input 
            label="Phone" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            required 
          />

          <Input 
            label="Address" 
            name="address" 
            value={formData.address} 
            onChange={handleChange} 
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input 
              label="ID / Passport Number" 
              name="id_number" 
              value={formData.id_number} 
              onChange={handleChange} 
            />
            
            <div className="input-group">
              <label className="input-label">Guest Type</label>
              <select 
                name="guest_type" 
                value={formData.guest_type} 
                onChange={handleChange}
                className="input-field"
                style={{ height: '42px', backgroundColor: 'white' }}
              >
                <option value="walk-in">Walk-in</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Button variant="secondary" onClick={() => navigate('/guests')}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Guest'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGuest;
