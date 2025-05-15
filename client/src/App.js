import { createTheme, ThemeProvider } from '@mui/material/styles';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import AboutPage from './components/AboutPage';
import AuthorDetailsPage from './components/AuthorDetailsPage';
import AuthorForm from './components/AuthorForm';
import AuthorsListPage from './components/AuthorsListPage';
import BookDetailsPage from './components/BookDetailsPage';
import BookForm from './components/BookForm';
import BooksListPage from './components/BooksListPage';
import HomePage from './components/HomePage';
import Layout from './components/Layout';

// Future imports for other pages:
// import ViewAuthorPage from './components/ViewAuthorPage';
// import AuthorForm from './components/AuthorForm';
// import ViewBookPage from './components/ViewBookPage';
// import BookForm from './components/BookForm';

// Create a custom theme to set Montserrat as the default font
const theme = createTheme({
  typography: {
    fontFamily: 'Montserrat, Arial, sans-serif',
    // You can customize specific variants if needed, e.g.:
    // h1: {
    //   fontFamily: 'Montserrat, Arial, sans-serif',
    //   fontWeight: 700,
    // },
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          textDecoration: 'none',
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        // This might not be strictly necessary if MuiLink covers it,
        // but can help for components that use ButtonBase for link-like behavior.
      },
      styleOverrides:{
        root: {
          '&[href]': {
            textDecoration: 'none',
          }
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="authors" element={<AuthorsListPage />} />
            <Route path="authors/new" element={<AuthorForm />} />
            <Route path="authors/:authorId" element={<AuthorDetailsPage />} />
            <Route path="authors/:authorId/edit" element={<AuthorForm />} />
            <Route path="books" element={<BooksListPage />} />
            <Route path="books/new" element={<BookForm />} />
            <Route path="books/:bookId" element={<BookDetailsPage />} />
            <Route path="books/:bookId/edit" element={<BookForm />} />
            <Route path="about" element={<AboutPage />} />
            {/* Add a 404 Not Found route here later */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
