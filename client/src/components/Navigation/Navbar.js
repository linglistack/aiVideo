import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Box, 
  Container,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  styled
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';

const Logo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  '& img': {
    height: 40,
    marginRight: theme.spacing(1)
  }
}));

// Add StoryScene logo component
const StorySceneLogo = () => (
  <svg height="42" width="200" xmlns="http://www.w3.org/2000/svg" viewBox="41 0 200 42">
    {/* Larger "StoryScene" text */}
    <text x="40" y="26" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="white">StoryScene</text>
    
    {/* "AI" with gradient text */}
    <text x="151" y="26" fontFamily="Arial" fontWeight="bold" fontSize="20" fill="url(#textGradient)">AI</text>
    
    {/* Define gradients */}
    <defs>
      <linearGradient id="sceneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25F4EE" />
        <stop offset="100%" stopColor="#FE2C55" />
      </linearGradient>
      <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#25F4EE" />
        <stop offset="100%" stopColor="#FE2C55" />
      </linearGradient>
    </defs>
  </svg>
);

const NavBar = ({ user, onLogout }) => {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const navigate = useNavigate();

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    onLogout();
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {/* Desktop Logo */}
          {/* <Logo sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              StoryScene
            </Typography>
          </Logo> */}
          <StorySceneLogo/>

          {/* Mobile menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              <MenuItem onClick={handleCloseNavMenu} component={Link} to="/product">
                <Typography textAlign="center">Product</Typography>
              </MenuItem>
              <MenuItem onClick={handleCloseNavMenu} component={Link} to="/pricing">
                <Typography textAlign="center">Pricing</Typography>
              </MenuItem>
              {user && (
                <MenuItem onClick={handleCloseNavMenu} component={Link} to="/dashboard">
                  <Typography textAlign="center">Dashboard</Typography>
                </MenuItem>
              )}
            </Menu>
          </Box>

          {/* Mobile Logo */}
          <Logo sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              TikTok Generator
            </Typography>
          </Logo>

          {/* Desktop menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
            {/* <Button
              onClick={handleCloseNavMenu}
              component={Link}
              to="/product"
              sx={{ mx: 2, color: 'inherit' }}
            >
              Product
            </Button>
            <Button
              onClick={handleCloseNavMenu}
              component={Link}
              to="/pricing"
              sx={{ mx: 2, color: 'inherit' }}
            >
              Pricing
            </Button> */}
            {/* {user && (
              <Button
                onClick={handleCloseNavMenu}
                component={Link}
                to="/dashboard"
                sx={{ mx: 2, color: 'inherit' }}
              >
                Dashboard
              </Button>
            )} */}
          </Box>

          {/* Auth buttons or user menu */}
          <Box sx={{ flexGrow: 0 }}>
            {user ? (
              <>
                {/* <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar 
                    alt={user.name} 
                    src={user.avatar} 
                    sx={{ 
                      bgcolor: user.avatar ? 'transparent' : 'primary.main',
                    }}
                  >
                    {!user.avatar && user.name?.charAt(0)}
                  </Avatar>
                </IconButton>
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  <MenuItem component={Link} to="/dashboard" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Dashboard</Typography>
                  </MenuItem>
                  <MenuItem component={Link} to="/create" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Create Video</Typography>
                  </MenuItem>
                  <MenuItem component={Link} to="/account" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Account</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Typography textAlign="center">Logout</Typography>
                  </MenuItem>
                </Menu> */}
              </>
            ) : (
              <>
               
                <div className="space-x-4">
                <Link to="/login" className="text-tiktok-pink hover:text-tiktok-blue transition-colors">Login</Link>
            <Link to="/register" className="bg-tiktok-pink px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors">Sign Up</Link>
            </div>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar;