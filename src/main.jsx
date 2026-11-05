import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.jsx";
import { store } from "./store/store.js";
import ToastProvider from "./context/ToastContext";

// Client ID Google OAuth. Isi lewat .env dengan nama VITE_GOOGLE_CLIENT_ID.
// (Ganti placeholder ini dengan client ID Anda agar tombol Google berfungsi.)
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "1041157122537-slambcoquromlf2ke084is0p6prm20kc.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
