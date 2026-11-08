import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/common';
import RoomService from '../../services/roomService';
import toast from 'react-hot-toast';

const AddRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    room_number: '',
    room_type_id: '',
    floor: '',
    price_adjustment: '0',
    status: 'available'
  });

  // Fetch room types for the dropdown
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const response = await RoomService.getRoomTypes();
        console.log("RAW ROOM TYPES:", response); // Debugging

        let types = [];
        
        // SMART EXTRACTION: Look for the array in all likely places
        if (Array.isArray(response)) {
            types = response;
        } else if (Array.isArray(response.data)) {
            types = response.data;
        } else if (response.data && Array.isArray(response.data.roomTypes)) {
            types = response.data.roomTypes; // <--- This is likely where your data is
        } else if (Array.isArray(response.roomTypes)) {
            types = response.roomTypes;
        }

        console.log("EXTRACTED TYPES:", types); // Verify we found them

        setRoomTypes(types);
        
        // Default to first type if available
        if (types.length > 0) {
          setFormData(prev => ({ ...prev, room_type_id: types[0].room_type_id || types[0].id }));
        }
      } catch (error) {
        console.error("Could not load room types", error);
        toast.error("Failed to load room types");
      }
    };
    loadTypes();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await RoomService.createRoom(formData);
      toast.success('Room added successfully!');
      navigate('/rooms');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Add New Room</h1>
      <div className="card" style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
        <form onSubmit={handleSubmit}>
          <Input 
            label="Room Number" 
            name="room_number" 
            value={formData.room_number} 
            onChange={handleChange} 
            required 
            placeholder="e.g. 101"
          />

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Room Type</label>
            <select 
              name="room_type_id" 
              value={formData.room_type_id} 
              onChange={handleChange}
              className="input-field"
              required
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
            >
              <option value="">Select Type</option>
              {roomTypes.map(type => (
                <option key={type.room_type_id || type.id} value={type.room_type_id || type.id}>
                  {type.type_name} (Base: ${type.base_price})
                </option>
              ))}
            </select>
            {roomTypes.length === 0 && (
              <small style={{color: 'orange', display: 'block', marginTop: '5px'}}>
                No room types found. Please check console (F12) for debugging.
              </small>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input 
              label="Floor" 
              name="floor" 
              type="number"
              value={formData.floor} 
              onChange={handleChange} 
              required 
            />
            
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                className="input-field"
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
              </select>
            </div>
          </div>

          <Input 
            label="Price Adjustment (Optional)" 
            name="price_adjustment" 
            type="number"
            value={formData.price_adjustment} 
            onChange={handleChange} 
            placeholder="e.g. 20 (adds $20 to base price)"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Button variant="secondary" onClick={() => navigate('/rooms')}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoom;
