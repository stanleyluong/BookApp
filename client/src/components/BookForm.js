import { Alert, Box, Button, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://3dl7cdu3z6.execute-api.us-west-2.amazonaws.com/Prod';

const BookForm = () => {
  const { bookId } = useParams();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [authors, setAuthors] = useState([]);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [pageCount, setPageCount] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/authors`);
        const data = await res.json();
        setAuthors(data.authors || []);
      } catch (e) {
        setAuthors([]);
      }
    };
    fetchAuthors();
    // If editing, fetch book data
    if (bookId) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/books/${bookId}`);
          if (!res.ok) throw new Error('Failed to fetch book');
          const data = await res.json();
          setTitle(data.title || '');
          setAuthor(data.author || '');
          setDescription(data.description || '');
          setPublishDate(data.publishDate || '');
          setPageCount(data.pageCount ? String(data.pageCount) : '');
        } catch (e) {
          setError(e.message);
        }
        setLoading(false);
      })();
    }
  }, [bookId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      let currentBookId = bookId;
      if (!bookId) {
        // Create book
        const res = await fetch(`${API_BASE_URL}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            author,
            description,
            publishDate,
            pageCount: Number(pageCount)
          })
        });
        if (!res.ok) throw new Error('Failed to create book');
        const data = await res.json();
        currentBookId = data.book && data.book._id ? data.book._id : (data._id || data.id);
      } else {
        // Update book
        const res = await fetch(`${API_BASE_URL}/books/${bookId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            author,
            description,
            publishDate,
            pageCount: Number(pageCount)
          })
        });
        if (!res.ok) throw new Error('Failed to update book');
      }
      // Handle cover image upload (same as before)
      if (coverImage && currentBookId) {
        const presignRes = await fetch(`${API_BASE_URL}/books/${currentBookId}/cover-upload-url?contentType=${encodeURIComponent(coverImage.type)}`);
        const { uploadUrl, coverImageS3Key } = await presignRes.json();
        const s3UploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: coverImage,
          headers: { 'Content-Type': coverImage.type }
        });
        if (!s3UploadResponse.ok) {
          const s3ErrorText = await s3UploadResponse.text();
          throw new Error(`S3 Upload failed: ${s3UploadResponse.status}`);
        }
        if (coverImageS3Key) {
          const updateBookRes = await fetch(`${API_BASE_URL}/books/${currentBookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coverImageS3Key: coverImageS3Key })
          });
          if (!updateBookRes.ok) {
            const updateErrorData = await updateBookRes.json();
            setError(`Book saved, but failed to link cover image: ${updateErrorData.error || 'Unknown error'}`);
          }
        }
      }
      setSuccess(true);
      setTimeout(() => navigate(`/books/${currentBookId}`), 1000);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>{bookId ? 'Edit Book' : 'Add New Book'}</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          required
          margin="normal"
        />
        <TextField
          select
          label="Author"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          fullWidth
          required
          margin="normal"
        >
          {authors.map(a => (
            <MenuItem key={a._id} value={a._id}>{a.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />
        <TextField
          label="Publish Date"
          type="date"
          value={publishDate}
          onChange={e => setPublishDate(e.target.value)}
          fullWidth
          required
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Page Count"
          type="number"
          value={pageCount}
          onChange={e => setPageCount(e.target.value)}
          fullWidth
          required
          margin="normal"
          inputProps={{ min: 1 }}
        />
        <Button
          variant="contained"
          component="label"
          sx={{ mt: 2 }}
        >
          Upload Cover Image
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={e => setCoverImage(e.target.files[0])}
          />
        </Button>
        {coverImage && <Typography variant="body2" sx={{ mt: 1 }}>{coverImage.name}</Typography>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>Book saved!</Alert>}
        <Box sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (bookId ? 'Update Book' : 'Add Book')}
          </Button>
          <Button sx={{ ml: 2 }} onClick={() => navigate(-1)} disabled={loading}>Cancel</Button>
        </Box>
      </form>
    </Box>
  );
};

export default BookForm; 