import { create } from "zustand"

const useAuthStore = create((set) => ({
  token: null,
  user: null,
  setUser: (userData) => set({ token: userData.token, user: userData.user }),
  logout: () => set({ token: null, user: null }),
}))

export default useAuthStore
