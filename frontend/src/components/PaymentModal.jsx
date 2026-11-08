import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from './common';
import PaymentService from '../services/paymentService';
import toast from 'react-hot-toast';

const PaymentModal = ({ isOpen, onClose, reservation, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ total_paid: 0 });
  
  // Payment Form
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && reservation) {
      fetchData();
    }
  }, [isOpen, reservation]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resId = reservation.reservation_id || reservation.id;
      
      const listRes = await PaymentService.getPayments({ reservation_id: resId });
      setHistory(listRes.data?.payments || listRes.data || []);

      const sumRes = await PaymentService.getPaymentSummary(resId);
      const sumData = sumRes.data || { total_paid: 0 };
      setSummary(sumData);
      
      const cost = parseFloat(reservation.total_amount || 0);
      const paid = parseFloat(sumData.total_paid || 0);
      const remaining = Math.max(0, cost - paid);
      setAmount(remaining > 0 ? remaining.toString() : '');

    } catch (error) {
      console.error("Load payment error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const resId = reservation.reservation_id || reservation.id;
      
      const res = await PaymentService.createPayment({
        reservation_id: resId,
        amount: parseFloat(amount),
        payment_method: method,
        notes: notes
      });

      if (res.success && res.data?.payment_id) {
          await PaymentService.processPayment(res.data.payment_id);
      }

      toast.success("Payment Recorded!");
      setAmount('');
      fetchData(); 
      if(onPaymentSuccess) onPaymentSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (payment) => {
    const reason = window.prompt("Enter reason for refund:");
    if (!reason) return;

    if (!window.confirm(`Are you sure you want to refund $${payment.amount}?`)) return;

    try {
        setLoading(true);
        await PaymentService.processRefund(payment.payment_id, payment.amount, reason);
        toast.success("Refund Processed");
        fetchData();
        if(onPaymentSuccess) onPaymentSuccess();
    } catch (error) {
        toast.error(error.response?.data?.message || "Refund failed");
    } finally {
        setLoading(false);
    }
  };

  if (!reservation) return null;

  const totalCost = parseFloat(reservation.total_amount || 0);
  const totalPaid = parseFloat(summary.total_paid || 0);
  const balance = totalCost - totalPaid;
  const isFullyPaid = balance <= 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payments - Room ${reservation.room_number || '?'}`}>
      
      {/* SUMMARY */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Cost</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${totalCost.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Paid</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'green' }}>${totalPaid.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Balance Due</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: balance > 0 ? 'red' : 'green' }}>
                {balance >= 0 ? `$${balance.toLocaleString()}` : `(Credit $${Math.abs(balance).toLocaleString()})`}
              </div>
          </div>
      </div>

      {/* FORM */}
      {!isFullyPaid ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
            <h4>Add New Payment</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input 
                  label="Amount ($)" type="number" value={amount} 
                  onChange={(e) => setAmount(e.target.value)} required 
                />
                <div className="input-group">
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Method</label>
                    <select 
                      className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}
                      style={{ width: '100%', padding: '10px' }}
                    >
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                    </select>
                </div>
            </div>
            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Receipt #1234" />
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <Button type="submit" disabled={loading}>{loading ? "Processing..." : "Record Payment"}</Button>
            </div>
        </form>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>✅ Payment Complete</h3>
        </div>
      )}

      {/* HISTORY TABLE WITH REFUND BUTTON */}
      <div>
          <h4>Payment History</h4>
          {history.length === 0 ? <p style={{color:'#999'}}>No payments yet.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                          <th style={{ padding: '8px' }}>Date</th>
                          <th style={{ padding: '8px' }}>Method</th>
                          <th style={{ padding: '8px' }}>Status</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px' }}></th>
                      </tr>
                  </thead>
                  <tbody>
                      {history.map(pay => (
                          <tr key={pay.payment_id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                              <td style={{ padding: '8px' }}>{new Date(pay.payment_date || pay.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: '8px', textTransform: 'capitalize' }}>{pay.payment_method.replace('_', ' ')}</td>
                              <td style={{ padding: '8px' }}>
                                  <span style={{ 
                                      padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem',
                                      backgroundColor: pay.payment_status === 'completed' ? '#e8f5e9' : '#ffebee',
                                      color: pay.payment_status === 'completed' ? 'green' : 'red'
                                  }}>
                                      {pay.payment_status}
                                  </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>${parseFloat(pay.amount).toFixed(2)}</td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                  {pay.payment_status === 'completed' && (
                                      <button 
                                        onClick={() => handleRefund(pay)}
                                        style={{ color: 'red', border: '1px solid red', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.7rem' }}
                                      >
                                          Refund
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default PaymentModal;
