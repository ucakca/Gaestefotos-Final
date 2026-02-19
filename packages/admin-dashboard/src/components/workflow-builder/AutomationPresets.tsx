'use client';

import type { AutomationPipeline } from './automationTypes';

let idCounter = 0;
function sid() { return `preset-step-${++idCounter}-${Date.now()}`; }

export interface AutomationPresetDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  pipeline: Omit<AutomationPipeline, 'id'>;
}

export const AUTOMATION_PRESETS: AutomationPresetDef[] = [
  {
    id: 'foto-upload-standard',
    name: 'Standard Foto-Upload',
    description: 'Qualitäts-Check → Auto-Tag → Host per Email benachrichtigen',
    icon: 'Upload',
    color: 'text-green-600',
    pipeline: {
      name: 'Standard Foto-Upload',
      description: 'Automatische Verarbeitung bei jedem Foto-Upload',
      isActive: true,
      trigger: { id: sid(), type: 'TRIGGER_PHOTO_UPLOADED', config: { source: 'any' } },
      steps: [
        { id: sid(), type: 'QUALITY_GATE', config: { minBlurScore: 50, minResolution: 640, checkDuplicates: true } },
        { id: sid(), type: 'AI_CATEGORIZE_PHOTO', config: { autoTag: true, confidenceThreshold: 0.7 } },
        { id: sid(), type: 'SEND_NOTIFICATION', config: { to: 'host', message: 'Neues Foto hochgeladen!' } },
      ],
    },
  },
  {
    id: 'ki-verarbeitung',
    name: 'KI-Verarbeitung',
    description: 'Foto-Upload → Style Transfer → In Album verschieben',
    icon: 'Wand2',
    color: 'text-violet-600',
    pipeline: {
      name: 'KI-Verarbeitung',
      description: 'Automatische KI-Bearbeitung bei Upload',
      isActive: true,
      trigger: { id: sid(), type: 'TRIGGER_PHOTO_UPLOADED', config: { source: 'booth' } },
      steps: [
        { id: sid(), type: 'AI_MODIFY', config: { prompt: 'Transform into a watercolor painting style', strength: 0.7 } },
        { id: sid(), type: 'MOVE_TO_ALBUM', config: { albumName: 'KI-Kunst' } },
      ],
    },
  },
  {
    id: 'event-recap',
    name: 'Event-Ende Recap',
    description: 'Nach Event-Ende → Danke-Email mit Galerie-Link an alle Gäste',
    icon: 'Heart',
    color: 'text-rose-600',
    pipeline: {
      name: 'Event-Ende Recap',
      description: 'Automatische Danke-Email wenn das Event endet',
      isActive: true,
      trigger: { id: sid(), type: 'TRIGGER_EVENT_END', config: {} },
      steps: [
        { id: sid(), type: 'DELAY', config: { duration: 30, unit: 'minutes' } },
        { id: sid(), type: 'SEND_EMAIL', config: { to: 'all_guests', subject: 'Danke für deine Teilnahme!', template: 'thank_you' } },
      ],
    },
  },
  {
    id: 'webhook-integration',
    name: 'Webhook-Integration',
    description: 'Bei Foto-Upload → Daten an externes System senden',
    icon: 'Webhook',
    color: 'text-blue-600',
    pipeline: {
      name: 'Webhook-Integration',
      description: 'Sendet Foto-Daten an ein externes System',
      isActive: true,
      trigger: { id: sid(), type: 'TRIGGER_PHOTO_UPLOADED', config: { source: 'any' } },
      steps: [
        { id: sid(), type: 'ADD_TAG', config: { tags: 'synced' } },
        { id: sid(), type: 'WEBHOOK', config: { url: 'https://example.com/webhook', method: 'POST' } },
      ],
    },
  },
  {
    id: 'moderiertes-event',
    name: 'Moderiertes Event',
    description: 'Qualitäts-Check → Bei Durchfall: Admin benachrichtigen, bei OK: Auto-Tag',
    icon: 'ShieldCheck',
    color: 'text-amber-600',
    pipeline: {
      name: 'Moderiertes Event',
      description: 'Fotos werden vor Veröffentlichung geprüft',
      isActive: true,
      trigger: { id: sid(), type: 'TRIGGER_PHOTO_UPLOADED', config: { source: 'any' } },
      steps: [
        { id: sid(), type: 'QUALITY_GATE', config: { minBlurScore: 60, minResolution: 800, checkDuplicates: true } },
        { id: sid(), type: 'ADD_TAG', config: { tags: 'geprüft, freigegeben' } },
        { id: sid(), type: 'SEND_NOTIFICATION', config: { to: 'host', message: 'Neues Foto geprüft und freigegeben' } },
      ],
    },
  },
];
