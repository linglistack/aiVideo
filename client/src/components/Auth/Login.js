import React, { useState, useEffect } from 'react';
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
  Avatar,
  GlobalStyles
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { GoogleLogin } from '@react-oauth/google';
import { login, googleLogin } from '../../services/authService';

// Global styles to fix background issues
const globalStyles = (
  <GlobalStyles
    styles={{
      'body': {
        margin: 0,
        padding: 0,
        backgroundColor: '#121212',
        minHeight: '100vh',
        overflowX: 'hidden'
      }
    }}
  />
);

// Custom styled components
const AuthContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '5vh',
  paddingBottom: '2vh',
  background: '#000000',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  width: '90%',
  maxWidth: '450px',
}));

const FormField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#242424',
    color: '#ffffff',
    borderRadius: theme.spacing(1.5),
    height: '50px',
    '& fieldset': {
      borderColor: 'rgba(100, 100, 100, 0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(150, 150, 150, 0.4)',
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

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }
      
      const data = await login({ email, password });
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      
      const data = await googleLogin(credentialResponse.credential);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      {globalStyles}
      <AuthContainer>
        <StyledPaper elevation={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Typography 
              variant="h5" 
              component="h1" 
              align="center" 
              sx={{ 
                fontWeight: 700, 
                color: '#ffffff',
                letterSpacing: '0.5px',
              }}
            >
              Welcome Back
            </Typography>
            <Typography 
              variant="body2" 
              align="center" 
              sx={{ 
                color: 'rgba(255,255,255,0.6)', 
                mt: 0.5,
                fontSize: '0.9rem',
              }}
            >
              Sign in to continue to your account
            </Typography>
          </Box>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                backgroundColor: 'rgba(68, 21, 21, 0.6)', 
                color: '#ff6b6b',
                borderRadius: '8px',
                borderLeft: '4px solid #f03e3e'
              }}
            >
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleEmailLogin} noValidate>
            <FormField
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
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
              autoComplete="current-password"
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
                      onClick={handleClickShowPassword}
                      edge="end"
                      sx={{ color: 'rgba(200, 200, 200, 0.7)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
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
              {loading ? 'Signing in...' : 'Sign In'}
            </GlowButton>
            
            <StyledDivider sx={{ my: 2 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', px: 1, fontSize: '0.8rem' }}>
                OR CONTINUE WITH
              </Typography>
            </StyledDivider>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError('Google login failed. Please try again.');
                }}
                useOneTap
              />
            </Box>
            
            <Typography 
              sx={{ 
                mt: 2, 
                textAlign: 'center', 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.75rem',
                lineHeight: 1.4
              }}
            >
              Your information is securely processed.
            </Typography>
          </Box>
        </StyledPaper>
      </AuthContainer>
    </>
  );
};

export default Login; 