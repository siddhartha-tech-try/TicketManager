import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navigation = [
  { to: '/tasks', label: 'My tasks', icon: '▤' },
  { to: '/admin/analytics', label: 'Overview', icon: '◫', admin: true },
  { to: '/admin/users', label: 'People', icon: '♙', admin: true },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const isAdmin = user?.role === 'admin';
  const title = location.pathname.includes('analytics') ? 'Overview' : location.pathname.includes('/users') ? 'People' : 'My tasks';
  const initials = user?.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand sidebar-brand" to="/tasks"><span className="brand-mark">✓</span> daymark</Link>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">
        {navigation.filter(item => !item.admin || isAdmin).map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><span className="side-icon">{item.icon}</span>{item.label}{item.to === '/tasks' && <span className="nav-dot"/>}</NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-photo"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80" alt="Sunlit shared workspace" /><div className="photo-copy"><span>MAKE SPACE</span><strong>for good work.</strong></div></div>
        <div className="sidebar-user"><div className="avatar">{initials}</div><div className="user-details"><strong>{user?.name}</strong><span>{isAdmin ? 'Administrator' : 'Member'}</span></div><button className="icon-button" onClick={signOut} title="Sign out" aria-label="Sign out">↗</button></div>
      </div>
    </aside>
    <section className="main-shell">
      <header className="app-topbar"><div className="mobile-brand"><span className="brand-mark">✓</span> daymark</div><div className="breadcrumb">Workspace <span>/</span> <strong>{title}</strong>{isAdmin && <span className="admin-pill">ADMIN</span>}</div><div className="topbar-right"><span className="today-label">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><div className="profile-menu-wrap" ref={profileRef}><button className="avatar profile-trigger" type="button" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(open => !open)}>{initials}</button>{profileOpen && <div className="profile-menu" role="menu"><div className="profile-menu-heading"><span className="avatar">{initials}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div><div className="profile-menu-role">{isAdmin ? 'Administrator' : 'Member'} account</div><button className="profile-menu-logout" type="button" role="menuitem" onClick={() => { setProfileOpen(false); signOut(); }}><span>↗</span> Sign out</button></div>}</div></div></header>
      <main className="page-content"><Outlet /></main>
    </section>
  </div>;
}
