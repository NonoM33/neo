import { useState } from 'react';
import { PromoCodesTab } from './PromoCodesTab';
import { BannersTab } from './BannersTab';
import { PopupsTab } from './PopupsTab';
import { CampaignsTab } from './CampaignsTab';

type TabKey = 'promo' | 'banners' | 'popups' | 'campaigns';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'promo', label: 'Codes promo', icon: 'bi-ticket-perforated' },
  { key: 'banners', label: 'Bannières', icon: 'bi-megaphone' },
  { key: 'popups', label: 'Pop-ups', icon: 'bi-window-stack' },
  { key: 'campaigns', label: 'Campagnes email', icon: 'bi-envelope-paper' },
];

export function MarketingPage() {
  const [tab, setTab] = useState<TabKey>('promo');

  return (
    <div className="marketing-page">
      <div className="mb-4">
        <h1 className="page-title mb-0">
          <i className="bi bi-badge-ad me-2"></i>
          Marketing
        </h1>
        <p className="mb-0 mt-1" style={{ color: 'var(--neo-text-secondary)', fontSize: '0.9rem' }}>
          Codes promo, bannières, pop-ups et campagnes email
        </p>
      </div>

      <ul className="nav nav-tabs mb-4">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`bi ${t.icon} me-2`}></i>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'promo' && <PromoCodesTab />}
      {tab === 'banners' && <BannersTab />}
      {tab === 'popups' && <PopupsTab />}
      {tab === 'campaigns' && <CampaignsTab />}
    </div>
  );
}

export default MarketingPage;
