import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const BookDetailsPage = () => {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [author, setAuthor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/books/${bookId}`);
        if (!res.ok) throw new Error('Book not found');
        const data = await res.json();
        setBook(data);
        console.log(data);
        // Fetch author info
        const authorRes = await fetch(`${API_BASE_URL}/authors/${data.author}`);
        if (authorRes.ok) {
          setAuthor(await authorRes.json());
        } else {
          setAuthor(null);
        }
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    };
    fetchBook();
  }, [bookId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!book) return <Alert severity="warning">Book not found.</Alert>;

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>{book.title}</Typography>
          {author && (
            <Typography variant="subtitle1" gutterBottom>
              by <RouterLink to={`/authors/${author._id}`}>{author.name}</RouterLink>
            </Typography>
          )}
          {book.coverImageUrl && (
            <Box sx={{ my: 2 }}>
              <img src={book.coverImageUrl} alt={book.title} style={{ maxWidth: 200, borderRadius: 8 }} />
            </Box>
          )}
          <Typography variant="body1" gutterBottom>{book.description || 'No description.'}</Typography>
          <Button variant="outlined" color="primary" sx={{ mr: 1 }} onClick={() => navigate(`/books/${bookId}/edit`)}>Edit</Button>
          <Button variant="outlined" color="error" onClick={async () => {
            if (window.confirm('Are you sure you want to delete this book?')) {
              const res = await fetch(`${API_BASE_URL}/books/${bookId}`, { method: 'DELETE' });
              if (res.ok) {
                navigate('/books');
              } else {
                alert('Failed to delete book.');
              }
            }
          }}>Delete</Button>
        </CardContent>
      </Card>
      <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Back</Button>
    </Box>
  );
};

export default BookDetailsPage; 