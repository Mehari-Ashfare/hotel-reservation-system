import React, { useState, useEffect } from 'react';
import AuditService from '../../services/auditService';
import { Paper, Typography, Chip, Box, Collapse } from '@mui/material';
import { Input, Button } from '../../components/common';
import toast from 'react-hot-toast';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

// Sub-component for a single row (to handle the "Expand Details" logic)
const AuditRow = ({ log }) => {
  const [open, setOpen] = useState(false);

  const getActionColor = (action) => {
    switch(action?.toUpperCase()) {
      case 'CREATE': return 'success';
      case 'INSERT': return 'success';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'error';
      case 'CHECK_IN': return 'primary';
      case 'CHECK_OUT': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <tr style={{ borderBottom: '1px solid #eee', backgroundColor: open ? '#f8f9fa' : 'white' }}>
        <td style={{ padding: '12px' }}>{new Date(log.timestamp || log.created_at).toLocaleString()}</td>
        <td style={{ padding: '12px' }}>
          <strong>{log.user_name || 'System'}</strong>
          <br/>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>{log.ip_address || 'Unknown IP'}</span>
        </td>
        <td style={{ padding: '12px' }}>
          <Chip label={log.action} color={getActionColor(log.action)} size="small" variant="outlined" />
        </td>
        <td style={{ padding: '12px', fontWeight: 'bold', color: '#555' }}>
          {(log.table_name || '').toUpperCase()} #{log.record_id}
        </td>
        <td style={{ padding: '12px', textAlign: 'center' }}>
          <button 
            onClick={() => setOpen(!open)}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: '#1976d2', display: 'flex', alignItems: 'center', gap: '5px' 
            }}
          >
            {open ? <KeyboardArrowUp/> : <KeyboardArrowDown/>} {open ? 'Hide' : 'View'}
          </button>
        </td>
      </tr>
      <tr>
        <td colSpan="5" style={{ padding: 0, borderBottom: open ? '1px solid #ddd' : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, padding: 2, backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #eee' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {log.old_values && (
                    <div>
                      <Typography variant="subtitle2" color="error">Old Values:</Typography>
                      <pre style={{ fontSize: '0.75rem', background: '#ffebee', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
                        {JSON.stringify(log.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div>
                      <Typography variant="subtitle2" color="success">New Values:</Typography>
                      <pre style={{ fontSize: '0.75rem', background: '#e8f5e9', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
               </div>
               {!log.old_values && !log.new_values && (
                 <Typography variant="body2" color="text.secondary">No detailed changes recorded for this action.</Typography>
               )}
            </Box>
          </Collapse>
        </td>
      </tr>
    </>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    table_name: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await AuditService.getLogs({ ...filters, page });
      
      // Handle the specific structure { data: { auditLogs: [], pagination: {} } }
      if (res.success && res.data) {
        setLogs(res.data.auditLogs || []);
        setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 });
      }
    } catch (error) {
      if(error.response && error.response.status === 403) {
        toast.error("Access Denied: Admin only");
      } else {
        console.error(error);
        toast.error("Failed to load logs");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a237e' }}>
        System Audit Logs
      </Typography>

      {/* SEARCH FILTERS */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
             <Input label="Action" name="action" value={filters.action} onChange={handleFilterChange} placeholder="e.g. UPDATE" />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
             <Input label="Table" name="table_name" value={filters.table_name} onChange={handleFilterChange} placeholder="e.g. payments" />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
             <Input label="Start Date" type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
          </div>
           <div style={{ flex: 1, minWidth: '150px' }}>
             <Input label="End Date" type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
          </div>
          <div style={{ paddingBottom: '2px' }}>
             <Button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
          </div>
        </form>
      </Paper>

      {/* DATA TABLE */}
      <Paper sx={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>User</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Target</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center' }}>Loading logs...</td></tr>
            ) : logs.length > 0 ? (
               logs.map(log => <AuditRow key={log.audit_id} log={log} />)
            ) : (
               <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>No logs found matching criteria.</td></tr>
            )}
          </tbody>
        </table>
      </Paper>

      {/* PAGINATION */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
          <button 
            disabled={pagination.page <= 1} 
            onClick={() => fetchLogs(pagination.page - 1)}
            style={{ padding: '8px 16px', cursor: 'pointer', opacity: pagination.page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.9rem' }}>Page {pagination.page} of {pagination.totalPages || pagination.pages}</span>
          <button 
            disabled={pagination.page >= (pagination.totalPages || pagination.pages)} 
            onClick={() => fetchLogs(pagination.page + 1)}
            style={{ padding: '8px 16px', cursor: 'pointer', opacity: pagination.page >= (pagination.totalPages || pagination.pages) ? 0.5 : 1 }}
          >
            Next
          </button>
      </div>
    </div>
  );
};

export default AuditLogs;
