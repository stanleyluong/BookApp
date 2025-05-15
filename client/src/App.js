import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
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

function App() {
  return (
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
          {/* Add a 404 Not Found route here later */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
