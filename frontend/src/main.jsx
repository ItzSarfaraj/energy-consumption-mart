
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./components/Layout";
import "./index.css";

const Overview = lazy(() => import("./pages/Overview"));
const DataQuality = lazy(() => import("./pages/DataQuality"));
const ConsumptionExplorer = lazy(() => import("./pages/ConsumptionExplorer"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const PipelineControl = lazy(() => import("./pages/PipelineControl"));

function PageLoader() {
  return (
    <div
      className="em-card flex min-h-56 items-center justify-center gap-3 p-6"
      role="status"
      aria-live="polite"
    >
      <span className="size-5 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-400" />
      <span className="text-sm text-slate-400">Loading page...</span>
    </div>
  );
}

function loadPage(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: loadPage(Overview) },
      { path: "quality", element: loadPage(DataQuality) },
      { path: "explorer", element: loadPage(ConsumptionExplorer) },
      { path: "ai-insights", element: loadPage(AIInsights) },
      { path: "pipeline", element: loadPage(PipelineControl) },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
