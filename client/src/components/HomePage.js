import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const HomePage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/books`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBooks(data.books || []);
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch books:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 5, borderRadius: 4, textAlign: 'center', maxWidth: 500, mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom color="primary.main" fontWeight={700}>
          📚 BookApp
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Your modern library manager
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Effortlessly manage your books and authors. Add, edit, and explore your collection with a beautiful, intuitive interface.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button component={RouterLink} to="/books" variant="contained" size="large" color="primary">
            Browse Books
          </Button>
          <Button component={RouterLink} to="/authors" variant="outlined" size="large" color="primary">
            Browse Authors
          </Button>
        </Stack>
      </Paper>

      <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
        Featured Books
      </Typography>

      {loading ? (
        <Typography>Loading books...</Typography>
      ) : error ? (
        <Typography color="error">Error loading books: {error}</Typography>
      ) : (
        <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 1200, px: 2 }}>
          {books.map((book) => (
            <Grid item xs={6} sm={4} md={3} key={book._id}>
              <Paper
                component={RouterLink}
                to={`/books/${book._id}`}
                sx={{
                  p: 2,
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                  width: '100%',
                }}
              >
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'contain',
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No Cover
                    </Typography>
                  </Box>
                )}
                <Typography
                  variant="subtitle1"
                  component="h3"
                  sx={{
                    textAlign: 'center',
                    color: 'text.primary',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    width: '100%',
                  }}
                >
                  {book.title}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default HomePage; 