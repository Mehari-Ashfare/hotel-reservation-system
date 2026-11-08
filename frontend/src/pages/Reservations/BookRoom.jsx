import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/common';
import ReservationService from '../../services/reservationService';
import GuestService from '../../services/guestService';
import RoomService from '../../services/roomService';
import toast from 'react-hot-toast';
import '../../assets/styles/global.css';

const BookRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [guests, setGuests] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

  const [bookingData, setBookingData] = useState({
    guest_id: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 1,
    room_id: '',
    room_price: 0
  });

  useEffect(() => {
    const loadGuests = async () => {
      try {
        const response = await GuestService.getGuests();
        let guestList = [];
        if (Array.isArray(response)) guestList = response;
        else if (Array.isArray(response.data)) guestList = response.data;
        else if (response.data && Array.isArray(response.data.guests)) guestList = response.data.guests;
        else if (Array.isArray(response.guests)) guestList = response.guests;
        setGuests(guestList);
      } catch (error) {
        toast.error('Failed to load guests.');
      }
    };
    loadGuests();
  }, []);

  const handleChange = (e) => {
    setBookingData({ ...bookingData, [e.target.name]: e.target.value });
  };

  const handleSearchRooms = async (e) => {
    e.preventDefault();
    if (!bookingData.check_in_date || !bookingData.check_out_date) {
      toast.error("Please select dates");
      return;
    }
    setLoading(true);
    try {
      const response = await RoomService.getAllRooms({ status: 'available' });
      let rooms = [];
      if (Array.isArray(response)) rooms = response;
      else if (Array.isArray(response.data)) rooms = response.data;
      else if (response.data && Array.isArray(response.data.rooms)) rooms = response.data.rooms;
      else if (Array.isArray(response.rooms)) rooms = response.rooms;

      if (rooms.length === 0) {
        toast.error("No rooms available for these dates");
      } else {
        setAvailableRooms(rooms);
        setStep(2);
      }
    } catch (error) {
      toast.error("Failed to search rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoom = (room) => {
    setBookingData({ 
      ...bookingData, 
      room_id: room.room_id || room.id, 
      room_price: room.base_price || room.price || 0 
    });
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      const payload = {
        guest_id: bookingData.guest_id,
        room_id: bookingData.room_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        number_of_guests: bookingData.number_of_guests,
        total_amount: calculateTotal()
      };
      await ReservationService.createReservation(payload);
      toast.success("Reservation Created Successfully!");
      navigate('/reservations');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create reservation");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const start = new Date(bookingData.check_in_date);
    const end = new Date(bookingData.check_out_date);
    const nights = (end - start) / (1000 * 60 * 60 * 24);
    return (nights * bookingData.room_price).toFixed(2);
  };

  const getSelectedGuestName = () => {
    const g = guests.find(g => (g.guest_id || g.id).toString() === bookingData.guest_id.toString());
    return g ? `${g.first_name} ${g.last_name}` : 'Unknown';
  };

  return (
    <div className="form-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>New Reservation (Step {step} of 3)</h1>
      
      {step === 1 && (
        <div className="card" style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
          <form onSubmit={handleSearchRooms}>
            <div className="input-group" style={{ marginBottom: '15px' }}>
              <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select Guest</label>
              <select 
                name="guest_id" 
                value={bookingData.guest_id} 
                onChange={handleChange} 
                className="input-field" 
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: 'white' }}
              >
                <option value="">-- Choose Guest --</option>
                {guests.map(g => (
                  <option key={g.guest_id || g.id} value={g.guest_id || g.id}>
                    {g.first_name} {g.last_name} ({g.email})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
              <Input label="Check-In Date" type="date" name="check_in_date" value={bookingData.check_in_date} onChange={handleChange} required />
              <Input label="Check-Out Date" type="date" name="check_out_date" value={bookingData.check_out_date} onChange={handleChange} required />
            </div>
            <Input label="Number of Guests" type="number" name="number_of_guests" value={bookingData.number_of_guests} onChange={handleChange} required />
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button type="submit" disabled={loading}>Find Available Rooms &rarr;</Button>
            </div>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
          <h3>Select a Room</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
            {availableRooms.map(room => (
              <div 
                key={room.room_id || room.id} 
                style={{ 
                  borderRadius: '8px', 
                  padding: '15px', 
                  cursor: 'pointer',
                  backgroundColor: bookingData.room_id === (room.room_id || room.id) ? '#e3f2fd' : 'white',
                  border: bookingData.room_id === (room.room_id || room.id) ? '2px solid #1976d2' : '1px solid #ddd'
                }}
                onClick={() => handleSelectRoom(room)}
              >
                <h4 style={{ margin: '0 0 10px 0' }}>Room {room.room_number}</h4>
                <p style={{ margin: '5px 0' }}>Type: {room.type_name || room.room_type_id || 'Standard'}</p>
                <p style={{ fontWeight: 'bold', color: 'green', margin: '5px 0' }}>${room.base_price || room.price}/night</p>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSelectRoom(room); }}>Select</Button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(1)}>&larr; Back</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
          <h3>Confirm Reservation</h3>
          <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <p><strong>Guest:</strong> {getSelectedGuestName()}</p>
            <p><strong>Dates:</strong> {bookingData.check_in_date} to {bookingData.check_out_date}</p>
            <p><strong>Room:</strong> Room {availableRooms.find(r => (r.room_id || r.id) === bookingData.room_id)?.room_number}</p>
            <hr style={{ borderTop: '1px solid #ddd', margin: '15px 0' }} />
            <h2 style={{ textAlign: 'right', margin: 0 }}>Total: ${calculateTotal()}</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setStep(2)}>Change Room</Button>
            <Button variant="primary" onClick={handleConfirmBooking} disabled={loading}>{loading ? 'Processing...' : 'Confirm Booking'}</Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default BookRoom;
