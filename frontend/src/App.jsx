import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

function AdminPage({ children }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}

export default function App() {
  return <AuthProvider><Routes>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route path="/" element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>
      <Route index element={<Navigate to="/tasks" replace/>}/>
      <Route path="tasks" element={<TasksPage/>}/>
      <Route path="admin/users" element={<AdminPage><UsersPage/></AdminPage>}/>
      <Route path="admin/analytics" element={<AdminPage><AnalyticsPage/></AdminPage>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></AuthProvider>;
}
