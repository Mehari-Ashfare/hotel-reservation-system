import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input } from '../../components/common';
import RoomService from '../../services/roomService';
import toast from 'react-hot-toast';

const EditRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    room_number: '',
    room_type_id: '',
    floor: '',
    price_adjustment: '0',
    status: 'available'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- 1. Fetch Room Types ---
        const typesResponse = await RoomService.getRoomTypes();
        console.log("RAW TYPES RESPONSE:", typesResponse); // Debugging

        let types = [];
        // SMART ADAPTER for Room Types
        if (Array.isArray(typesResponse)) {
            types = typesResponse;
        } else if (typesResponse.data) {
            if (Array.isArray(typesResponse.data)) {
                types = typesResponse.data;
            } else if (Array.isArray(typesResponse.data.roomTypes)) {
                types = typesResponse.data.roomTypes;
            } else if (typesResponse.data.data && Array.isArray(typesResponse.data.data)) {
                types = typesResponse.data.data;
            }
        } else if (typesResponse.roomTypes && Array.isArray(typesResponse.roomTypes)) {
            types = typesResponse.roomTypes;
        }
        
        setRoomTypes(types);

        // --- 2. Fetch Room Details ---
        const roomResponse = await RoomService.getRoomById(id);
        console.log("RAW ROOM RESPONSE:", roomResponse); // Debugging

        let room = null;
        // SMART ADAPTER for Single Room
        if (roomResponse.room_number) {
            room = roomResponse;
        } else if (roomResponse.data) {
             room = roomResponse.data.room || roomResponse.data;
        } else if (roomResponse.room) {
            room = roomResponse.room;
        }

        if (room) {
          // --- 3. Pre-fill Form ---
          setFormData({
            room_number: room.room_number,
            room_type_id: room.room_type_id,
            floor: room.floor,
            price_adjustment: room.price_adjustment || 0,
            status: room.status
          });
        } else {
            toast.error("Could not find room details");
        }

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load room details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await RoomService.updateRoom(id, formData);
      toast.success('Room updated successfully!');
      navigate('/rooms');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update room');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div className="form-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Edit Room</h1>
      <div className="card" style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
        <form onSubmit={handleSubmit}>
          <Input 
            label="Room Number" 
            name="room_number" 
            value={formData.room_number} 
            onChange={handleChange} 
            required 
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
            {roomTypes.length === 0 && <small style={{color: 'orange'}}>No types found. Check console.</small>}
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
            label="Price Adjustment" 
            name="price_adjustment" 
            type="number"
            value={formData.price_adjustment} 
            onChange={handleChange} 
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Button variant="secondary" onClick={() => navigate('/rooms')}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoom;
