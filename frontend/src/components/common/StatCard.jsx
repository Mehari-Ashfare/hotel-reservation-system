import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const StatCard = ({ title, value, icon, color }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 'bold' }}>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#333' }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ 
            backgroundColor: color ? `${color}20` : '#e3f2fd', // Adds transparency
            borderRadius: '50%', 
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color || '#1976d2'
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
