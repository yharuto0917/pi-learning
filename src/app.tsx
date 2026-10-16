import { HashRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/app-layout";
import { ProgressProvider } from "./hooks/use-progress";
import { HomePage } from "./pages/home-page";
import { LessonPage } from "./pages/lesson-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PillarPage } from "./pages/pillar-page";

export function App() {
  return (
    <ProgressProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path=":pillarId" element={<PillarPage />} />
            <Route path=":pillarId/:lessonId" element={<LessonPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProgressProvider>
  );
}
