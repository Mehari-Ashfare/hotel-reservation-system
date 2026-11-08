import React, { useState, useEffect } from 'react';
import StaffService from '../../services/staffService';
import { Button, Modal, Input } from '../../components/common';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Paper, Grid, Typography, TextField } from '@mui/material';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const { user } = useAuth(); 

  // Search State
  const [search, setSearch] = useState('');

  // REMOVED 'username' from initial state
  const [formData, setFormData] = useState({
    email: '', password: '', 
    first_name: '', last_name: '', phone: '', address: '',
    role: 'receptionist', position: 'Front Desk',
    department: '',
    is_active: 'true', 
    sex: '' 
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // UPDATED: Pass search param
      const [listData, statsData] = await Promise.all([
        StaffService.getAllStaff(1, 20, search),
        StaffService.getDepartmentStats()
      ]);

      let list = [];
      if (Array.isArray(listData)) list = listData;
      else if (listData.data) list = Array.isArray(listData.data) ? listData.data : (listData.data.staff || []);
      else if (listData.staff) list = listData.staff;
      setStaff(list);

      let statsArr = [];
      if (Array.isArray(statsData)) statsArr = statsData;
      else if (statsData.data) statsArr = statsData.data;
      setStats(statsArr);

    } catch (error) {
      toast.error("Failed to load staff data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Search Handler
  const handleSearchClick = () => {
    fetchData();
  };

  const handleAddClick = () => {
    setIsEditing(false);
    // REMOVED username from reset
    setFormData({
      email: '', password: '', 
      first_name: '', last_name: '', phone: '', address: '',
      role: 'receptionist', position: 'Front Desk', department: '',
      is_active: 'true',
      sex: '' 
    });
    setShowModal(true);
  };

  const handleEditClick = (employee) => {
    setIsEditing(true);
    setCurrentId(employee.staff_id || employee.id);
    
    let roleValue = employee.role || employee.role_name || 'receptionist';
    roleValue = roleValue.toLowerCase();
    if (roleValue !== 'admin' && roleValue !== 'receptionist') roleValue = 'receptionist';

    // REMOVED username from edit mapping
    setFormData({
      password: '', // Password is usually not editable directly here for security
      email: employee.user_email || employee.email || '', 
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      phone: employee.phone || '',
      address: employee.address || '',
      role: roleValue,
      position: employee.position || '',
      department: employee.department || '',
      is_active: employee.is_active ? 'true' : 'false',
      sex: employee.sex || '' 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // FIX: Force backend to see email as username
      const payload = { 
        ...formData, 
        is_active: formData.is_active === 'true',
        username: formData.email 
      };
      
      if (isEditing) {
        // Remove sensitive fields on update
        const { password, username, ...updatePayload } = payload; 
        await StaffService.updateStaff(currentId, updatePayload);
        toast.success("Staff updated successfully!");
      } else {
        await StaffService.createStaff(payload);
        toast.success("Staff member created!");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Operation failed";
      toast.error(msg);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Staff Management</h1>
        <Button onClick={handleAddClick}>+ Add Staff</Button>
      </div>

      {stats.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #1976d2' }}>
                <Typography variant="subtitle2" color="text.secondary">{stat.department || 'General'}</Typography>
                <Typography variant="h4" fontWeight="bold">{stat.count}</Typography>
                <Typography variant="caption" color="green">{stat.active_count} Active</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* SEARCH BAR SECTION */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
        <TextField
          fullWidth
          placeholder="Search staff by Name, Email, or Phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="outlined"
          size="small"
          onKeyPress={(e) => e.key === 'Enter' && handleSearchClick()}
        />
        <Button onClick={handleSearchClick} style={{ height: '40px', minWidth: '100px' }}>
          Search
        </Button>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Name</th>
              <th style={{ padding: '10px' }}>Contact</th>
              <th style={{ padding: '10px' }}>Role</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Sex</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(emp => (
              <tr key={emp.user_id || emp.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  <strong>{emp.first_name} {emp.last_name}</strong><br/>
                  <small>{emp.position}</small>
                </td>
                <td style={{ padding: '10px' }}>{emp.user_email || emp.email}<br/><small>{emp.phone || 'No phone'}</small></td>
                <td style={{ padding: '10px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize',
                    backgroundColor: (emp.role === 'admin' || emp.role_name === 'admin') ? '#e3f2fd' : '#f5f5f5',
                    color: (emp.role === 'admin' || emp.role_name === 'admin') ? '#1976d2' : '#666'
                  }}>
                    {emp.role_name || emp.role || 'Staff'}
                  </span>
                </td>
                <td style={{ padding: '10px', fontWeight: 'bold', color: emp.is_active ? 'green' : 'red' }}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </td>
                <td style={{ padding: '10px' }}>{emp.sex || '-'}</td>
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={() => handleEditClick(emp)}
                    style={{ color: '#1976d2', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Staff" : "Add New Staff"}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
            <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
          </div>
          
          {/* UPDATED: Labeled as 'Email (Login ID)' and NO Username field anymore */}
          <Input label="Email (Login ID)" type="email" name="email" value={formData.email} onChange={handleChange} required />
          
          {/* Only show password field when CREATING new staff */}
          {!isEditing && (
            <Input label="Initial Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
              
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Sex</label>
                <select name="sex" value={formData.sex} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}} required>
                  <option value="">Select Sex</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
          </div>
          
          <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div className="input-group">
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>System Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}}>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Admin</option>
                </select>
            </div>
            <div className="input-group">
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Status</label>
                <select name="is_active" value={formData.is_active} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}}>
                  <option value="true">Active</option>
                  <option value="false">Inactive (Block Login)</option>
                </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Input label="Department" name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Front Office" />
            <Input label="Job Position" name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Manager" />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{isEditing ? "Update Staff" : "Create Staff"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffList;






// import React, { useState, useEffect } from 'react';
// import StaffService from '../../services/staffService';
// import { Button, Modal, Input } from '../../components/common';
// import toast from 'react-hot-toast';
// import { useAuth } from '../../hooks/useAuth';
// import { Paper, Grid, Typography, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

// const StaffList = () => {
//   const [staff, setStaff] = useState([]);
//   const [stats, setStats] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);
//   const [currentId, setCurrentId] = useState(null);
//   const { user } = useAuth(); 

//   const [formData, setFormData] = useState({
//     username: '', email: '', password: '', 
//     first_name: '', last_name: '', phone: '', address: '',
//     role: 'receptionist', position: 'Front Desk',
//     department: '',
//     is_active: 'true', // Added Status Field (String for dropdown)
//     sex: '' // Added Sex Field
//   });

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       const [listData, statsData] = await Promise.all([
//         StaffService.getAllStaff(),
//         StaffService.getDepartmentStats()
//       ]);

//       let list = [];
//       if (Array.isArray(listData)) list = listData;
//       else if (listData.data) list = Array.isArray(listData.data) ? listData.data : (listData.data.staff || []);
//       else if (listData.staff) list = listData.staff;
//       setStaff(list);

//       let statsArr = [];
//       if (Array.isArray(statsData)) statsArr = statsData;
//       else if (statsData.data) statsArr = statsData.data;
//       setStats(statsArr);

//     } catch (error) {
//       toast.error("Failed to load staff data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchData(); }, []);

//   const handleAddClick = () => {
//     setIsEditing(false);
//     setFormData({
//       username: '', email: '', password: '', 
//       first_name: '', last_name: '', phone: '', address: '',
//       role: 'receptionist', position: 'Front Desk', department: '',
//       is_active: 'true',
//       sex: '' // Reset sex
//     });
//     setShowModal(true);
//   };

//   const handleEditClick = (employee) => {
//     setIsEditing(true);
//     setCurrentId(employee.staff_id || employee.id);
    
//     let roleValue = employee.role || employee.role_name || 'receptionist';
//     roleValue = roleValue.toLowerCase();
//     if (roleValue !== 'admin' && roleValue !== 'receptionist') roleValue = 'receptionist';

//     setFormData({
//       username: '', password: '', 
//       email: employee.user_email || employee.email || '', // FIX: Use user_email
//       first_name: employee.first_name || '',
//       last_name: employee.last_name || '',
//       phone: employee.phone || '',
//       address: employee.address || '',
//       role: roleValue,
//       position: employee.position || '',
//       department: employee.department || '',
//       // Convert boolean to string for dropdown
//       is_active: employee.is_active ? 'true' : 'false',
//       sex: employee.sex || '' // Load sex
//     });
//     setShowModal(true);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       // Convert 'true'/'false' string back to boolean
//       const payload = { ...formData, is_active: formData.is_active === 'true' };
      
//       if (isEditing) {
//         const { password, username, ...updatePayload } = payload; 
//         await StaffService.updateStaff(currentId, updatePayload);
//         toast.success("Staff updated successfully!");
//       } else {
//         await StaffService.createStaff(payload);
//         toast.success("Staff member created!");
//       }
//       setShowModal(false);
//       fetchData();
//     } catch (error) {
//       const msg = error.response?.data?.message || error.message || "Operation failed";
//       toast.error(msg);
//     }
//   };

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   return (
//     <div style={{ padding: '20px' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
//         <h1>Staff Management</h1>
//         <Button onClick={handleAddClick}>+ Add Staff</Button>
//       </div>

//       {stats.length > 0 && (
//         <Grid container spacing={2} sx={{ mb: 4 }}>
//           {stats.map((stat, index) => (
//             <Grid item xs={12} sm={6} md={3} key={index}>
//               <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #1976d2' }}>
//                 <Typography variant="subtitle2" color="text.secondary">{stat.department || 'General'}</Typography>
//                 <Typography variant="h4" fontWeight="bold">{stat.count}</Typography>
//                 <Typography variant="caption" color="green">{stat.active_count} Active</Typography>
//               </Paper>
//             </Grid>
//           ))}
//         </Grid>
//       )}

//       <div className="card">
//         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//           <thead>
//             <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
//               <th style={{ padding: '10px' }}>Name</th>
//               <th style={{ padding: '10px' }}>Contact</th>
//               <th style={{ padding: '10px' }}>Role</th>
//               <th style={{ padding: '10px' }}>Status</th>
//               <th style={{ padding: '10px' }}>Sex</th> {/* ADDED */}
//               <th style={{ padding: '10px' }}>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {staff.map(emp => (
//               <tr key={emp.user_id || emp.id} style={{ borderBottom: '1px solid #eee' }}>
//                 <td style={{ padding: '10px' }}>
//                   <strong>{emp.first_name} {emp.last_name}</strong><br/>
//                   <small>{emp.position}</small>
//                 </td>
//                 <td style={{ padding: '10px' }}>{emp.user_email || emp.email}<br/><small>{emp.phone || 'No phone'}</small></td>
//                 <td style={{ padding: '10px' }}>
//                   <span style={{ 
//                     padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize',
//                     backgroundColor: (emp.role === 'admin' || emp.role_name === 'admin') ? '#e3f2fd' : '#f5f5f5',
//                     color: (emp.role === 'admin' || emp.role_name === 'admin') ? '#1976d2' : '#666'
//                   }}>
//                     {emp.role_name || emp.role || 'Staff'}
//                   </span>
//                 </td>
//                 <td style={{ padding: '10px', fontWeight: 'bold', color: emp.is_active ? 'green' : 'red' }}>
//                   {emp.is_active ? 'Active' : 'Inactive'}
//                 </td>
//                 <td style={{ padding: '10px' }}>{emp.sex || '-'}</td> {/* ADDED */}
//                 <td style={{ padding: '10px' }}>
//                   <button 
//                     onClick={() => handleEditClick(emp)}
//                     style={{ color: '#1976d2', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
//                   >
//                     Edit
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Staff" : "Add New Staff"}>
//         <form onSubmit={handleSubmit}>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
//             <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
//             <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
//           </div>
//           <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
          
//           {!isEditing && (
//             <>
//               <Input label="Username" name="username" value={formData.username} onChange={handleChange} required={!isEditing} />
//               <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required={!isEditing} />
//             </>
//           )}

//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
//               <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
              
//               {/* SEX DROPDOWN */}
//               <div className="input-group">
//                 <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Sex</label>
//                 <select name="sex" value={formData.sex} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}} required>
//                   <option value="">Select Sex</option>
//                   <option value="M">Male</option>
//                   <option value="F">Female</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>
//           </div>
          
//           <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
          
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
//             <div className="input-group">
//                 <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>System Role</label>
//                 <select name="role" value={formData.role} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}}>
//                   <option value="receptionist">Receptionist</option>
//                   <option value="admin">Admin</option>
//                 </select>
//             </div>
//             {/* === NEW STATUS FIELD === */}
//             <div className="input-group">
//                 <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Status</label>
//                 <select name="is_active" value={formData.is_active} onChange={handleChange} className="input-field" style={{width: '100%', padding: '8px'}}>
//                   <option value="true">Active</option>
//                   <option value="false">Inactive (Block Login)</option>
//                 </select>
//             </div>
//           </div>
          
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
//             <Input label="Department" name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Front Office" />
//             <Input label="Job Position" name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Manager" />
//           </div>

//           <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
//             <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
//             <Button type="submit">{isEditing ? "Update Staff" : "Create Staff"}</Button>
//           </div>
//         </form>
//       </Modal>
//     </div>
//   );
// };

// export default StaffList;

