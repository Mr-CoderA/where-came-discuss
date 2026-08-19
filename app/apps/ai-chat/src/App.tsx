import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ChatScreen } from "./screens/chat.js";
import { HistoryScreen } from "./screens/history.js";
import { ROUTES } from "./router.js";

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.history} element={<HistoryScreen />} />
        <Route path={ROUTES.chat} element={<ChatScreen />} />
        <Route path="*" element={<Navigate to={ROUTES.history} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
