import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductEdit from "./pages/ProductEdit";
import ImageProcess from "./pages/ImageProcess";
import AIGenerate from "./pages/AIGenerate";
import AIImageGenerate from "./pages/AIImageGenerate";
import Export from "./pages/Export";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductEdit />} />
        <Route path="products/new" element={<ProductEdit />} />
        <Route path="images" element={<ImageProcess />} />
        <Route path="ai-generate" element={<AIGenerate />} />
        <Route path="ai-image" element={<AIImageGenerate />} />
        <Route path="export" element={<Export />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
