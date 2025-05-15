import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const AuthorForm = () => {
  const { authorId } = useParams();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authorId) {
      setLoading(true);
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/authors/${authorId}`);
          if (!res.ok) throw new Error('Failed to fetch author');
          const data = await res.json();
          setName(data.name || '');
        } catch (e) {
          setError(e.message);
        }
        setLoading(false);
      })();
    }
  }, [authorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      if (!name.trim()) throw new Error('Name is required');
      if (authorId) {
        // Edit
        const res = await fetch(`${API_BASE_URL}/authors/${authorId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        });
        if (!res.ok) throw new Error('Failed to update author');
      } else {
        // Add
        const res = await fetch(`${API_BASE_URL}/authors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        });
        if (!res.ok) throw new Error('Failed to create author');
        const data = await res.json();
        navigate(`/authors/${data.author?._id || data._id || data.id}`);
        setSuccess(true);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate(`/authors/${authorId}`), 1000);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>{authorId ? 'Edit Author' : 'Add New Author'}</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Author Name"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={loading}
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>Author saved!</Alert>}
        <Box sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (authorId ? 'Update Author' : 'Add Author')}
          </Button>
          <Button sx={{ ml: 2 }} onClick={() => navigate(-1)} disabled={loading}>Cancel</Button>
        </Box>
      </form>
    </Box>
  );
};

export default AuthorForm; 