import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import IndustryLayout from "./pages/industry/IndustryLayout";
import IndustryHome from "./pages/industry/IndustryHome";
import CompanyProfile from "./pages/industry/CompanyProfile";
import JDUpload from "./pages/industry/JDUpload";
import JDCreate from "./pages/industry/JDCreate";
import CompetencyMatrix from "./pages/industry/CompetencyMatrix";
import StudentShortlisting from "./pages/industry/StudentShortlisting";
// import OurStudents from "./pages/industry/OurStudents";
import ActiveHiring from "./pages/industry/ActiveHiring";
import FutureHiring from "./pages/industry/FutureHiring";
import Contribute from "./pages/industry/Contribute";
import IndustrySettings from "./pages/industry/IndustrySettings";
import AdminLogin from "./pages/AdminLogin";
import AdminContent from "./pages/admin/AdminContent";
import AdminEventsContributions from "./pages/admin/AdminEventsContributions";
import AdminStudents from "./pages/admin/AdminStudents";
import ContentList from "./pages/ContentList";
import ContentPage from "./pages/ContentPage";

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<Index />} />
          <Route path="/contact" element={<Index />} />

          {/* Industry portal: nested routes so Layout wraps content and Outlet renders the correct page */}
          <Route path="/industry" element={<IndustryLayout />}>
            <Route index element={<IndustryHome />} />
            <Route path="home" element={<IndustryHome />} />
            <Route path="profile" element={<CompanyProfile />} />
            <Route path="company-profile" element={<CompanyProfile />} />
            <Route path="jd-upload" element={<JDUpload />} />
            <Route path="jd-create" element={<JDCreate />} />
            <Route path="competency" element={<CompetencyMatrix />} />
            <Route path="shortlisting" element={<StudentShortlisting />} />
            {/* <Route path="our-students" element={<OurStudents />} /> */}
            <Route path="active-hiring" element={<ActiveHiring />} />
            <Route path="future-hiring" element={<FutureHiring />} />
            <Route path="contribute" element={<Contribute />} />
            <Route path="settings" element={<IndustrySettings />} />
            <Route path="*" element={<IndustryHome />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/events-contributions" element={<AdminEventsContributions />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/content" element={<ContentList />} />
          <Route path="/content/:slug" element={<ContentPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
