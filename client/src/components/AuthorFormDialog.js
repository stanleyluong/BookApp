import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import React, { useState } from 'react';

const AuthorFormDialog = ({ open, onClose, onSubmit, loading }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
    onSubmit(name.trim());
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add New Author</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Author Name"
          type="text"
          fullWidth
          value={name}
          onChange={e => setName(e.target.value)}
          error={!!error}
          helperText={error}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Add Author'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthorFormDialog; 