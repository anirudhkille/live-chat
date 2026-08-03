import { Route, Routes, Navigate, useLocation } from "react-router-dom"
import Login from "./features/auth/pages/login"
import VerifyEmail from "./features/auth/pages/verify-email"
import CompleteProfile from "./features/auth/pages/complete-profile"
import AuthCallback from "./features/auth/pages/auth-callback"
import { ChatLayout } from "@/layout/chat-layout"
import { ChatThreadPage } from "@/features/chat/chat-thread-page"
import { NewChatPage } from "@/features/chat/new-chat-page"
import { SearchPage } from "@/features/search/search-page"
import { SettingsPage } from "@/features/settings/settings-page"
import useAuthStore from "@/store/userStore"

function ProtectedRoute({ children }) {
  const { token, user } = useAuthStore()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user?.name) {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chats" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={null} />
        <Route path="new" element={<NewChatPage />} />
        <Route path=":conversationId" element={<ChatThreadPage />} />
      </Route>
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
