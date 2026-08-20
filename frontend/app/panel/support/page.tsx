'use client';

import { MessageCircle, ExternalLink, Shield, Sparkles, BookOpen } from 'lucide-react';
import { Card, CardHeader, Button } from '@/components';
import { useI18n } from '@/lib/i18n';

const TG = 'https://t.me/MRROBOT_DT';

export default function SupportPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{t('supportTitle')}</h1>
        <p className="text-zinc-500 mt-1">{t('supportDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
          <CardHeader title="Telegram support" />
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-sky-400" />
              </div>
              <div>
                <p className="font-black text-lg">{t('telegramId')}</p>
                <p className="text-xs text-zinc-500">MRROBOT_DT</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              For install help, config issues, subscription or deploy — message us directly.
            </p>
            <a href={TG} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <ExternalLink size={16} />
                {t('openTelegram')}
              </Button>
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('quickTips')} />
          <ul className="space-y-3">
            {[
              { icon: Sparkles, text: t('tip1') },
              { icon: BookOpen, text: t('tip2') },
              { icon: Shield, text: t('tip3') },
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80"
              >
                <item.icon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-300">{item.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Node Agent on the VPS"
          description="After enroll on Nodes, run this on the VPS (panel shell installer is deprecated)"
        />
        <code className="block text-xs sm:text-sm font-mono text-emerald-400 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto">
          bash scripts/node-agent.sh https://YOUR_WORKER.workers.dev xrm_node_TOKEN
        </code>
      </Card>
    </div>
  );
}
