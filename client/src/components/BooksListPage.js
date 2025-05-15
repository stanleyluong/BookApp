import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const BooksListPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/books`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBooks(data.books || []); // API returns { books: [...] }
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch books:", e);
      }
      setLoading(false);
    };

    fetchBooks();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching books: {error}</Alert>;
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Books
      </Typography>
      <Button component={RouterLink} to="/books/new" variant="contained" color="primary" sx={{ mb: 2 }}>
        Add New Book
      </Button>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Book</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <b>{bookToDelete?.title}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            if (bookToDelete) {
              const res = await fetch(`${API_BASE_URL}/books/${bookToDelete._id}`, { method: 'DELETE' });
              if (res.ok) {
                setBooks(books.filter(b => b._id !== bookToDelete._id));
              } else {
                alert('Failed to delete book.');
              }
              setDeleteDialogOpen(false);
              setBookToDelete(null);
            }
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
      {books.length === 0 ? (
        <Typography>No books found.</Typography>
      ) : (
        <List>
          {books.map((book) => (
            <ListItem key={book._id} component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                <RouterLink to={`/books/${book._id}`} sx={{ textDecoration: 'none' }}>{book.title}</RouterLink>
              </span>
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  sx={{ mr: 1 }}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/books/${book._id}/edit`);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBookToDelete(book);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
              </span>
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
};

export default BooksListPage; 