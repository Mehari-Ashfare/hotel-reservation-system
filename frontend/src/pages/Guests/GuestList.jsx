import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import GuestService from '../../services/guestService';
import { Button, Modal } from '../../components/common';
import toast from 'react-hot-toast';
import '../../assets/styles/global.css';

const GuestList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState(null);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      let response;
      
      // === SEARCH LOGIC ===
      if (searchQuery.trim().length > 1) {
          response = await GuestService.searchGuests(searchQuery);
      } else {
          response = await GuestService.getGuests();
      }

      let guestList = [];
      // === SMART ADAPTER ===
      if (Array.isArray(response)) guestList = response;
      else if (response.data) {
          if (Array.isArray(response.data)) guestList = response.data;
          else if (Array.isArray(response.data.guests)) guestList = response.data.guests;
          else if (response.data.data && Array.isArray(response.data.data)) guestList = response.data.data;
      }
      else if (response.guests && Array.isArray(response.guests)) guestList = response.guests;

      setGuests(guestList);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast.error('Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, []); 

  const handleDeleteClick = (guest) => {
    setGuestToDelete(guest);
    setShowDeleteModal(true);
  };

  const confirmDeleteGuest = async () => {
    if (!guestToDelete) return;
    try {
      await GuestService.deleteGuest(guestToDelete.id || guestToDelete.guest_id);
      toast.success('Guest deleted successfully');
      fetchGuests();
    } catch (error) {
      toast.error('Failed to delete guest');
    } finally {
      setShowDeleteModal(false);
      setGuestToDelete(null);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Guest Management</h1>
        <Button variant="primary" onClick={() => navigate('/guests/add')}>+ Add Guest</Button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search guests by name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGuests()} // Allow Enter key
            style={{ flex: 1 }}
          />
          <Button onClick={fetchGuests}>Search</Button>
          {searchQuery && <Button variant="secondary" onClick={() => { setSearchQuery(''); setTimeout(fetchGuests, 0); }}>Clear</Button>}
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Contact</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.length > 0 ? guests.map(guest => (
                <tr key={guest.id || guest.guest_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{guest.first_name} {guest.last_name}</td>
                  <td style={{ padding: '10px' }}>{guest.email}<br/><small>{guest.phone}</small></td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      backgroundColor: '#e3f2fd', 
                      fontSize: '0.8rem' 
                    }}>
                      {guest.guest_type || 'Standard'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => navigate(`/guests/edit/${guest.id || guest.guest_id}`)}
                        style={{ color: '#1976d2', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(guest)} 
                        style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>
                    No guests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete">
        <p>Are you sure you want to delete this guest?</p>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteGuest}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default GuestList;
