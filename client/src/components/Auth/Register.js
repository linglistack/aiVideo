import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Avatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { GoogleLogin } from '@react-oauth/google';
import { register, googleLogin } from '../../services/authService';

// Custom styled components
const AuthContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(18, 18, 18, 0.85)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  color: '#ffffff',
  padding: theme.spacing(5),
  borderRadius: theme.spacing(3),
  width: '90%',
  maxWidth: '450px',
  transition: 'all 0.3s ease',
  border: '1px solid rgba(255, 255, 255, 0.05)',
}));

const FormField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(35, 35, 35, 0.5)',
    color: '#ffffff',
    borderRadius: theme.spacing(2),
    height: '56px',
    transition: 'all 0.2s ease',
    '& fieldset': {
      borderColor: 'rgba(100, 100, 100, 0.2)',
      transition: 'all 0.2s ease',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(150, 150, 150, 0.4)',
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(40, 40, 40, 0.7)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4AEADC',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(200, 200, 200, 0.7)',
    fontWeight: 500,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#4AEADC',
  },
  '& .MuiInputAdornment-root': {
    color: 'rgba(200, 200, 200, 0.7)',
  },
}));

const GlowButton = styled(Button)(({ theme }) => ({
  background: '#FE2C55',
  color: '#ffffff',
  fontWeight: 'bold',
  padding: theme.spacing(1),
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  height: '48px',
  fontSize: '1rem',
  textTransform: 'none',
  boxShadow: '0 4px 15px rgba(254, 44, 85, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: '#e91e63',
    boxShadow: '0 6px 20px rgba(254, 44, 85, 0.5)',
    transform: 'translateY(-2px)',
  },
  '&:active': {
    transform: 'translateY(1px)',
    boxShadow: '0 2px 10px rgba(254, 44, 85, 0.3)',
  },
  '&.Mui-disabled': {
    background: 'rgba(254, 44, 85, 0.4)',
    color: 'rgba(255, 255, 255, 0.6)',
  },
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  '&.MuiDivider-root': {
    '&::before, &::after': {
      borderColor: 'rgba(100, 100, 100, 0.2)',
    }
  }
}));

const Register = ({ onRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      if (!name || !email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      
      const data = await register({ name, email, password });
      onRegister(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      
      const data = await googleLogin(credentialResponse.credential);
      onRegister(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  return (
    <AuthContainer>
      <StyledPaper elevation={6}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          {/* <Avatar 
            sx={{ 
              width: 70, 
              height: 70, 
              mb: 2,
              background: 'linear-gradient(135deg, #4AEADC 0%, #ff5374 100%)'
            }}
          >
            <Typography variant="h4" component="span" sx={{ color: 'white', fontWeight: 'bold' }}>
              A
            </Typography>
          </Avatar> */}
          <Typography 
            variant="h4" 
            component="h1" 
            align="center" 
            sx={{ 
              fontWeight: 700, 
              color: '#ffffff',
              letterSpacing: '0.5px',
            }}
          >
            Create Account
          </Typography>
          <Typography 
            variant="body1" 
            align="center" 
            sx={{ 
              color: 'rgba(255,255,255,0.6)', 
              mt: 1,
              fontSize: '0.95rem',
            }}
          >
            Join our community today
          </Typography>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              backgroundColor: 'rgba(68, 21, 21, 0.6)', 
              color: '#ff6b6b',
              borderRadius: '12px',
              borderLeft: '4px solid #f03e3e'
            }}
          >
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleEmailRegister} noValidate>
          <FormField
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person sx={{ color: 'rgba(200, 200, 200, 0.7)' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormField
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: 'rgba(200, 200, 200, 0.7)' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormField
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: 'rgba(200, 200, 200, 0.7)' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => handleTogglePassword('password')}
                    edge="end"
                    sx={{ color: 'rgba(200, 200, 200, 0.7)' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormField
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: 'rgba(200, 200, 200, 0.7)' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => handleTogglePassword('confirm')}
                    edge="end"
                    sx={{ color: 'rgba(200, 200, 200, 0.7)' }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <GlowButton
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </GlowButton>
          
          <StyledDivider sx={{ my: 3 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', px: 1, fontSize: '0.85rem' }}>
              OR CONTINUE WITH
            </Typography>
          </StyledDivider>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setError('Google registration failed. Please try again.');
              }}
              useOneTap
            />
          </Box>
          
          <Typography 
            sx={{ 
              mt: 4, 
              textAlign: 'center', 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.8rem',
              lineHeight: 1.5
            }}
          >
            Your information is securely processed.
            <br />We don't store your full details.
          </Typography>
        </Box>
      </StyledPaper>
    </AuthContainer>
  );
};

export default Register; 