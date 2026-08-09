'use client';

import { useState } from 'react';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button, Input } from '@/components';
import { ProtocolTestDialog } from '@/components/twa/protocol-test-dialog';
import { PricingSlider } from '@/components/twa/pricing-slider';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { toast } from 'sonner';

export default function AdminProtocolsPage() {
  const { protocols } = useManager();
  const { t } = useTwaI18n();
  const [openTest, setOpenTest] = useState(false);
  const [price, setPrice] = useState(2.5);
  const [profit, setProfit] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [port, setPort] = useState('443');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">{t('protocols')}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setOpenTest(true)}>
            {t('runTest')}
          </Button>
          <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
            {t('createProtocol')}
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="surface rounded-[var(--radius-lg)] p-4 space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Port" value={port} onChange={(e) => setPort(e.target.value)} />
          <Input label="Encryption" defaultValue="tls" />
          <PricingSlider label={t('pricing')} value={price} onChange={setPrice} />
          <PricingSlider
            label={t('sponsorProfit')}
            value={profit}
            onChange={setProfit}
            min={10}
            max={50}
          />
          <Button
            size="sm"
            onClick={() => {
              toast.success(`${name || 'protocol'}:${port} · ${price} DAI · ${profit}%`);
              setShowCreate(false);
            }}
          >
            Save
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--stroke)]">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--surface)] text-[var(--text-faint)]">
            <tr>
              <th className="px-3 py-2 text-start font-medium">Name</th>
              <th className="px-3 py-2 text-start font-medium">Port</th>
              <th className="px-3 py-2 text-start font-medium">Status</th>
              <th className="px-3 py-2 text-start font-medium">Ping</th>
              <th className="px-3 py-2 text-start font-medium">Site</th>
            </tr>
          </thead>
          <tbody>
            {protocols.map((p) => (
              <tr key={p.id} className="border-t border-[var(--stroke)]">
                <td className="px-3 py-2.5 font-medium">{p.name}</td>
                <td className="px-3 py-2.5 font-mono">{p.port}</td>
                <td className="px-3 py-2.5">
                  <span className={p.status === 'active' ? 'chip chip-live' : 'chip chip-warn'}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono">{p.pingMs ?? '—'} ms</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)]">{p.assignedSite || '—'}</td>
              </tr>
            ))}
            {!protocols.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-[var(--text-muted)]">
                  {t('noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DashboardBentoLayout>
        <BentoCell span={12}>
          <p className="text-[12px] text-[var(--text-muted)]">{t('scopedNote')}</p>
        </BentoCell>
      </DashboardBentoLayout>

      <ProtocolTestDialog open={openTest} onClose={() => setOpenTest(false)} />
    </div>
  );
}
