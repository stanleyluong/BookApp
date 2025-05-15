import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';

const Layout = () => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Button color="inherit" component={RouterLink} to="/">BookApp</Button>
          </Typography>
          <Button color="inherit" component={RouterLink} to="/authors">Authors</Button>
          <Button color="inherit" component={RouterLink} to="/books">Books</Button>
          <Button color="inherit" component={RouterLink} to="/about">About</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ mt: 2 }}>
          <Outlet />
        </Box>
      </Container>
    </>
  );
};

export default Layout; 