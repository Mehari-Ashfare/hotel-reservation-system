import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReservationService from '../../services/reservationService';
import RoomService from '../../services/roomService';
import { Button, Input } from '../../components/common';
import toast from 'react-hot-toast';

const EditReservation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Available Rooms
  const [rooms, setRooms] = useState([]);
  
  const [formData, setFormData] = useState({
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 1,
    special_requests: '',
    guest_name: ''
  });

  const [estimatedPrice, setEstimatedPrice] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // 1. Fetch Reservation
      try {
        console.log("Fetching Reservation ID:", id);
        const resResponse = await ReservationService.getReservationById(id);
        const res = resResponse.data || resResponse; // Handle {data: ...} or direct object

        if (res) {
            console.log("Reservation Loaded:", res);
            // Format dates safely
            const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

            setFormData({
                room_id: res.room_id || '',
                check_in_date: formatDate(res.check_in_date),
                check_out_date: formatDate(res.check_out_date),
                number_of_guests: res.number_of_guests || 1,
                special_requests: res.special_requests || '',
                guest_name: res.guest_name || 'Guest'
            });
            setEstimatedPrice(res.total_amount || 0);
        }
      } catch (error) {
        console.error("Reservation Load Error:", error);
        toast.error("Error loading reservation details");
      }

      // 2. Fetch Rooms (Separately, so failure doesn't break the whole page)
      try {
        console.log("Fetching All Rooms...");
        // Removed filter to ensure compatibility
        const roomResponse = await RoomService.getAllRooms(); 
        
        let roomList = [];
        if (Array.isArray(roomResponse)) roomList = roomResponse;
        else if (roomResponse.data) {
            if (Array.isArray(roomResponse.data)) roomList = roomResponse.data;
            else if (roomResponse.data.rooms) roomList = roomResponse.data.rooms;
        }
        
        console.log("Rooms Loaded:", roomList.length);
        setRooms(roomList);
      } catch (error) {
        console.error("Room Load Error:", error);
        toast.error("Could not load room list (Dropdown will be empty)");
      }

      setLoading(false);
    };

    loadData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await ReservationService.updateReservation(id, {
        room_id: formData.room_id,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        number_of_guests: formData.number_of_guests,
        special_requests: formData.special_requests
      });
      toast.success("Reservation updated!");
      navigate('/reservations');
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  if (loading) return <div>Loading details...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Edit Reservation #{id}</h1>
      <div className="card">
        <h3>Guest: {formData.guest_name}</h3>
        
        <form onSubmit={handleUpdate} style={{ marginTop: '20px' }}>
           <div style={{ marginBottom: '15px' }}>
              <label style={{display:'block', marginBottom:'5px', fontWeight: 'bold'}}>Room Selection</label>
              {rooms.length > 0 ? (
                  <select 
                    name="room_id" 
                    value={formData.room_id} 
                    onChange={handleChange}
                    className="input-field"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="">-- Select Room --</option>
                    {rooms.map(r => (
                        <option key={r.room_id} value={r.room_id}>
                            Room {r.room_number} ({r.type_name || 'Standard'} - ${r.base_price})
                        </option>
                    ))}
                  </select>
              ) : (
                  <div style={{color: 'red', padding: '10px', background: '#fff0f0', border: '1px solid red'}}>
                      Warning: No rooms loaded. You cannot change the room.
                      <br/>
                      <small>Current Room ID: {formData.room_id}</small>
                  </div>
              )}
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Input label="Check In" type="date" name="check_in_date" value={formData.check_in_date} onChange={handleChange} required />
              <Input label="Check Out" type="date" name="check_out_date" value={formData.check_out_date} onChange={handleChange} required />
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Input label="Guests" type="number" name="number_of_guests" value={formData.number_of_guests} onChange={handleChange} required />
              <Input label="Special Requests" name="special_requests" value={formData.special_requests} onChange={handleChange} />
           </div>
           
           <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                  <strong>Total: </strong> 
                  <span style={{color: 'green'}}>${estimatedPrice}</span> 
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="secondary" onClick={() => navigate('/reservations')}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
           </div>
        </form>
      </div>
    </div>
  );
};

export default EditReservation;
