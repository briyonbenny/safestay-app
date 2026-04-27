import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SafeStayProvider } from './context/SafeStayContext.jsx';
import { Layout } from './components/Layout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ListingsPage } from './pages/ListingsPage.jsx';
import { ListingDetailPage } from './pages/ListingDetailPage.jsx';
import { CreateListingPage } from './pages/CreateListingPage.jsx';
import { FavouritesPage } from './pages/FavouritesPage.jsx';
import { ChatPage } from './pages/ChatPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

/**
 * Root router for SafeStay (WT Assignment 3).
 * Each page component file names the VIEW in its comment block for assessors.
 */
function App() {
  return (
    <BrowserRouter>
      <SafeStayProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="listings/new" element={<CreateListingPage />} />
            <Route path="listings/:id" element={<ListingDetailPage />} />
            <Route path="favourites" element={<FavouritesPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="auth/login" element={<LoginPage />} />
            <Route path="auth/register" element={<RegisterPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SafeStayProvider>
    </BrowserRouter>
  );
}

export default App;
