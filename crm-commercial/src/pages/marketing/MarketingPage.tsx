import { useState } from 'react';
import { Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { PromoCodesTab } from './PromoCodesTab';
import { BannersTab } from './BannersTab';
import { PopupsTab } from './PopupsTab';
import { CampaignsTab } from './CampaignsTab';

type TabKey = 'promo' | 'banners' | 'popups' | 'campaigns';

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'promo', label: 'Codes promo', icon: 'receipt' },
  { key: 'banners', label: 'Bannières', icon: 'megaphone' },
  { key: 'popups', label: 'Pop-ups', icon: 'message' },
  { key: 'campaigns', label: 'Campagnes email', icon: 'mail' },
];

export function MarketingPage() {
  const [tab, setTab] = useState<TabKey>('promo');

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <h1>Marketing</h1>
          <p>Codes promo, bannières, pop-ups et campagnes email</p>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'on' : ''}
            onClick={() => setTab(t.key)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name={t.icon} size={15} />
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {tab === 'promo' && <PromoCodesTab />}
      {tab === 'banners' && <BannersTab />}
      {tab === 'popups' && <PopupsTab />}
      {tab === 'campaigns' && <CampaignsTab />}
    </div>
  );
}

export default MarketingPage;
