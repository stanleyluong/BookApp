import { Alert, Button, CircularProgress, List, ListItem, ListItemText, Snackbar, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AuthorFormDialog from './AuthorFormDialog';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const AuthorsListPage = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchAuthors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/authors`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAuthors(data.authors || []);
    } catch (e) {
      setError(e.message);
      console.error("Failed to fetch authors:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handleAddAuthor = async (name) => {
    setAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add author');
      }
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'Author added!', severity: 'success' });
      fetchAuthors();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
    setAdding(false);
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching authors: {error}</Alert>;
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Authors
      </Typography>
      <Button onClick={() => setDialogOpen(true)} variant="contained" color="primary" sx={{ mb: 2 }}>
        Add New Author
      </Button>
      {authors.length === 0 ? (
        <Typography>No authors found.</Typography>
      ) : (
        <List>
          {authors.map((author) => (
            <ListItem 
              key={author._id} 
              component={RouterLink} 
              to={`/authors/${author._id}`}
            >
              <ListItemText primary={author.name} />
            </ListItem>
          ))}
        </List>
      )}
      <AuthorFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddAuthor}
        loading={adding}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          style: { backgroundColor: snackbar.severity === 'success' ? '#43a047' : '#d32f2f', color: '#fff' }
        }}
      />
    </>
  );
};

export default AuthorsListPage; 