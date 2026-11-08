import React, { useEffect, useState } from 'react';
import DashboardService from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext'; // Import Auth Context
import { 
  Grid, Paper, Typography, Box, CircularProgress, Card, CardContent 
} from '@mui/material';
import { 
  AttachMoney, Hotel, Person, MeetingRoom 
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const { user } = useAuth(); // Get current user info
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    activeGuests: 0,
    rooms: { available: 0, occupied: 0, maintenance: 0, total: 0 },
    occupancyRate: 0,
    totalRevenue: 0,
    arrivalsToday: 0
  });
  const [revenueData, setRevenueData] = useState([]);

  // Check if user is admin (handles both role formats)
  const isAdmin = user?.role === 'admin' || user?.role_name === 'admin';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sumRes, revRes] = await Promise.all([
          DashboardService.getSummary(),
          DashboardService.getRevenueChart()
        ]);
        setSummary(sumRes.data);
        setRevenueData(revRes.data);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  // --- CHART CONFIGURATION ---
  const barChartData = {
    labels: revenueData.map(d => d.month),
    datasets: [{
      label: 'Monthly Revenue ($)',
      data: revenueData.map(d => d.revenue),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
    }],
  };

  const doughnutData = {
    labels: ['Available', 'Occupied', 'Maintenance'],
    datasets: [{
      data: [summary.rooms.available, summary.rooms.occupied, summary.rooms.maintenance],
      backgroundColor: ['#2e7d32', '#d32f2f', '#ed6c02'], // Green, Red, Orange
      borderWidth: 1,
    }],
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 'bold' }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </div>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color: color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1a237e' }}>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* REVENUE CARD - ONLY FOR ADMIN */}
        {isAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Total Revenue" 
              value={`ETB ${summary.totalRevenue.toLocaleString()}`} 
              icon={<AttachMoney fontSize="large" />} 
              color="#1976d2" 
            />
          </Grid>
        )}

        {/* Adjust grid size if Revenue is hidden (md=4 instead of md=3) */}
        <Grid item xs={12} sm={6} md={isAdmin ? 3 : 4}>
          <StatCard title="Occupancy Rate" value={`${summary.occupancyRate}%`} icon={<Hotel fontSize="large" />} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={isAdmin ? 3 : 4}>
          <StatCard title="Active Guests" value={summary.activeGuests} icon={<Person fontSize="large" />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={isAdmin ? 3 : 4}>
          <StatCard title="Arrivals Today" value={summary.arrivalsToday} icon={<MeetingRoom fontSize="large" />} color="#9c27b0" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* REVENUE CHART - ONLY FOR ADMIN */}
        {isAdmin ? (
          <>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: '400px', boxShadow: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Revenue Analytics</Typography>
                <Box sx={{ height: '300px' }}>
                  <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '400px', boxShadow: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Room Status</Typography>
                <Box sx={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
                </Box>
              </Paper>
            </Grid>
          </>
        ) : (
          /* RECEPTIONIST VIEW - Full Width Room Status or Grid layout */
          <Grid item xs={12}>
             <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: '400px', boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Room Status Overview</Typography>
                    <Box sx={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                      <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </Box>
                  </Paper>
                </Grid>
                {/* We could add a 'Recent Arrivals' list here for receptionists later */}
                <Grid item xs={12} md={6}>
                   <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
                      <Typography color="textSecondary">
                        Recent Arrivals module coming soon...
                      </Typography>
                   </Paper>
                </Grid>
             </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;


// import React, { useEffect, useState } from 'react';
// import DashboardService from '../../services/dashboardService';
// import { 
//   Grid, Paper, Typography, Box, CircularProgress, Card, CardContent 
// } from '@mui/material';
// import { 
//   AttachMoney, Hotel, Person, MeetingRoom 
// } from '@mui/icons-material';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement
// } from 'chart.js';
// import { Bar, Doughnut } from 'react-chartjs-2';

// // Register ChartJS components
// ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// const Dashboard = () => {
//   const [loading, setLoading] = useState(true);
//   const [summary, setSummary] = useState({
//     activeGuests: 0,
//     rooms: { available: 0, occupied: 0, maintenance: 0, total: 0 },
//     occupancyRate: 0,
//     totalRevenue: 0,
//     arrivalsToday: 0
//   });
//   const [revenueData, setRevenueData] = useState([]);

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const [sumRes, revRes] = await Promise.all([
//           DashboardService.getSummary(),
//           DashboardService.getRevenueChart()
//         ]);
//         setSummary(sumRes.data);
//         setRevenueData(revRes.data);
//       } catch (error) {
//         console.error("Failed to load dashboard", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadData();
//   }, []);

//   if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

//   // --- CHART CONFIGURATION ---
  
//   // 1. Bar Chart Data (Revenue)
//   const barChartData = {
//     labels: revenueData.map(d => d.month),
//     datasets: [
//       {
//         label: 'Monthly Revenue ($)',
//         data: revenueData.map(d => d.revenue),
//         backgroundColor: 'rgba(54, 162, 235, 0.6)',
//       },
//     ],
//   };

//   // 2. Doughnut Chart Data (Room Status)
//   const doughnutData = {
//     labels: ['Available', 'Occupied', 'Maintenance'],
//     datasets: [
//       {
//         data: [summary.rooms.available, summary.rooms.occupied, summary.rooms.maintenance],
//         backgroundColor: [
//           'rgba(75, 192, 192, 0.6)', // Green
//           'rgba(255, 99, 132, 0.6)', // Red
//           'rgba(255, 206, 86, 0.6)', // Yellow
//         ],
//         borderWidth: 1,
//       },
//     ],
//   };

//   // Helper Component for Info Cards
//   const StatCard = ({ title, value, icon, color }) => (
//     <Card sx={{ height: '100%' }}>
//       <CardContent>
//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//           <div>
//             <Typography color="textSecondary" gutterBottom variant="overline">
//               {title}
//             </Typography>
//             <Typography variant="h4" fontWeight="bold">
//               {value}
//             </Typography>
//           </div>
//           <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color: color }}>
//             {icon}
//           </Box>
//         </Box>
//       </CardContent>
//     </Card>
//   );

//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Dashboard Overview</Typography>

//       {/* TOP CARDS */}
//       <Grid container spacing={3} sx={{ mb: 4 }}>
//         <Grid item xs={12} sm={6} md={3}>
//           <StatCard title="Total Revenue" value={`$${summary.totalRevenue.toLocaleString()}`} icon={<AttachMoney />} color="#1976d2" />
//         </Grid>
//         <Grid item xs={12} sm={6} md={3}>
//           <StatCard title="Occupancy Rate" value={`${summary.occupancyRate}%`} icon={<Hotel />} color="#ed6c02" />
//         </Grid>
//         <Grid item xs={12} sm={6} md={3}>
//           <StatCard title="Active Guests" value={summary.activeGuests} icon={<Person />} color="#2e7d32" />
//         </Grid>
//         <Grid item xs={12} sm={6} md={3}>
//           <StatCard title="Arrivals Today" value={summary.arrivalsToday} icon={<MeetingRoom />} color="#9c27b0" />
//         </Grid>
//       </Grid>

//       {/* CHARTS ROW */}
//       <Grid container spacing={3}>
//         {/* Revenue Chart */}
//         <Grid item xs={12} md={8}>
//           <Paper sx={{ p: 3, height: '400px' }}>
//             <Typography variant="h6" sx={{ mb: 2 }}>Revenue Analytics</Typography>
//             <Box sx={{ height: '300px' }}>
//               <Bar 
//                 data={barChartData} 
//                 options={{ responsive: true, maintainAspectRatio: false }} 
//               />
//             </Box>
//           </Paper>
//         </Grid>

//         {/* Room Status Chart */}
//         <Grid item xs={12} md={4}>
//           <Paper sx={{ p: 3, height: '400px' }}>
//             <Typography variant="h6" sx={{ mb: 2 }}>Room Status</Typography>
//             <Box sx={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
//               <Doughnut 
//                 data={doughnutData} 
//                 options={{ responsive: true, maintainAspectRatio: false }} 
//               />
//             </Box>
//           </Paper>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// };

// export default Dashboard;






// // import React, { useState, useEffect } from 'react';
// // import { Grid, Box, Typography, Button } from '@mui/material'; 
// // import { useAuth } from '../../context/AuthContext';
// // import { useNavigate } from 'react-router-dom';
// // import apiClient from '../../services/api';
// // import StatCard from '../../components/common/StatCard';
// // import { AttachMoney, KingBed, Person, Login as LoginIcon, Logout as LogoutIcon } from '@mui/icons-material';

// // const Dashboard = () => {
// //   const { user } = useAuth();
// //   const navigate = useNavigate();
  
// //   // Initialize with correct keys
// //   const [stats, setStats] = useState({
// //     check_ins: 0,   // Match backend snake_case
// //     check_outs: 0,  // Match backend snake_case
// //     availableRooms: 0,
// //     revenue: 0,
// //     activeGuests: 0
// //   });

// //   useEffect(() => {
// //     // SECURITY CHECK: If Guest, redirect immediately
// //     const role = (user?.role || '').toLowerCase();
// //     if (role === 'guest') {
// //         navigate('/book-room');
// //         return;
// //     }

// //     const fetchStats = async () => {
// //       try {
// //         const response = await apiClient.get('/reports/daily');
// //         if (response.data.success) {
// //             // The backend returns snake_case for checks, but camelCase for rooms (from our last fix)
// //             setStats(response.data.data);
// //         }
// //       } catch (error) {
// //         console.error("Error loading dashboard stats", error);
// //       }
// //     };

// //     if (user) {
// //         fetchStats();
// //     }
// //   }, [user, navigate]);

// //   // If Guest, don't render anything while redirecting
// //   if ((user?.role || '').toLowerCase() === 'guest') return null;

// //   return (
// //     <Box>
// //       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
// //         <Box>
// //             <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
// //                 Hotel Overview
// //             </Typography>
// //             <Typography variant="body1" color="text.secondary">
// //                 Welcome back! Here is what's happening today.
// //             </Typography>
// //         </Box>
// //         <Box>
// //             <Button 
// //                 variant="contained"
// //                 onClick={() => navigate('/reservations/new')}
// //                 sx={{ fontWeight: 'bold' }}
// //             >
// //                 + New Booking
// //             </Button>
// //         </Box>
// //       </Box>

// //       <Grid container spacing={3}>
// //         <Grid item xs={12} sm={6} md={3}>
// //           <StatCard title="Check-ins Today" value={stats.check_ins || 0} icon={<LoginIcon />} color="#4caf50" />
// //         </Grid>
// //         <Grid item xs={12} sm={6} md={3}>
// //           <StatCard title="Check-outs Today" value={stats.check_outs || 0} icon={<LogoutIcon />} color="#ff9800" />
// //         </Grid>
// //         <Grid item xs={12} sm={6} md={3}>
// //           <StatCard title="Available Rooms" value={stats.availableRooms || 0} icon={<KingBed />} color="#03a9f4" />
// //         </Grid>
        
// //         {/* --- SECURITY FIX: HIDE REVENUE FROM NON-ADMINS --- */}
// //         {user?.role === 'admin' && (
// //             <Grid item xs={12} sm={6} md={3}>
// //               <StatCard title="Revenue (This Month)" value={`$${stats.revenue || 0}`} icon={<AttachMoney />} color="#9c27b0" />
// //             </Grid>
// //         )}
// //       </Grid>

// //       <Box sx={{ mt: 4, p: 3, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
// //         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
// //             <Person color="primary" />
// //             <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
// //                 Total Active Guests in House: {stats.activeGuests || 0}
// //             </Typography>
// //         </Box>
// //       </Box>
// //     </Box>
// //   );
// // };

// // export default Dashboard;








// // // import React, { useState, useEffect } from 'react';
// // // import { Grid, Box, Typography, Button } from '@mui/material'; // Added Button/Typography imports
// // // import { useAuth } from '../../context/AuthContext';
// // // import { useNavigate } from 'react-router-dom';
// // // import apiClient from '../../services/api';
// // // import StatCard from '../../components/common/StatCard';
// // // import { AttachMoney, KingBed, Person, Login as LoginIcon, Logout as LogoutIcon } from '@mui/icons-material';

// // // const Dashboard = () => {
// // //   const { user } = useAuth();
// // //   const navigate = useNavigate();
  
// // //   // Initialize with correct keys
// // //   const [stats, setStats] = useState({
// // //     check_ins: 0,   // Match backend snake_case
// // //     check_outs: 0,  // Match backend snake_case
// // //     availableRooms: 0,
// // //     revenue: 0,
// // //     activeGuests: 0
// // //   });

// // //   useEffect(() => {
// // //     // SECURITY CHECK: If Guest, redirect immediately
// // //     const role = (user?.role || '').toLowerCase();
// // //     if (role === 'guest') {
// // //         navigate('/book-room');
// // //         return;
// // //     }

// // //     const fetchStats = async () => {
// // //       try {
// // //         const response = await apiClient.get('/reports/daily');
// // //         if (response.data.success) {
// // //             // The backend returns snake_case for checks, but camelCase for rooms (from our last fix)
// // //             setStats(response.data.data);
// // //         }
// // //       } catch (error) {
// // //         console.error("Error loading dashboard stats", error);
// // //       }
// // //     };

// // //     if (user) {
// // //         fetchStats();
// // //     }
// // //   }, [user, navigate]);

// // //   // If Guest, don't render anything while redirecting
// // //   if ((user?.role || '').toLowerCase() === 'guest') return null;

// // //   return (
// // //     <Box>
// // //       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
// // //         <Box>
// // //             <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
// // //                 Hotel Overview
// // //             </Typography>
// // //             <Typography variant="body1" color="text.secondary">
// // //                 Welcome back! Here is what's happening today.
// // //             </Typography>
// // //         </Box>
// // //         <Box>
// // //             <Button 
// // //                 variant="contained"
// // //                 onClick={() => navigate('/reservations/new')}
// // //                 sx={{ fontWeight: 'bold' }}
// // //             >
// // //                 + New Booking
// // //             </Button>
// // //         </Box>
// // //       </Box>

// // //       <Grid container spacing={3}>
// // //         <Grid item xs={12} sm={6} md={3}>
// // //           {/* FIX: Use stats.check_ins instead of checkIns */}
// // //           <StatCard title="Check-ins Today" value={stats.check_ins || 0} icon={<LoginIcon />} color="#4caf50" />
// // //         </Grid>
// // //         <Grid item xs={12} sm={6} md={3}>
// // //           {/* FIX: Use stats.check_outs instead of checkOuts */}
// // //           <StatCard title="Check-outs Today" value={stats.check_outs || 0} icon={<LogoutIcon />} color="#ff9800" />
// // //         </Grid>
// // //         <Grid item xs={12} sm={6} md={3}>
// // //           <StatCard title="Available Rooms" value={stats.availableRooms || 0} icon={<KingBed />} color="#03a9f4" />
// // //         </Grid>
// // //         <Grid item xs={12} sm={6} md={3}>
// // //           <StatCard title="Revenue (This Month)" value={`$${stats.revenue || 0}`} icon={<AttachMoney />} color="#9c27b0" />
// // //         </Grid>
// // //       </Grid>

// // //       <Box sx={{ mt: 4, p: 3, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
// // //         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
// // //             <Person color="primary" />
// // //             <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
// // //                 Total Active Guests in House: {stats.activeGuests || 0}
// // //             </Typography>
// // //         </Box>
// // //       </Box>
// // //     </Box>
// // //   );
// // // };

// // // export default Dashboard;
