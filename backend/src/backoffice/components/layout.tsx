import type { FC } from 'hono/jsx';
import { Sidebar } from './sidebar';

interface LayoutProps {
  title: string;
  children: any;
  currentPath?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    permissions?: string[];
    isSuperAdmin?: boolean;
  };
}

export const Layout: FC<LayoutProps> = ({ title, children, currentPath, user }) => {
  return (
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Neo Backoffice</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
        />
        <style>{`
          :root {
            --sidebar-width: 260px;
            --sidebar-bg: #1a1d21;
            --sidebar-hover: #2d3339;
            --primary-color: #0d6efd;
          }
          body {
            background-color: #f5f7fa;
          }
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: var(--sidebar-width);
            background: var(--sidebar-bg);
            padding-top: 0;
            overflow-y: auto;
            z-index: 1000;
          }
          .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .sidebar-brand {
            color: #fff;
            font-size: 1.5rem;
            font-weight: 600;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .sidebar-brand:hover {
            color: #fff;
          }
          .sidebar-nav {
            padding: 15px 0;
          }
          .nav-section {
            padding: 0 15px;
            margin-bottom: 5px;
            color: #6c757d;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sidebar a.nav-link {
            color: #adb5bd;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            transition: all 0.2s;
            border-left: 3px solid transparent;
          }
          .sidebar a.nav-link:hover {
            color: #fff;
            background: var(--sidebar-hover);
          }
          .sidebar a.nav-link.active {
            color: #fff;
            background: var(--sidebar-hover);
            border-left-color: var(--primary-color);
          }
          .sidebar a.nav-link i {
            font-size: 1.1rem;
            width: 20px;
            text-align: center;
          }
          .main-content {
            margin-left: var(--sidebar-width);
            min-height: 100vh;
          }
          .top-bar {
            background: #fff;
            padding: 15px 25px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .page-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0;
            color: #212529;
          }
          .content-area {
            padding: 25px;
          }
          .card {
            border: none;
            box-shadow: 0 0 10px rgba(0,0,0,0.05);
            border-radius: 10px;
          }
          .card-header {
            background: #fff;
            border-bottom: 1px solid #e9ecef;
            padding: 15px 20px;
            font-weight: 600;
          }
          .stat-card {
            border-radius: 10px;
            padding: 20px;
            color: #fff;
          }
          .stat-card .stat-icon {
            font-size: 2.5rem;
            opacity: 0.8;
          }
          .stat-card .stat-value {
            font-size: 2rem;
            font-weight: 700;
          }
          .stat-card .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
          }
          .table th {
            font-weight: 600;
            color: #495057;
            border-bottom-width: 1px;
          }
          .btn-action {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }
          .user-dropdown {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
          }
          .user-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: var(--primary-color);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
          }
          .htmx-indicator {
            display: none;
          }
          .htmx-request .htmx-indicator {
            display: inline-block;
          }
          .htmx-request.htmx-indicator {
            display: inline-block;
          }
          /* Retour visuel pendant une requete HTMX : l'element en cours est
             attenue et non-cliquable, sans recharger la page. */
          .htmx-request {
            opacity: 0.55;
            transition: opacity 0.15s ease-in-out;
          }
          form.htmx-request,
          button.htmx-request,
          .htmx-request button,
          .htmx-request [type='submit'] {
            pointer-events: none;
            cursor: progress;
          }
          /* Mode RDV : masque les éléments confidentiels (notes internes)
             quand l'écran est montré au client. */
          html.rdv-mode .confidential { display: none !important; }
        `}</style>
        <script>{`
          (function () {
            try {
              if (localStorage.getItem('neoRdvMode') === '1') {
                document.documentElement.classList.add('rdv-mode');
              }
            } catch (e) {}
          })();
        `}</script>
      </head>
      <body>
        <Sidebar currentPath={currentPath} permissions={user?.permissions} isSuperAdmin={user?.isSuperAdmin} />
        <div class="main-content">
          <div class="top-bar">
            <h1 class="page-title">{title}</h1>
            <div class="d-flex align-items-center gap-3">
              <button
                type="button"
                id="rdvToggle"
                class="btn btn-sm btn-outline-secondary"
                title="Masque les notes internes quand l'écran est montré au client"
              >
                <i class="bi bi-incognito me-1"></i>
                <span class="rdv-label">Mode RDV</span>
              </button>
            {user && (
              <div class="dropdown">
                <div class="user-dropdown" data-bs-toggle="dropdown">
                  <div class="user-avatar">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                  <span>{user.firstName} {user.lastName}</span>
                  <i class="bi bi-chevron-down"></i>
                </div>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><span class="dropdown-item-text text-muted">{user.email}</span></li>
                  <li><hr class="dropdown-divider" /></li>
                  <li>
                    <a class="dropdown-item" href="/backoffice/logout">
                      <i class="bi bi-box-arrow-right me-2"></i>Deconnexion
                    </a>
                  </li>
                </ul>
              </div>
            )}
            </div>
          </div>
          <div class="content-area">
            {children}
          </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
        <script src="/feedback-widget.js" data-app="admin" data-email={user?.email ?? ''}></script>
        <script>{`
          (function () {
            function sync(btn) {
              var on = document.documentElement.classList.contains('rdv-mode');
              btn.classList.toggle('btn-warning', on);
              btn.classList.toggle('btn-outline-secondary', !on);
              var icon = btn.querySelector('i');
              if (icon) icon.className = on ? 'bi bi-eye-slash me-1' : 'bi bi-incognito me-1';
              var label = btn.querySelector('.rdv-label');
              if (label) label.textContent = on ? 'Mode RDV activé' : 'Mode RDV';
            }
            document.addEventListener('DOMContentLoaded', function () {
              var btn = document.getElementById('rdvToggle');
              if (!btn) return;
              sync(btn);
              btn.addEventListener('click', function () {
                var on = document.documentElement.classList.toggle('rdv-mode');
                try { localStorage.setItem('neoRdvMode', on ? '1' : '0'); } catch (e) {}
                sync(btn);
              });
            });
          })();
        `}</script>
      </body>
    </html>
  );
};
