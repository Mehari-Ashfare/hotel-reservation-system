import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReservationService from '../../services/reservationService';
import PaymentService from '../../services/paymentService'; // <--- MAKE SURE THIS EXISTS
import { Button, Modal } from '../../components/common';
import PaymentModal from '../../components/PaymentModal'; 
import toast from 'react-hot-toast';

const ReservationList = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Payment Modal (Adding money)
  const [selectedResForPayment, setSelectedResForPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // State for Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // State for Refund Modal (Returning money)
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundablePayments, setRefundablePayments] = useState([]);
  const [refundReason, setRefundReason] = useState('');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await ReservationService.getAllReservations();
      let list = [];
      if (Array.isArray(response)) list = response;
      else if (response.data) list = Array.isArray(response.data) ? response.data : (response.data.reservations || []);
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReservations(list);
    } catch (error) {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReservations(); }, []);

  // --- ACTIONS ---
  const handlePaymentClick = (res) => {
    setSelectedResForPayment(res);
    setShowPaymentModal(true);
  };

  const handleCheckIn = async (res) => {
    const paid = Number(res.paid_amount || 0);
    const total = Number(res.total_amount || 0);

    if (paid < total) {
        toast.error(`Cannot Check-In! Payment incomplete. (${paid}/${total})`);
        return;
    }

    if (!window.confirm("Confirm Check-In for this guest?")) return;
    try {
      await ReservationService.checkIn(res.reservation_id || res.id);
      toast.success("Guest Checked In!");
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Check-in failed");
    }
  };

  const handleCheckOut = async (id) => {
    if (!window.confirm("Confirm Check-Out?")) return;
    try {
      await ReservationService.checkOut(id);
      toast.success("Guest Checked Out!");
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Check-out failed");
    }
  };

  const handleCancelClick = (res) => {
    setSelectedRes(res);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    try {
      await ReservationService.cancelReservation(selectedRes.reservation_id || selectedRes.id, cancelReason);
      toast.success("Reservation Cancelled");
      setShowCancelModal(false);
      setCancelReason('');
      fetchReservations();
    } catch (error) {
      toast.error("Cancellation failed");
    }
  };

  // --- REFUND LOGIC ---
  const handleRefundClick = async (res) => {
    try {
      // Fetch payments for this specific reservation to see what can be refunded
      const response = await PaymentService.getReservationPayments(res.reservation_id || res.id);
      
      // Filter for 'completed' payments OR 'partially_refunded' (since they still have balance)
      const completed = (response.data || []).filter(p => 
          p.payment_status === 'completed' || p.payment_status === 'partially_refunded'
      );
      
      if (completed.length === 0) {
        toast.error("No refundable payments found.");
        return;
      }

      setRefundablePayments(completed);
      setSelectedRes(res); 
      setShowRefundModal(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payments for refund");
    }
  };

  const processRefund = async (paymentId, amount) => {
    if (!refundReason) {
      toast.error("Please enter a reason for the refund");
      return;
    }
    if (!window.confirm(`Refund $${amount}? This action cannot be undone.`)) return;

    try {
      // FIX: Now we explicitly send the refund_amount to the backend
      await PaymentService.processRefund(paymentId, { 
          refund_amount: amount,
          reason: refundReason 
      });
      
      toast.success("Refund Processed Successfully");
      setShowRefundModal(false);
      setRefundReason('');
      fetchReservations(); // Refresh the main list to update totals
    } catch (error) {
      toast.error(error.response?.data?.message || "Refund failed");
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'confirmed') return '#4caf50'; 
    if (s === 'checked-in') return '#2196f3';
    if (s === 'checked-out') return '#9e9e9e'; 
    if (s === 'cancelled') return '#f44336';
    return '#ff9800'; 
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Reservations</h1>
        <Button variant="primary" onClick={() => navigate('/reservations/new')}>+ New Booking</Button>
      </div>

      <div className="card">
        {loading ? <p>Loading bookings...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Guest</th>
                <th style={{ padding: '10px' }}>Room</th>
                <th style={{ padding: '10px' }}>Status / Payment</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(res => {
                const id = res.reservation_id || res.id;
                const status = res.status?.toLowerCase();
                const paidAmount = Number(res.paid_amount || 0);
                const refundedAmount = Number(res.refunded_amount || 0); // New field from backend
                const totalAmount = Number(res.total_amount || 0);
                const isFullyPaid = paidAmount >= totalAmount;

                return (
                  <tr key={id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>#{id}</td>
                    <td style={{ padding: '10px' }}>
                      <strong>{res.guest_name || (res.first_name ? `${res.first_name} ${res.last_name}` : 'Unknown')}</strong>
                      <br/><span style={{fontSize:'0.8rem', color: '#666'}}>
                        {new Date(res.check_in_date).toLocaleDateString()} - {new Date(res.check_out_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>{res.room_number ? `Room ${res.room_number}` : 'Unassigned'}</td>
                    <td style={{ padding: '10px' }}>
                       <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                        <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', 
                            backgroundColor: getStatusColor(status) + '20', 
                            color: getStatusColor(status),
                            fontWeight: 'bold', fontSize: '0.8rem',
                            whiteSpace: 'nowrap', width: 'fit-content'
                        }}>
                            {status?.toUpperCase()}
                        </span>
                        
                        {/* Net Payment Display */}
                        <span style={{ fontSize: '0.75rem', color: isFullyPaid ? 'green' : 'red' }}>
                            ETB {paidAmount} / ETB {totalAmount}
                        </span>

                        {/* Refund Badge (Only if a refund exists) */}
                        {refundedAmount > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#ff9800', fontWeight: 'bold' }}>
                                 Refunded: ETB {refundedAmount}
                            </span>
                        )}
                       </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        
                        {/* PAYMENT BUTTON OR PAID BADGE */}
                        {status !== 'cancelled' && (
                            isFullyPaid ? (
                                <span style={{
                                    border: '1px solid #4caf50', color: '#4caf50', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center'
                                }}>
                                    PAID
                                </span>
                            ) : (
                                <button 
                                    onClick={() => handlePaymentClick(res)} 
                                    style={{color: '#fff', background:'#673ab7', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}
                                >
                                    Pay
                                </button>
                            )
                        )}

                        {/* CHECK-IN / CANCEL */}
                        {status === 'confirmed' && (
                          <>
                            <button onClick={() => handleCheckIn(res)} style={{color: '#2196f3', border:'1px solid #2196f3', background:'white', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}>Check In</button>
                            <button onClick={() => handleCancelClick(res)} style={{color: '#f44336', border:'none', background:'none', cursor:'pointer'}}>Cancel</button>
                          </>
                        )}
                        
                        {/* CHECK-OUT */}
                        {status === 'checked-in' && (
                          <button onClick={() => handleCheckOut(id)} style={{color: '#fff', background:'#4caf50', border:'none', borderRadius:'4px', padding:'4px 8px', cursor:'pointer'}}>Check Out</button>
                        )}

                        {/* REFUND BUTTON (Only for cancelled + paid bookings) */}
                        {status === 'cancelled' && paidAmount > 0 && (
                           <button 
                             onClick={() => handleRefundClick(res)}
                             style={{color: '#fff', background:'#ff9800', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}
                           >
                             Refund
                           </button>
                        )}

                         <button onClick={() => navigate(`/reservations/edit/${id}`)} style={{color: '#666', border:'none', background:'none', cursor:'pointer'}}>Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal (For adding money) */}
      {selectedResForPayment && (
          <PaymentModal 
            isOpen={showPaymentModal} 
            onClose={() => {
                setShowPaymentModal(false);
                fetchReservations(); // Refresh list after payment
            }} 
            reservation={selectedResForPayment}
          />
      )}

      {/* Cancel Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Reservation">
         <p>Are you sure you want to cancel this booking?</p>
         <div style={{ margin: '15px 0' }}>
            <label style={{display:'block', marginBottom:'5px'}}>Reason (Optional):</label>
            <input 
              type="text" 
              className="input-field" 
              style={{width: '100%'}}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Guest request, No show"
            />
         </div>
         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Back</Button>
            <Button variant="danger" onClick={confirmCancel}>Confirm Cancel</Button>
         </div>
      </Modal>

      {/* Refund Modal - SMARTER VERSION */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Process Refund">
         <p>Select a payment transaction to refund for Guest: <strong>{selectedRes?.guest_name || selectedRes?.first_name}</strong></p>
         
         <div style={{margin: '15px 0', border: '1px solid #eee', padding: '10px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto'}}>
            {refundablePayments.map(p => {
                // Calculate remaining refundable amount for this specific transaction
                const remainingRefundable = p.amount - (p.refund_amount || 0);
                
                return (
                    <div key={p.payment_id} style={{padding:'10px', borderBottom:'1px solid #f5f5f5', backgroundColor: '#fafafa', marginBottom: '10px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                            <span style={{fontWeight:'bold'}}>Transaction #{p.payment_id}</span>
                            <span style={{color:'green', fontWeight:'bold'}}>${p.amount}</span>
                        </div>
                        <div style={{fontSize:'0.85rem', color:'#666', marginBottom:'8px'}}>
                            Method: {p.payment_method} | Date: {new Date(p.payment_date).toLocaleDateString()}
                            {p.refund_amount > 0 && (
                                <span style={{color:'orange', marginLeft:'5px'}}>
                                    (Already Refunded: ${p.refund_amount})
                                </span>
                            )}
                        </div>
                        
                        {/* Quick Percentage Buttons (Calculated on Remaining Balance) */}
                        <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                            <button 
                                onClick={() => processRefund(p.payment_id, remainingRefundable.toFixed(2))}
                                style={{fontSize:'0.75rem', padding:'3px 8px', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', background:'white'}}
                            >
                                Refund Rest (${remainingRefundable.toFixed(2)})
                            </button>
                            <button 
                                onClick={() => processRefund(p.payment_id, (remainingRefundable * 0.5).toFixed(2))}
                                style={{fontSize:'0.75rem', padding:'3px 8px', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', background:'white'}}
                            >
                                50% Bal (${(remainingRefundable * 0.5).toFixed(2)})
                            </button>
                             <button 
                                onClick={() => {
                                    const amount = prompt(`Enter refund amount (Max: $${remainingRefundable})`);
                                    if(amount && Number(amount) <= remainingRefundable) processRefund(p.payment_id, amount);
                                    else if(amount) alert("Invalid amount");
                                }}
                                style={{fontSize:'0.75rem', padding:'3px 8px', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', background:'white'}}
                            >
                                Custom
                            </button>
                        </div>
                    </div>
                );
            })}
         </div>

         <div style={{ margin: '15px 0' }}>
            <label style={{display:'block', marginBottom:'5px'}}>Refund Reason (Required):</label>
            <input 
              type="text" 
              className="input-field" 
              style={{width: '100%'}}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Policy: 24h Cancellation (100%)"
            />
         </div>
         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowRefundModal(false)}>Close</Button>
         </div>
      </Modal>
    </div>
  );
};

export default ReservationList;





// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import ReservationService from '../../services/reservationService';
// import PaymentService from '../../services/paymentService'; // <--- MAKE SURE THIS EXISTS
// import { Button, Modal } from '../../components/common';
// import PaymentModal from '../../components/PaymentModal'; 
// import toast from 'react-hot-toast';

// const ReservationList = () => {
//   const navigate = useNavigate();
//   const [reservations, setReservations] = useState([]);
//   const [loading, setLoading] = useState(true);
  
//   // State for Payment Modal (Adding money)
//   const [selectedResForPayment, setSelectedResForPayment] = useState(null);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);

//   // State for Cancel Modal
//   const [showCancelModal, setShowCancelModal] = useState(false);
//   const [selectedRes, setSelectedRes] = useState(null);
//   const [cancelReason, setCancelReason] = useState('');

//   // State for Refund Modal (Returning money)
//   const [showRefundModal, setShowRefundModal] = useState(false);
//   const [refundablePayments, setRefundablePayments] = useState([]);
//   const [refundReason, setRefundReason] = useState('');

//   const fetchReservations = async () => {
//     try {
//       setLoading(true);
//       const response = await ReservationService.getAllReservations();
//       let list = [];
//       if (Array.isArray(response)) list = response;
//       else if (response.data) list = Array.isArray(response.data) ? response.data : (response.data.reservations || []);
//       list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
//       setReservations(list);
//     } catch (error) {
//       toast.error('Failed to load reservations');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchReservations(); }, []);

//   // --- ACTIONS ---
//   const handlePaymentClick = (res) => {
//     setSelectedResForPayment(res);
//     setShowPaymentModal(true);
//   };

//   const handleCheckIn = async (res) => {
//     const paid = Number(res.paid_amount || 0);
//     const total = Number(res.total_amount || 0);

//     if (paid < total) {
//         toast.error(`Cannot Check-In! Payment incomplete. (${paid}/${total})`);
//         return;
//     }

//     if (!window.confirm("Confirm Check-In for this guest?")) return;
//     try {
//       await ReservationService.checkIn(res.reservation_id || res.id);
//       toast.success("Guest Checked In!");
//       fetchReservations();
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Check-in failed");
//     }
//   };

//   const handleCheckOut = async (id) => {
//     if (!window.confirm("Confirm Check-Out?")) return;
//     try {
//       await ReservationService.checkOut(id);
//       toast.success("Guest Checked Out!");
//       fetchReservations();
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Check-out failed");
//     }
//   };

//   const handleCancelClick = (res) => {
//     setSelectedRes(res);
//     setShowCancelModal(true);
//   };

//   const confirmCancel = async () => {
//     try {
//       await ReservationService.cancelReservation(selectedRes.reservation_id || selectedRes.id, cancelReason);
//       toast.success("Reservation Cancelled");
//       setShowCancelModal(false);
//       setCancelReason('');
//       fetchReservations();
//     } catch (error) {
//       toast.error("Cancellation failed");
//     }
//   };

//   // --- REFUND LOGIC ---
//   const handleRefundClick = async (res) => {
//     try {
//       // Fetch payments for this specific reservation to see what can be refunded
//       const response = await PaymentService.getReservationPayments(res.reservation_id || res.id);
//       // Only show completed payments
//       const completed = (response.data || []).filter(p => p.payment_status === 'completed');
      
//       if (completed.length === 0) {
//         toast.error("No completed payments found to refund.");
//         return;
//       }

//       setRefundablePayments(completed);
//       setSelectedRes(res); // Re-using this state to know which guest we are refunding
//       setShowRefundModal(true);
//     } catch (error) {
//       console.error(error);
//       toast.error("Failed to load payments for refund");
//     }
//   };

//   const processRefund = async (paymentId, amount) => {
//     if (!refundReason) {
//       toast.error("Please enter a reason for the refund");
//       return;
//     }
//     if (!window.confirm(`Refund $${amount}? This action cannot be undone.`)) return;

//     try {
//       // FIX: Now we explicitly send the refund_amount to the backend
//       await PaymentService.processRefund(paymentId, { 
//           refund_amount: amount,
//           reason: refundReason 
//       });
      
//       toast.success("Refund Processed Successfully");
//       setShowRefundModal(false);
//       setRefundReason('');
//       fetchReservations(); // Refresh the main list to update totals
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Refund failed");
//     }
//   };

//   const getStatusColor = (status) => {
//     const s = status?.toLowerCase() || '';
//     if (s === 'confirmed') return '#4caf50'; 
//     if (s === 'checked-in') return '#2196f3';
//     if (s === 'checked-out') return '#9e9e9e'; 
//     if (s === 'cancelled') return '#f44336';
//     return '#ff9800'; 
//   };

//   return (
//     <div style={{ padding: '20px' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
//         <h1>Reservations</h1>
//         <Button variant="primary" onClick={() => navigate('/reservations/new')}>+ New Booking</Button>
//       </div>

//       <div className="card">
//         {loading ? <p>Loading bookings...</p> : (
//           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//             <thead>
//               <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
//                 <th style={{ padding: '10px' }}>ID</th>
//                 <th style={{ padding: '10px' }}>Guest</th>
//                 <th style={{ padding: '10px' }}>Room</th>
//                 <th style={{ padding: '10px' }}>Status / Payment</th>
//                 <th style={{ padding: '10px' }}>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {reservations.map(res => {
//                 const id = res.reservation_id || res.id;
//                 const status = res.status?.toLowerCase();
//                 const paidAmount = Number(res.paid_amount || 0);
//                 const totalAmount = Number(res.total_amount || 0);
//                 const isFullyPaid = paidAmount >= totalAmount;

//                 return (
//                   <tr key={id} style={{ borderBottom: '1px solid #eee' }}>
//                     <td style={{ padding: '10px' }}>#{id}</td>
//                     <td style={{ padding: '10px' }}>
//                       <strong>{res.guest_name || (res.first_name ? `${res.first_name} ${res.last_name}` : 'Unknown')}</strong>
//                       <br/><span style={{fontSize:'0.8rem', color: '#666'}}>
//                         {new Date(res.check_in_date).toLocaleDateString()} - {new Date(res.check_out_date).toLocaleDateString()}
//                       </span>
//                     </td>
//                     <td style={{ padding: '10px' }}>{res.room_number ? `Room ${res.room_number}` : 'Unassigned'}</td>
//                     <td style={{ padding: '10px' }}>
//                        <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
//                         <span style={{ 
//                             padding: '4px 8px', borderRadius: '4px', 
//                             backgroundColor: getStatusColor(status) + '20', 
//                             color: getStatusColor(status),
//                             fontWeight: 'bold', fontSize: '0.8rem',
//                             whiteSpace: 'nowrap', width: 'fit-content'
//                         }}>
//                             {status?.toUpperCase()}
//                         </span>
//                         <span style={{ fontSize: '0.75rem', color: isFullyPaid ? 'green' : 'red' }}>
//                             ${paidAmount} / ${totalAmount}
//                         </span>
//                        </div>
//                     </td>
//                     <td style={{ padding: '10px' }}>
//                       <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        
//                         {/* PAYMENT BUTTON OR PAID BADGE */}
//                         {status !== 'cancelled' && (
//                             isFullyPaid ? (
//                                 <span style={{
//                                     border: '1px solid #4caf50', color: '#4caf50', 
//                                     padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
//                                     display: 'flex', alignItems: 'center'
//                                 }}>
//                                     PAID
//                                 </span>
//                             ) : (
//                                 <button 
//                                     onClick={() => handlePaymentClick(res)} 
//                                     style={{color: '#fff', background:'#673ab7', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}
//                                 >
//                                     Pay
//                                 </button>
//                             )
//                         )}

//                         {/* CHECK-IN / CANCEL */}
//                         {status === 'confirmed' && (
//                           <>
//                             <button onClick={() => handleCheckIn(res)} style={{color: '#2196f3', border:'1px solid #2196f3', background:'white', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}>Check In</button>
//                             <button onClick={() => handleCancelClick(res)} style={{color: '#f44336', border:'none', background:'none', cursor:'pointer'}}>Cancel</button>
//                           </>
//                         )}
                        
//                         {/* CHECK-OUT */}
//                         {status === 'checked-in' && (
//                           <button onClick={() => handleCheckOut(id)} style={{color: '#fff', background:'#4caf50', border:'none', borderRadius:'4px', padding:'4px 8px', cursor:'pointer'}}>Check Out</button>
//                         )}

//                         {/* REFUND BUTTON (Only for cancelled + paid bookings) */}
//                         {status === 'cancelled' && paidAmount > 0 && (
//                            <button 
//                              onClick={() => handleRefundClick(res)}
//                              style={{color: '#fff', background:'#ff9800', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}
//                            >
//                              Refund
//                            </button>
//                         )}

//                          <button onClick={() => navigate(`/reservations/edit/${id}`)} style={{color: '#666', border:'none', background:'none', cursor:'pointer'}}>Edit</button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         )}
//       </div>

//       {/* Payment Modal (For adding money) */}
//       {selectedResForPayment && (
//           <PaymentModal 
//             isOpen={showPaymentModal} 
//             onClose={() => {
//                 setShowPaymentModal(false);
//                 fetchReservations(); // Refresh list after payment
//             }} 
//             reservation={selectedResForPayment}
//           />
//       )}

//       {/* Cancel Modal */}
//       <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Reservation">
//          <p>Are you sure you want to cancel this booking?</p>
//          <div style={{ margin: '15px 0' }}>
//             <label style={{display:'block', marginBottom:'5px'}}>Reason (Optional):</label>
//             <input 
//               type="text" 
//               className="input-field" 
//               style={{width: '100%'}}
//               value={cancelReason}
//               onChange={(e) => setCancelReason(e.target.value)}
//               placeholder="e.g. Guest request, No show"
//             />
//          </div>
//          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
//             <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Back</Button>
//             <Button variant="danger" onClick={confirmCancel}>Confirm Cancel</Button>
//          </div>
//       </Modal>

//       {/* Refund Modal - SMARTER VERSION */}
//       <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Process Refund">
//          <p>Select a payment transaction to refund for Guest: <strong>{selectedRes?.guest_name || selectedRes?.first_name}</strong></p>
         
//          <div style={{margin: '15px 0', border: '1px solid #eee', padding: '10px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto'}}>
//             {refundablePayments.map(p => (
//                 <div key={p.payment_id} style={{padding:'10px', borderBottom:'1px solid #f5f5f5', backgroundColor: '#fafafa', marginBottom: '10px'}}>
//                     <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
//                         <span style={{fontWeight:'bold'}}>Transaction #{p.payment_id}</span>
//                         <span style={{color:'green', fontWeight:'bold'}}>${p.amount}</span>
//                     </div>
//                     <div style={{fontSize:'0.85rem', color:'#666', marginBottom:'8px'}}>
//                         Method: {p.payment_method} | Date: {new Date(p.payment_date).toLocaleDateString()}
//                     </div>
                    
//                     {/* Quick Percentage Buttons */}
//                     <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
//                         <button 
//                             onClick={() => processRefund(p.payment_id, p.amount)}
//                             style={{fontSize:'0.75rem', padding:'3px 8px', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', background:'white'}}
//                         >
//                             100% (${p.amount})
//                         </button>
//                         <button 
//                             onClick={() => processRefund(p.payment_id, (p.amount * 0.5).toFixed(2))}
//                             style={{fontSize:'0.75rem', padding:'3px 8px', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', background:'white'}}
//                         >
//                             50% (${(p.amount * 0.5).toFixed(2)})
//                         </button>
//                          <button 
//                             onClick={() => {
//                                 const amount = prompt(`Enter custom refund amount (Max: $${p.amount})`);
//                                 if(amount && Number(amount) <= p.amount) processRefund(p.payment_id, amount);
//                                 else if(amount) alert("Invalid amount");
//                             }}
//                             style={{fontSize:'0.75rem', padding:'3px 8px', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', background:'white'}}
//                         >
//                             Custom Amount
//                         </button>
//                     </div>
//                 </div>
//             ))}
//          </div>

//          <div style={{ margin: '15px 0' }}>
//             <label style={{display:'block', marginBottom:'5px'}}>Refund Reason (Required):</label>
//             <input 
//               type="text" 
//               className="input-field" 
//               style={{width: '100%'}}
//               value={refundReason}
//               onChange={(e) => setRefundReason(e.target.value)}
//               placeholder="e.g. Policy: 24h Cancellation (100%)"
//             />
//          </div>
//          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//             <Button variant="secondary" onClick={() => setShowRefundModal(false)}>Close</Button>
//          </div>
//       </Modal>
//     </div>
//   );
// };

// export default ReservationList;





// // import React, { useState, useEffect } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import ReservationService from '../../services/reservationService';
// // import { Button, Modal } from '../../components/common';
// // import PaymentModal from '../../components/PaymentModal'; // Import Payment Modal
// // import toast from 'react-hot-toast';

// // const ReservationList = () => {
// //   const navigate = useNavigate();
// //   const [reservations, setReservations] = useState([]);
// //   const [loading, setLoading] = useState(true);
  
// //   // State for Payment Modal
// //   const [selectedResForPayment, setSelectedResForPayment] = useState(null);
// //   const [showPaymentModal, setShowPaymentModal] = useState(false);

// //   // State for Cancel Modal
// //   const [showCancelModal, setShowCancelModal] = useState(false);
// //   const [selectedRes, setSelectedRes] = useState(null);
// //   const [cancelReason, setCancelReason] = useState('');

// //   const fetchReservations = async () => {
// //     try {
// //       setLoading(true);
// //       const response = await ReservationService.getAllReservations();
// //       let list = [];
// //       if (Array.isArray(response)) list = response;
// //       else if (response.data) list = Array.isArray(response.data) ? response.data : (response.data.reservations || []);
// //       list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
// //       setReservations(list);
// //     } catch (error) {
// //       toast.error('Failed to load reservations');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => { fetchReservations(); }, []);

// //   // --- ACTIONS ---
// //   const handlePaymentClick = (res) => {
// //     setSelectedResForPayment(res);
// //     setShowPaymentModal(true);
// //   };

// //   const handleCheckIn = async (res) => { // Changed param to 'res' object
// //     const paid = Number(res.paid_amount || 0);
// //     const total = Number(res.total_amount || 0);

// //     // STRICT CHECK-IN: Payment must be complete
// //     if (paid < total) {
// //         toast.error(`Cannot Check-In! Payment incomplete. (${paid}/${total})`);
// //         return;
// //     }

// //     if (!window.confirm("Confirm Check-In for this guest?")) return;
// //     try {
// //       await ReservationService.checkIn(res.reservation_id || res.id);
// //       toast.success("Guest Checked In!");
// //       fetchReservations();
// //     } catch (error) {
// //       toast.error(error.response?.data?.message || "Check-in failed");
// //     }
// //   };

// //   const handleCheckOut = async (id) => {
// //     if (!window.confirm("Confirm Check-Out?")) return;
// //     try {
// //       await ReservationService.checkOut(id);
// //       toast.success("Guest Checked Out!");
// //       fetchReservations();
// //     } catch (error) {
// //       toast.error(error.response?.data?.message || "Check-out failed");
// //     }
// //   };

// //   const handleCancelClick = (res) => {
// //     setSelectedRes(res);
// //     setShowCancelModal(true);
// //   };

// //   const confirmCancel = async () => {
// //     try {
// //       await ReservationService.cancelReservation(selectedRes.reservation_id || selectedRes.id, cancelReason);
// //       toast.success("Reservation Cancelled");
// //       setShowCancelModal(false);
// //       setCancelReason('');
// //       fetchReservations();
// //     } catch (error) {
// //       toast.error("Cancellation failed");
// //     }
// //   };

// //   const getStatusColor = (status) => {
// //     const s = status?.toLowerCase() || '';
// //     if (s === 'confirmed') return '#4caf50'; 
// //     if (s === 'checked-in') return '#2196f3';
// //     if (s === 'checked-out') return '#9e9e9e'; 
// //     if (s === 'cancelled') return '#f44336';
// //     return '#ff9800'; 
// //   };

// //   return (
// //     <div style={{ padding: '20px' }}>
// //       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
// //         <h1>Reservations</h1>
// //         <Button variant="primary" onClick={() => navigate('/reservations/new')}>+ New Booking</Button>
// //       </div>

// //       <div className="card">
// //         {loading ? <p>Loading bookings...</p> : (
// //           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //             <thead>
// //               <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
// //                 <th style={{ padding: '10px' }}>ID</th>
// //                 <th style={{ padding: '10px' }}>Guest</th>
// //                 <th style={{ padding: '10px' }}>Room</th>
// //                 <th style={{ padding: '10px' }}>Status / Payment</th>
// //                 <th style={{ padding: '10px' }}>Actions</th>
// //               </tr>
// //             </thead>
// //             <tbody>
// //               {reservations.map(res => {
// //                 const id = res.reservation_id || res.id;
// //                 const status = res.status?.toLowerCase();
// //                 const paidAmount = Number(res.paid_amount || 0);
// //                 const totalAmount = Number(res.total_amount || 0);
// //                 const isFullyPaid = paidAmount >= totalAmount;

// //                 return (
// //                   <tr key={id} style={{ borderBottom: '1px solid #eee' }}>
// //                     <td style={{ padding: '10px' }}>#{id}</td>
// //                     <td style={{ padding: '10px' }}>
// //                       <strong>{res.guest_name || (res.first_name ? `${res.first_name} ${res.last_name}` : 'Unknown')}</strong>
// //                       <br/><span style={{fontSize:'0.8rem', color: '#666'}}>
// //                         {new Date(res.check_in_date).toLocaleDateString()} - {new Date(res.check_out_date).toLocaleDateString()}
// //                       </span>
// //                     </td>
// //                     <td style={{ padding: '10px' }}>{res.room_number ? `Room ${res.room_number}` : 'Unassigned'}</td>
// //                     <td style={{ padding: '10px' }}>
// //                        <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
// //                         <span style={{ 
// //                             padding: '4px 8px', borderRadius: '4px', 
// //                             backgroundColor: getStatusColor(status) + '20', 
// //                             color: getStatusColor(status),
// //                             fontWeight: 'bold', fontSize: '0.8rem',
// //                             whiteSpace: 'nowrap', width: 'fit-content'
// //                         }}>
// //                             {status?.toUpperCase()}
// //                         </span>
// //                         <span style={{ fontSize: '0.75rem', color: isFullyPaid ? 'green' : 'red' }}>
// //                             ${paidAmount} / ${totalAmount}
// //                         </span>
// //                        </div>
// //                     </td>
// //                     <td style={{ padding: '10px' }}>
// //                       <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        
// //                         {/* PAYMENT BUTTON OR PAID BADGE */}
// //                         {status !== 'cancelled' && (
// //                             isFullyPaid ? (
// //                                 <span style={{
// //                                     border: '1px solid #4caf50', color: '#4caf50', 
// //                                     padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
// //                                     display: 'flex', alignItems: 'center'
// //                                 }}>
// //                                     PAID
// //                                 </span>
// //                             ) : (
// //                                 <button 
// //                                     onClick={() => handlePaymentClick(res)} 
// //                                     style={{color: '#fff', background:'#673ab7', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}
// //                                 >
// //                                     Pay
// //                                 </button>
// //                             )
// //                         )}

// //                         {status === 'confirmed' && (
// //                           <>
// //                             <button onClick={() => handleCheckIn(res)} style={{color: '#2196f3', border:'1px solid #2196f3', background:'white', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}>Check In</button>
// //                             <button onClick={() => handleCancelClick(res)} style={{color: '#f44336', border:'none', background:'none', cursor:'pointer'}}>Cancel</button>
// //                           </>
// //                         )}
                        
// //                         {status === 'checked-in' && (
// //                           <button onClick={() => handleCheckOut(id)} style={{color: '#fff', background:'#4caf50', border:'none', borderRadius:'4px', padding:'4px 8px', cursor:'pointer'}}>Check Out</button>
// //                         )}

// //                          <button onClick={() => navigate(`/reservations/edit/${id}`)} style={{color: '#666', border:'none', background:'none', cursor:'pointer'}}>Edit</button>
// //                       </div>
// //                     </td>
// //                   </tr>
// //                 );
// //               })}
// //             </tbody>
// //           </table>
// //         )}
// //       </div>

// //       {/* Payment Modal */}
// //       {selectedResForPayment && (
// //           <PaymentModal 
// //             isOpen={showPaymentModal} 
// //             onClose={() => {
// //                 setShowPaymentModal(false);
// //                 fetchReservations(); // Refresh list after payment
// //             }} 
// //             reservation={selectedResForPayment}
// //           />
// //       )}

// //       {/* Cancel Modal */}
// //       <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Reservation">
// //          <p>Are you sure you want to cancel this booking?</p>
// //          <div style={{ margin: '15px 0' }}>
// //             <label style={{display:'block', marginBottom:'5px'}}>Reason (Optional):</label>
// //             <input 
// //               type="text" 
// //               className="input-field" 
// //               style={{width: '100%'}}
// //               value={cancelReason}
// //               onChange={(e) => setCancelReason(e.target.value)}
// //               placeholder="e.g. Guest request, No show"
// //             />
// //          </div>
// //          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
// //             <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Back</Button>
// //             <Button variant="danger" onClick={confirmCancel}>Confirm Cancel</Button>
// //          </div>
// //       </Modal>
// //     </div>
// //   );
// // };

// // export default ReservationList;







// // // import React, { useState, useEffect } from 'react';
// // // import { useNavigate } from 'react-router-dom';
// // // import ReservationService from '../../services/reservationService';
// // // import { Button, Modal } from '../../components/common';
// // // import PaymentModal from '../../components/PaymentModal'; // Import Payment Modal
// // // import toast from 'react-hot-toast';

// // // const ReservationList = () => {
// // //   const navigate = useNavigate();
// // //   const [reservations, setReservations] = useState([]);
// // //   const [loading, setLoading] = useState(true);
  
// // //   // State for Payment Modal
// // //   const [selectedResForPayment, setSelectedResForPayment] = useState(null);
// // //   const [showPaymentModal, setShowPaymentModal] = useState(false);

// // //   // State for Cancel Modal
// // //   const [showCancelModal, setShowCancelModal] = useState(false);
// // //   const [selectedRes, setSelectedRes] = useState(null);
// // //   const [cancelReason, setCancelReason] = useState('');

// // //   const fetchReservations = async () => {
// // //     try {
// // //       setLoading(true);
// // //       const response = await ReservationService.getAllReservations();
// // //       let list = [];
// // //       if (Array.isArray(response)) list = response;
// // //       else if (response.data) list = Array.isArray(response.data) ? response.data : (response.data.reservations || []);
// // //       list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
// // //       setReservations(list);
// // //     } catch (error) {
// // //       toast.error('Failed to load reservations');
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   useEffect(() => { fetchReservations(); }, []);

// // //   // --- ACTIONS ---
// // //   const handlePaymentClick = (res) => {
// // //     setSelectedResForPayment(res);
// // //     setShowPaymentModal(true);
// // //   };

// // //   const handleCheckIn = async (id) => {
// // //     if (!window.confirm("Confirm Check-In for this guest?")) return;
// // //     try {
// // //       await ReservationService.checkIn(id);
// // //       toast.success("Guest Checked In!");
// // //       fetchReservations();
// // //     } catch (error) {
// // //       toast.error(error.response?.data?.message || "Check-in failed");
// // //     }
// // //   };

// // //   const handleCheckOut = async (id) => {
// // //     if (!window.confirm("Confirm Check-Out?")) return;
// // //     try {
// // //       await ReservationService.checkOut(id);
// // //       toast.success("Guest Checked Out!");
// // //       fetchReservations();
// // //     } catch (error) {
// // //       toast.error(error.response?.data?.message || "Check-out failed");
// // //     }
// // //   };

// // //   const handleCancelClick = (res) => {
// // //     setSelectedRes(res);
// // //     setShowCancelModal(true);
// // //   };

// // //   const confirmCancel = async () => {
// // //     try {
// // //       await ReservationService.cancelReservation(selectedRes.reservation_id || selectedRes.id, cancelReason);
// // //       toast.success("Reservation Cancelled");
// // //       setShowCancelModal(false);
// // //       setCancelReason('');
// // //       fetchReservations();
// // //     } catch (error) {
// // //       toast.error("Cancellation failed");
// // //     }
// // //   };

// // //   const getStatusColor = (status) => {
// // //     const s = status?.toLowerCase() || '';
// // //     if (s === 'confirmed') return '#4caf50'; 
// // //     if (s === 'checked-in') return '#2196f3';
// // //     if (s === 'checked-out') return '#9e9e9e'; 
// // //     if (s === 'cancelled') return '#f44336';
// // //     return '#ff9800'; 
// // //   };

// // //   return (
// // //     <div style={{ padding: '20px' }}>
// // //       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
// // //         <h1>Reservations</h1>
// // //         <Button variant="primary" onClick={() => navigate('/reservations/new')}>+ New Booking</Button>
// // //       </div>

// // //       <div className="card">
// // //         {loading ? <p>Loading bookings...</p> : (
// // //           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// // //             <thead>
// // //               <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
// // //                 <th style={{ padding: '10px' }}>ID</th>
// // //                 <th style={{ padding: '10px' }}>Guest</th>
// // //                 <th style={{ padding: '10px' }}>Room</th>
// // //                 <th style={{ padding: '10px' }}>Status</th>
// // //                 <th style={{ padding: '10px' }}>Actions</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody>
// // //               {reservations.map(res => {
// // //                 const id = res.reservation_id || res.id;
// // //                 const status = res.status?.toLowerCase();

// // //                 return (
// // //                   <tr key={id} style={{ borderBottom: '1px solid #eee' }}>
// // //                     <td style={{ padding: '10px' }}>#{id}</td>
// // //                     <td style={{ padding: '10px' }}>
// // //                       <strong>{res.guest_name || (res.first_name ? `${res.first_name} ${res.last_name}` : 'Unknown')}</strong>
// // //                       <br/><span style={{fontSize:'0.8rem', color: '#666'}}>
// // //                         {new Date(res.check_in_date).toLocaleDateString()} - {new Date(res.check_out_date).toLocaleDateString()}
// // //                       </span>
// // //                     </td>
// // //                     <td style={{ padding: '10px' }}>{res.room_number ? `Room ${res.room_number}` : 'Unassigned'}</td>
// // //                     <td style={{ padding: '10px' }}>
// // //                        <span style={{ 
// // //                         padding: '4px 8px', borderRadius: '4px', 
// // //                         backgroundColor: getStatusColor(status) + '20', 
// // //                         color: getStatusColor(status),
// // //                         fontWeight: 'bold', fontSize: '0.8rem',
// // //                         whiteSpace: 'nowrap'
// // //                       }}>
// // //                         {status?.toUpperCase()}
// // //                       </span>
// // //                     </td>
// // //                     <td style={{ padding: '10px' }}>
// // //                       <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        
// // //                         {/* PAYMENT BUTTON (Always visible for active bookings) */}
// // //                         {status !== 'cancelled' && (
// // //                             <button 
// // //                                 onClick={() => handlePaymentClick(res)} 
// // //                                 style={{color: '#fff', background:'#673ab7', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}
// // //                             >
// // //                                 Pay
// // //                             </button>
// // //                         )}

// // //                         {status === 'confirmed' && (
// // //                           <>
// // //                             <button onClick={() => handleCheckIn(id)} style={{color: '#2196f3', border:'1px solid #2196f3', background:'white', borderRadius:'4px', padding:'2px 8px', cursor:'pointer'}}>Check In</button>
// // //                             <button onClick={() => handleCancelClick(res)} style={{color: '#f44336', border:'none', background:'none', cursor:'pointer'}}>Cancel</button>
// // //                           </>
// // //                         )}
                        
// // //                         {status === 'checked-in' && (
// // //                           <button onClick={() => handleCheckOut(id)} style={{color: '#fff', background:'#4caf50', border:'none', borderRadius:'4px', padding:'4px 8px', cursor:'pointer'}}>Check Out</button>
// // //                         )}

// // //                          <button onClick={() => navigate(`/reservations/edit/${id}`)} style={{color: '#666', border:'none', background:'none', cursor:'pointer'}}>Edit</button>
// // //                       </div>
// // //                     </td>
// // //                   </tr>
// // //                 );
// // //               })}
// // //             </tbody>
// // //           </table>
// // //         )}
// // //       </div>

// // //       {/* Payment Modal */}
// // //       {selectedResForPayment && (
// // //           <PaymentModal 
// // //             isOpen={showPaymentModal} 
// // //             onClose={() => setShowPaymentModal(false)} 
// // //             reservation={selectedResForPayment}
// // //           />
// // //       )}

// // //       {/* Cancel Modal */}
// // //       <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Reservation">
// // //          <p>Are you sure you want to cancel this booking?</p>
// // //          <div style={{ margin: '15px 0' }}>
// // //             <label style={{display:'block', marginBottom:'5px'}}>Reason (Optional):</label>
// // //             <input 
// // //               type="text" 
// // //               className="input-field" 
// // //               style={{width: '100%'}}
// // //               value={cancelReason}
// // //               onChange={(e) => setCancelReason(e.target.value)}
// // //               placeholder="e.g. Guest request, No show"
// // //             />
// // //          </div>
// // //          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
// // //             <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Back</Button>
// // //             <Button variant="danger" onClick={confirmCancel}>Confirm Cancel</Button>
// // //          </div>
// // //       </Modal>
// // //     </div>
// // //   );
// // // };

// // // export default ReservationList;



