import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomService from '../../services/roomService';
import { Button, Modal, Input } from '../../components/common';
import toast from 'react-hot-toast';
import '../../assets/styles/global.css';

const RoomList = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  // New Room Type Form Data
  const [newType, setNewType] = useState({
    type_name: '',
    base_price: '',
    max_occupancy: 2,
    description: '',
    amenities: ''
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await RoomService.getAllRooms();
      let roomList = [];
      
      if (Array.isArray(response)) roomList = response;
      else if (response.data) {
          if (Array.isArray(response.data)) roomList = response.data;
          else if (Array.isArray(response.data.rooms)) roomList = response.data.rooms;
          else if (response.data.data && Array.isArray(response.data.data)) roomList = response.data.data;
      }
      else if (response.rooms && Array.isArray(response.rooms)) roomList = response.rooms;

      setRooms(roomList);
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleDelete = async () => {
    if (!roomToDelete) return;
    try {
      await RoomService.deleteRoom(roomToDelete.room_id || roomToDelete.id);
      toast.success('Room deleted successfully');
      fetchRooms();
    } catch (error) {
      toast.error('Failed to delete room');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type_name: newType.type_name,
        description: newType.description || null,
        base_price: Number(newType.base_price),
        max_occupancy: parseInt(newType.max_occupancy, 10),
        amenities: newType.amenities ? newType.amenities.split(',').map(s => s.trim()) : [],
        size_sqft: null
      };

      console.log("Sending Payload:", payload);
      await RoomService.createRoomType(payload);
      toast.success('New Room Type Created!');
      setShowTypeModal(false);
      setNewType({ type_name: '', base_price: '', max_occupancy: 2, description: '', amenities: '' });
      
    } catch (error) {
      console.error("Full Error Object:", error);
      
      // === REVEAL THE HIDDEN ERROR ===
      let errorMessage = "Failed to create room type";
      if (error.response) {
          // If backend sent a message
          if (error.response.data && error.response.data.message) {
              errorMessage = "Backend: " + error.response.data.message;
          } else {
              errorMessage = "Backend Status: " + error.response.status + " " + error.response.statusText;
          }
      } else if (error.message) {
          errorMessage = "Error: " + error.message;
      }
      
      // Show persistent error toast
      toast.error(errorMessage, { duration: 6000 });
      alert(errorMessage); // Force browser alert so you definitely see it
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'available': return '#4caf50'; 
      case 'occupied': return '#f44336';  
      case 'maintenance': return '#ff9800'; 
      case 'cleaning': return '#2196f3'; 
      default: return '#9e9e9e';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Room Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setShowTypeModal(true)}>+ New Type</Button>
          <Button variant="primary" onClick={() => navigate('/rooms/add')}>+ Add Room</Button>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {rooms.length > 0 ? rooms.map(room => (
            <div key={room.room_id || room.id} className="card" style={{ position: 'relative', borderTop: `4px solid ${getStatusColor(room.status)}` }}>
              <div style={{ 
                position: 'absolute', top: '15px', right: '15px', 
                padding: '4px 8px', borderRadius: '12px',
                fontSize: '0.75rem', fontWeight: 'bold',
                backgroundColor: getStatusColor(room.status) + '20', 
                color: getStatusColor(room.status)
              }}>
                {room.status?.toUpperCase()}
              </div>
              
              <h3 style={{ marginTop: 0 }}>Room {room.room_number}</h3>
              <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
                <p style={{ margin: '5px 0' }}><strong>Type:</strong> {room.type_name || 'Standard'}</p>
                <p style={{ margin: '5px 0' }}><strong>Floor:</strong> {room.floor}</p>
                <p style={{ margin: '5px 0', fontSize: '1.1rem', color: '#1976d2', fontWeight: 'bold' }}>
                  ETB {room.base_price || room.price || '0.00'} <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>/ night</span>
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <Button variant="outline" onClick={() => navigate(`/rooms/edit/${room.room_id || room.id}`)} style={{ flex: 1 }}>Edit</Button>
                <button 
                  onClick={() => { setRoomToDelete(room); setShowDeleteModal(true); }}
                  style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', padding: '0 10px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <h3>No rooms found</h3>
              <p>Add your first room to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete">
        <p>Are you sure you want to delete <strong>Room {roomToDelete?.room_number}</strong>?</p>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Add Room Type Modal */}
      <Modal isOpen={showTypeModal} onClose={() => setShowTypeModal(false)} title="Add New Room Type">
        <form onSubmit={handleCreateType}>
          <Input 
            label="Type Name (e.g., Deluxe Suite)" 
            value={newType.type_name} 
            onChange={(e) => setNewType({...newType, type_name: e.target.value})}
            required
          />
          <Input 
            label="Base Price ($)" 
            type="number"
            value={newType.base_price} 
            onChange={(e) => setNewType({...newType, base_price: e.target.value})}
            required
          />
          <Input 
            label="Max Occupancy" 
            type="number"
            value={newType.max_occupancy} 
            onChange={(e) => setNewType({...newType, max_occupancy: e.target.value})}
          />
           <Input 
            label="Description (Optional)" 
            value={newType.description} 
            onChange={(e) => setNewType({...newType, description: e.target.value})}
          />
          {/* Added Amenities Field */}
          <Input 
            label="Amenities (comma separated, e.g. WiFi, TV)" 
            value={newType.amenities} 
            onChange={(e) => setNewType({...newType, amenities: e.target.value})}
            placeholder="WiFi, TV, AC"
          />

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setShowTypeModal(false)}>Cancel</Button>
            <Button type="submit">Create Type</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomList;