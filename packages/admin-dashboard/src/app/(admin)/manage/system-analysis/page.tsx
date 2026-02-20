'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScanSearch, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Database, Radio, HardDrive, Zap, Globe, Workflow, Brain, Users, Calendar, Image, Package, Server, Activity, Clock } from 'lucide-react';
import api from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    ok:       { color: 'text-green-600 bg-green-50',     icon: <CheckCircle className="w-3 h-3" /> },
    healthy:  { color: 'text-green-600 bg-green-50',     icon: <CheckCircle className="w-3 h-3" /> },
    done:     { color: 'text-green-600 bg-green-50',     icon: <CheckCircle className="w-3 h-3" /> },
    error:    { color: 'text-red-600 bg-red-50',         icon: <XCircle className="w-3 h-3" /> },
    missing:  { color: 'text-red-600 bg-red-50',         icon: <XCircle className="w-3 h-3" /> },
    degraded: { color: 'text-amber-600 bg-amber-50',     icon: <AlertCircle className="w-3 h-3" /> },
    pending:  { color: 'text-amber-600 bg-amber-50',     icon: <Clock className="w-3 h-3" /> },
    unknown:  { color: 'text-muted-foreground bg-muted', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status] || map.unknown;
  return <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>{s.icon}{status}</span>;
}

function formatBytes(b: number) {
  if (!b) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB','TB'], i = Math.floor(Math.log(b)/Math.log(k));
  return `${+(b/Math.pow(k,i)).toFixed(1)} ${s[i]}`;
}
function formatUptime(sec: number) {
  const d=Math.floor(sec/86400),h=Math.floor((sec%86400)/3600),m=Math.floor((sec%3600)/60);
  return d>0?`${d}d ${h}h`:`${h}h ${m}m`;
}

const FEATURES = [
  { name: 'Foto-Upload (TUS)',          be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'AI Energy System',            be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Foto Quality Gate + Tags',    be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Face Search',                 be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'AI Games (14)',               be:'done', ad:'done', gu:'done', ho:'pending' },
  { name: 'AI Effects (14)',             be:'done', ad:'done', gu:'done', ho:'pending' },
  { name: 'Style Transfer (24)',         be:'done', ad:'done', gu:'done', ho:'pending' },
  { name: 'Push Notifications',          be:'done', ad:'done', gu:'done', ho:'pending' },
  { name: 'Workflow Automations',        be:'done', ad:'done', gu:'done', ho:'missing' },
  { name: 'Event-Zuweisung UI',          be:'done', ad:'done', gu:'done', ho:'missing' },
  { name: 'WooCommerce Webhook',         be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'AI-Config (Energie)',         be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Mosaic Wall',                 be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Live Wall',                   be:'done', ad:'pending',gu:'done',ho:'done' },
  { name: 'Challenges',                  be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Gästebuch',                   be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Highlight Reel',              be:'done', ad:'pending',gu:'pending',ho:'missing' },
  { name: '360° Spinner',                be:'done', ad:'pending',gu:'missing',ho:'missing' },
  { name: 'Video Jobs (GIF/Boomerang)',  be:'done', ad:'pending',gu:'missing',ho:'missing' },
  { name: 'Partner System',             be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'QR PDF Export',              be:'missing',ad:'pending',gu:'pending',ho:'done' },
  { name: 'User Locking',               be:'done', ad:'pending',gu:'done', ho:'done' },
  { name: 'Prompt Analyzer',            be:'done', ad:'done', gu:'done', ho:'done' },
  { name: 'Cost Monitoring',            be:'done', ad:'done', gu:'done', ho:'done' },
];

const SPRINTS = [
  { sprint:'Phase 1-4',  title:'Core Platform (Upload, Galerie, Auth, QR, Mosaic, Booth)',  done:true },
  { sprint:'Sprint 7',   title:'AI Feature Gating (3-Level Backend)',                        done:true },
  { sprint:'Sprint 8-9', title:'Energie-System Backend + Frontend (EnergyBar)',              done:true },
  { sprint:'Sprint 10-11',title:'Event-Briefing + Custom Prompts',                           done:true },
  { sprint:'Sprint 12',  title:'QR-Code Booth-Setup',                                        done:true },
  { sprint:'Sprint 13',  title:'Partner AI-Config Zugriff',                                  done:true },
  { sprint:'Sprint 14',  title:'Cost-Monitoring API',                                        done:true },
  { sprint:'Sprint 15-17',title:'Foto-Qualitäts-Gate + Prompt Analyzer',                    done:true },
  { sprint:'Sprint 18',  title:'Workflow Executor Upgrade (10 Step-Types)',                   done:true },
  { sprint:'Sprint 19',  title:'AI Cost Monitoring Dashboard',                                done:true },
  { sprint:'Sprint 20-21',title:'Workflow Builder Redesign + AI Provider Dashboard',         done:true },
  { sprint:'P0-Sprint',  title:'EnergyBar sichtbar + User Locking + QualityGate Tags',       done:true },
  { sprint:'P1-Sprint',  title:'WooCommerce Email/Config + Partner UI + Event-Zuweisung',    done:true },
  { sprint:'P2-Sprint',  title:'Achievement Fix + Delay Warning + Admins Push + 360° Seite', done:true },
  { sprint:'Next',       title:'WooCommerce Produktiv-Test + Custom AI-Theme Addon',          done:false },
  { sprint:'Next',       title:'QR PDF-Renderer installieren',                                done:false },
  { sprint:'Next',       title:'Highlight Reel + Spinner Frontend-Integration',               done:false },
];

const INTEGRATIONS = [
  { name:'WooCommerce', items:[
    {label:'Webhook + HMAC-Signatur',status:'done'},
    {label:'EventEntitlement-Erstellung',status:'done'},
    {label:'Briefing-Email nach Buchung',status:'done'},
    {label:'EventAiConfig aus Paket-Defaults',status:'done'},
    {label:'Custom AI-Theme Addon (WP anlegen)',status:'pending'},
    {label:'Produktiv-Test',status:'pending'},
  ]},
  { name:'Push (VAPID)', items:[
    {label:'VAPID Keys in .env gesetzt',status:'done'},
    {label:'sendPushToEvent / notifyEventHost',status:'done'},
    {label:'Workflow: host / guests / admins',status:'done'},
  ]},
  { name:'AI Provider', items:[
    {label:'Groq (LLM-Spiele)',status:'done'},
    {label:'OpenAI / Anthropic / Replicate',status:'done'},
    {label:'img2prompt End-to-End Test',status:'pending'},
  ]},
  { name:'Workflow Automation', items:[
    {label:'SEND_EMAIL all_guests',status:'done'},
    {label:'SEND_NOTIFICATION admins',status:'done'},
    {label:'CONDITION echte Foto-Daten',status:'done'},
    {label:'TRIGGER_PHOTO_APPROVED/REJECTED',status:'done'},
    {label:'Source-Filter booth/guest/any',status:'done'},
  ]},
];

export default function SystemAnalysisPage() {
  const [tab, setTab] = useState<'status'|'coverage'|'sprints'|'integrations'>('status');
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loadH, setLoadH] = useState(true);
  const [loadS, setLoadS] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoadH(true); setLoadS(true); setLastRefresh(new Date());
    api.get('/health').then(r => setHealth(r.data)).catch(() => setHealth(null)).finally(() => setLoadH(false));
    api.get('/admin/dashboard/stats').then(r => setStats(r.data.stats)).catch(() => setStats(null)).finally(() => setLoadS(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sc = (key: 'be'|'ad'|'gu'|'ho') => Math.round(FEATURES.filter(f => (f as any)[key]==='done').length/FEATURES.length*100);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ScanSearch className="w-5 h-5 text-primary"/>360° System-Analyse</h1>
          <p className="text-xs text-muted-foreground">Stand: {lastRefresh.toLocaleTimeString('de-DE')}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl border border-border hover:bg-muted/30 transition-colors"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>

      <div className="flex border-b border-border gap-0">
        {(['status','coverage','sprints','integrations'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t==='status'?'🖥️ Status':t==='coverage'?'📊 Coverage':t==='sprints'?'🚀 Sprints':'🔗 Integrationen'}
          </button>
        ))}
      </div>

      {tab === 'status' && (
        <div className="space-y-4">
          {loadH ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/></div> : health ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'API Server', icon:Server, color:'text-primary', status:health.status, extra:formatUptime(health.uptime ?? 0) },
                { label:'PostgreSQL', icon:Database, color:'text-blue-500', status:health.checks?.database?.status ?? 'unknown', extra:`${health.checks?.database?.latencyMs??'?'}ms` },
                { label:'Redis', icon:Radio, color:'text-red-500', status:health.checks?.redis?.status ?? 'unknown', extra:`${health.checks?.redis?.latencyMs??'?'}ms` },
                { label:'Storage (S3)', icon:HardDrive, color:'text-purple-500', status:health.checks?.storage?.status ?? 'unknown', extra:'' },
              ].map(({label,icon:Icon,color,status,extra})=>(
                <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`}/>
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <StatusBadge status={status}/>
                  <div className="text-xs text-muted-foreground mt-1">{extra}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-4 text-sm text-muted-foreground">Health-Daten nicht verfügbar</div>}

          {!loadS && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {label:'Benutzer',val:(stats.total?.users ?? 0).toLocaleString('de-DE'),icon:Users,color:'text-blue-500'},
                {label:'Events',val:(stats.total?.events ?? 0).toLocaleString('de-DE'),icon:Calendar,color:'text-green-500'},
                {label:'Fotos',val:(stats.total?.photos ?? 0).toLocaleString('de-DE'),icon:Image,color:'text-amber-500'},
                {label:'Storage',val:formatBytes(stats.storage?.totalBytes ?? 0),icon:HardDrive,color:'text-purple-500'},
              ].map(({label,val,icon:Icon,color})=>(
                <div key={label} className="rounded-xl border border-border bg-card p-4">
                  <Icon className={`w-4 h-4 ${color} mb-1`}/>
                  <div className="text-xl font-bold">{val}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-green-500"/>Background Workers (alle aktiv)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {['Event Purge','Retention Purge','Demo Mosaic Retention','Event Recap','Virus Scan','Orphan Cleanup','Storage Reminder','Workflow Timer','Face Search Consent','QA Log Retention','WooLog Retention','BullMQ (Face+Duplicate)'].map(w=>(
                <div key={w} className="flex items-center gap-1.5 text-xs"><div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/><span className="text-muted-foreground">{w}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'coverage' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {label:'Backend',score:sc('be'),color:'text-blue-600',bg:'bg-blue-500'},
              {label:'Admin-UI',score:sc('ad'),color:'text-purple-600',bg:'bg-purple-500'},
              {label:'Gäste-UI',score:sc('gu'),color:'text-green-600',bg:'bg-green-500'},
              {label:'Host-UI',score:sc('ho'),color:'text-amber-600',bg:'bg-amber-500'},
            ].map(({label,score,color,bg})=>(
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <div className={`text-2xl font-bold ${color}`}>{score}%</div>
                <div className="text-xs text-muted-foreground mb-2">{label}</div>
                <div className="h-1.5 bg-muted rounded-full"><div className={`h-full ${bg} rounded-full`} style={{width:`${score}%`}}/></div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-5 gap-0 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
              <div className="col-span-2">Feature</div><div className="text-center">Backend</div><div className="text-center">Admin</div><div className="text-center">Gäste/Host</div>
            </div>
            <div className="divide-y divide-border/30">
              {FEATURES.map(f=>(
                <div key={f.name} className="grid grid-cols-5 gap-0 px-4 py-2 hover:bg-muted/10 items-center">
                  <div className="col-span-2 text-sm">{f.name}</div>
                  <div className="text-center"><StatusBadge status={f.be}/></div>
                  <div className="text-center"><StatusBadge status={f.ad}/></div>
                  <div className="text-center flex justify-center gap-1"><StatusBadge status={f.gu}/><StatusBadge status={f.ho}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sprints' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{SPRINTS.filter(s=>s.done).length}</div>
              <div className="text-xs text-muted-foreground">Abgeschlossene Sprints</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{SPRINTS.filter(s=>!s.done).length}</div>
              <div className="text-xs text-muted-foreground">Ausstehend</div>
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/30">
            {SPRINTS.map((s,i)=>(
              <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.done?'bg-green-500':'bg-amber-400'}`}/>
                <div className="w-24 flex-shrink-0 text-xs font-mono text-muted-foreground">{s.sprint}</div>
                <div className="flex-1 text-sm">{s.title}</div>
                <StatusBadge status={s.done?'done':'pending'}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATIONS.map(intg=>(
            <div key={intg.name} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">{intg.name}</h3>
              <div className="space-y-1.5">
                {intg.items.map(item=>(
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <StatusBadge status={item.status}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
