import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuoteBuilder from './pages/QuoteBuilder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<QuoteBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}
