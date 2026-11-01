// Root component of the data-quality frontend. The portal shell loads it (exposed
// as "./App") and renders it at /data-quality/*; routes here are relative to that.
import { Route, Routes } from "react-router";
import { CheckPage } from "./CheckPage";
import { ChecksPage } from "./ChecksPage";

export default function App() {
  return (
    <Routes>
      <Route index element={<ChecksPage />} />
      <Route path="checks/:id" element={<CheckPage />} />
    </Routes>
  );
}
