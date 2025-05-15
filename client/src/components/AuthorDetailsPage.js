import { Alert, Box, Button, Card, CardContent, CircularProgress, List, ListItem, ListItemText, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const AuthorDetailsPage = () => {
  const { authorId } = useParams();
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuthor = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/authors/${authorId}`);
        if (!res.ok) throw new Error('Author not found');
        const data = await res.json();
        setAuthor(data);
        // Fetch books by this author
        const booksRes = await fetch(`${API_BASE_URL}/books`);
        const booksData = await booksRes.json();
        setBooks((booksData.books || []).filter(b => b.author === authorId));
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    };
    fetchAuthor();
  }, [authorId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!author) return <Alert severity="warning">Author not found.</Alert>;

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>{author.name}</Typography>
          <Button variant="outlined" color="primary" sx={{ mr: 1 }} onClick={() => navigate(`/authors/${authorId}/edit`)}>Edit</Button>
          <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
        </CardContent>
      </Card>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Author</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <b>{author?.name}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            const res = await fetch(`${API_BASE_URL}/authors/${authorId}`, { method: 'DELETE' });
            if (res.ok) {
              navigate('/authors');
            } else {
              setError('Failed to delete author.');
            }
            setDeleteDialogOpen(false);
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Typography variant="h6" gutterBottom>Books by this author</Typography>
      {books.length === 0 ? (
        <Typography>No books found for this author.</Typography>
      ) : (
        <List>
          {books.map(book => (
            <ListItem key={book._id} component={RouterLink} to={`/books/${book._id}`}>
              <ListItemText primary={book.title} />
            </ListItem>
          ))}
        </List>
      )}
      <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Back</Button>
    </Box>
  );
};

export default AuthorDetailsPage; 