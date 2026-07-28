import React from "react";
import ReactDOM from "react-dom/client";
import '@fontsource-variable/geist';
import "./index.css";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import App from "./App";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient()

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
      <QueryClientProvider client={queryClient}>
    <BrowserRouter>

      
        <App />
    </BrowserRouter>
        </QueryClientProvider>
  </React.StrictMode>
);
