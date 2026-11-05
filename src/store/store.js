import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import newsReducer from './slices/newsSlice'
import aiReducer from './slices/aiSlice'
import bookmarkReducer from './slices/bookmarkSlice'

// Redux Toolkit: single source of truth untuk seluruh state aplikasi.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    news: newsReducer,
    ai: aiReducer,
    bookmarks: bookmarkReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: import.meta.env.DEV,
})

export default store
