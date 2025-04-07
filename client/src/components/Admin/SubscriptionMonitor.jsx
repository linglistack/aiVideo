import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, Grid, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Helper for formatting dates
const formatDate = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper to get status color for event type
const getStatusColor = (eventType, successful) => {
  if (!successful) return 'error';
  
  switch (eventType) {
    case 'subscription_created':
    case 'payment_succeeded':
    case 'payment_retry_success':
    case 'cycle_reset':
      return 'success';
    case 'subscription_cancelled':
    case 'subscription_expired':
      return 'error';
    case 'payment_failed':
    case 'payment_retry_failed':
    case 'cycle_reset_failed':
      return 'error';
    case 'renewal_notice_sent':
      return 'info';
    case 'plan_changed':
    case 'subscription_updated':
      return 'primary';
    default:
      return 'default';
  }
};

const SubscriptionMonitor = () => {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [eventType, setEventType] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);
  const [failedPayments, setFailedPayments] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    revenueThisMonth: 0,
    failedPaymentsCount: 0
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Load subscription logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (eventType) params.append('eventType', eventType);
      if (userId) params.append('userId', userId);
      if (status) params.append('successful', status === 'successful' ? 'true' : 'false');
      params.append('page', page);
      params.append('limit', rowsPerPage);
      
      const response = await axios.get(`/api/admin/subscription-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setLogs(response.data.logs);
      } else {
        setError(response.data.error);
      }
      
      // Also load stats
      const statsResponse = await axios.get('/api/admin/subscription-stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
      
      // Load upcoming renewals (next 7 days)
      const renewalsResponse = await axios.get('/api/admin/upcoming-renewals', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (renewalsResponse.data.success) {
        setUpcomingRenewals(renewalsResponse.data.renewals);
      }
      
      // Load recent failed payments
      const failedResponse = await axios.get('/api/admin/failed-payments', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (failedResponse.data.success) {
        setFailedPayments(failedResponse.data.payments);
      }
      
    } catch (err) {
      setError(err.message || 'Failed to load subscription logs');
      console.error('Error loading subscription logs:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load logs when component mounts or filters change
  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage]);
  
  // Handle filter changes
  const applyFilters = () => {
    setPage(0); // Reset to first page when filters change
    loadLogs();
  };
  
  // Reset filters
  const resetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setEventType('');
    setUserId('');
    setStatus('');
    setPage(0);
    loadLogs();
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Subscription Monitor
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Subscriptions
              </Typography>
              <Typography variant="h5">
                {stats.totalSubscriptions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Subscriptions
              </Typography>
              <Typography variant="h5" color="success.main">
                {stats.activeSubscriptions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cancelled
              </Typography>
              <Typography variant="h5" color="error.main">
                {stats.cancelledSubscriptions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Revenue This Month
              </Typography>
              <Typography variant="h5" color="primary.main">
                ${stats.revenueThisMonth.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Failed Payments
              </Typography>
              <Typography variant="h5" color="error.main">
                {stats.failedPaymentsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Renewals */}
      <Typography variant="h5" gutterBottom>
        Upcoming Renewals (Next 7 Days)
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Renewal Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {upcomingRenewals.length > 0 ? (
              upcomingRenewals.map((renewal) => (
                <TableRow key={renewal._id}>
                  <TableCell>{renewal.userEmail}</TableCell>
                  <TableCell>{renewal.planName}</TableCell>
                  <TableCell>${renewal.amount.toFixed(2)}</TableCell>
                  <TableCell>{formatDate(renewal.renewalDate)}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">View User</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">No upcoming renewals</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Recent Failed Payments */}
      <Typography variant="h5" gutterBottom>
        Recent Failed Payments
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Retry Count</TableCell>
              <TableCell>Error</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {failedPayments.length > 0 ? (
              failedPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>{payment.userEmail}</TableCell>
                  <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{payment.provider}</TableCell>
                  <TableCell>{payment.retryCount || 0}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {payment.errorMessage || 'Unknown error'}
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="contained" color="primary">
                      Manual Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">No failed payments</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Subscription Event Log
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2.5}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DemoContainer components={['DatePicker']}>
                <DatePicker 
                  label="Start Date" 
                  value={startDate} 
                  onChange={setStartDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </DemoContainer>
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DemoContainer components={['DatePicker']}>
                <DatePicker 
                  label="End Date" 
                  value={endDate} 
                  onChange={setEndDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  minDate={startDate}
                />
              </DemoContainer>
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Event Type</InputLabel>
              <Select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                label="Event Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="subscription_created">Created</MenuItem>
                <MenuItem value="subscription_updated">Updated</MenuItem>
                <MenuItem value="subscription_cancelled">Cancelled</MenuItem>
                <MenuItem value="payment_succeeded">Payment Success</MenuItem>
                <MenuItem value="payment_failed">Payment Failed</MenuItem>
                <MenuItem value="payment_retry_success">Retry Success</MenuItem>
                <MenuItem value="payment_retry_failed">Retry Failed</MenuItem>
                <MenuItem value="cycle_reset">Cycle Reset</MenuItem>
                <MenuItem value="renewal_notice_sent">Renewal Notice</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="User ID"
              fullWidth
              size="small"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="successful">Successful</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={0.75}>
            <Button
              variant="contained"
              color="primary"
              onClick={applyFilters}
              fullWidth
            >
              Filter
            </Button>
          </Grid>
          <Grid item xs={6} md={0.75}>
            <Button
              variant="outlined"
              onClick={resetFilters}
              fullWidth
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      {/* Logs Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ color: 'error.main', p: 2 }}>
          Error: {error}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      {log.eventType.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.description}
                    </TableCell>
                    <TableCell>{log.planName || 'N/A'}</TableCell>
                    <TableCell>{log.paymentProvider || 'N/A'}</TableCell>
                    <TableCell>
                      {log.amount ? `$${log.amount.toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={log.successful ? 'Success' : 'Failed'} 
                        color={getStatusColor(log.eventType, log.successful)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">No logs found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default SubscriptionMonitor; 