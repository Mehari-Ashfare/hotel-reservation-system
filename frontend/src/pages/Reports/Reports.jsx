import React, { useState } from 'react';
import { Button, Input } from '../../components/common';
import apiClient from '../../services/api';
import toast from 'react-hot-toast';
import { Paper, Typography, Grid } from '@mui/material';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  
  const today = new Date().toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({
    start_date: today,
    end_date: today
  });

  // --- QUICK DATE HELPERS ---
  const setToday = () => {
     setDateRange({ start_date: today, end_date: today });
  };

  const setThisWeek = () => {
     const d = new Date();
     const day = d.getDay();
     const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
     const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
     setDateRange({ start_date: monday, end_date: today });
  };

  const setThisMonth = () => {
     const d = new Date();
     const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
     setDateRange({ start_date: firstDay, end_date: today });
  };
  // ---------------------------

  const fetchReport = async (e) => {
    if(e) e.preventDefault();
    try {
      setLoading(true);
      const response = await apiClient.get('/payments/financial-report', { 
        params: dateRange 
      });
      setData(response.data.data || []);
      if(response.data.data.length === 0) toast("No transactions found.");
    } catch (error) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  const totalRefunds = data.reduce((sum, item) => sum + parseFloat(item.total_refunds || 0), 0);
  const netIncome = totalRevenue - totalRefunds;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Financial Reports</h1>

      <Paper sx={{ p: 3, mb: 3 }}>
        {/* QUICK BUTTONS */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <button onClick={setToday} style={{ padding: '5px 10px', cursor: 'pointer' }}>Today</button>
            <button onClick={setThisWeek} style={{ padding: '5px 10px', cursor: 'pointer' }}>This Week</button>
            <button onClick={setThisMonth} style={{ padding: '5px 10px', cursor: 'pointer' }}>This Month</button>
        </div>

        <form onSubmit={fetchReport} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
                <Input label="Start Date" type="date" value={dateRange.start_date} onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})} required />
            </div>
            <div style={{ flex: 1 }}>
                <Input label="End Date" type="date" value={dateRange.end_date} onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})} required />
            </div>
            <div style={{ paddingBottom: '2px' }}>
                <Button type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</Button>
            </div>
        </form>
      </Paper>

      {/* SUMMARY */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderLeft: '5px solid #4caf50', bgcolor: '#f1f8e9' }}>
                  <Typography color="text.secondary">Total Revenue</Typography>
                  <Typography variant="h4" fontWeight="bold">ETB {totalRevenue.toLocaleString()}</Typography>
              </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderLeft: '5px solid #f44336', bgcolor: '#ffebee' }}>
                  <Typography color="text.secondary">Total Refunds</Typography>
                  <Typography variant="h4" fontWeight="bold">ETB {totalRefunds.toLocaleString()}</Typography>
              </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderLeft: '5px solid #2196f3', bgcolor: '#e3f2fd' }}>
                  <Typography color="text.secondary">Net Income</Typography>
                  <Typography variant="h4" fontWeight="bold">ETB {netIncome.toLocaleString()}</Typography>
              </Paper>
          </Grid>
      </Grid>

      {/* DATA TABLE */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f5f5f5' }}>
                  <tr>
                      <th style={{ padding: '15px' }}>Date</th>
                      <th style={{ padding: '15px' }}>Method</th>
                      <th style={{ padding: '15px' }}>Transactions</th>
                      <th style={{ padding: '15px', textAlign: 'right' }}>Collected</th>
                      <th style={{ padding: '15px', textAlign: 'right' }}>Refunded</th>
                  </tr>
              </thead>
              <tbody>
                  {data.length > 0 ? data.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px' }}>{new Date(row.payment_date).toLocaleDateString()}</td>
                          <td style={{ padding: '15px', textTransform: 'capitalize' }}>{row.payment_method?.replace('_', ' ')}</td>
                          <td style={{ padding: '15px' }}>{row.transaction_count}</td>
                          <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: 'green' }}>ETB {parseFloat(row.total_amount).toFixed(2)}</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: 'red' }}>ETB {parseFloat(row.total_refunds || 0).toFixed(2)}</td>
                      </tr>
                  )) : (
                      <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>No data found for selected range.</td></tr>
                  )}
              </tbody>
          </table>
      </Paper>
    </div>
  );
};

export default Reports;
