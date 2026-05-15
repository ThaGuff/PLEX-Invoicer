import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccountProvider } from './context/AccountContext';
import QuoteBuilder from './pages/QuoteBuilder';

export default function App() {
  return (
    <AccountProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<QuoteBuilder />} />
        </Routes>
      </BrowserRouter>
    </AccountProvider>
  );
}
