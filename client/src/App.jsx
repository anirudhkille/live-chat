import Login from "./Features/auth/pages/login";
import { Route, Routes } from "react-router-dom";
import VerifyEmail from "./Features/auth/pages/verify-email"
import CompleteProfile from "./Features/auth/pages/complete-profile"
import AuthCallback from "./Features/auth/pages/auth-callback"

function App() {
  return (
     <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
  );
}

export default App;