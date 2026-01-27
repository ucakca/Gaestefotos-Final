'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Clock, Heart, Sparkles, Building2, Users, ExternalLink, Phone, Mail, UtensilsCrossed, Music, ChevronRight, Wifi, Copy, Check, QrCode } from 'lucide-react';
import { Event as EventType } from '@gaestefotos/shared';
import { QRCodeSVG } from 'qrcode.react';

/**
 * InfoTab - Screenshot-Style Info Tab
 * 
 * Two tabs: Event Info & Betreiber
 * Clean card-based layout with timeline.
 */

export interface InfoTabProps {
  event: EventType;
  hostName?: string;
}

// Timeline item icons based on title
function getTimelineIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('empfang')) return <Users className="w-4 h-4" />;
  if (lower.includes('trauung') || lower.includes('zeremonie')) return <Calendar className="w-4 h-4" />;
  if (lower.includes('dinner') || lower.includes('essen') || lower.includes('abendessen')) return <UtensilsCrossed className="w-4 h-4" />;
  if (lower.includes('party') || lower.includes('tanz') || lower.includes('feier')) return <Music className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

// WiFi Card Component with QR Code
function WifiCard({ ssid, password }: { ssid: string; password?: string }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // WiFi QR Code format: WIFI:T:WPA;S:<SSID>;P:<password>;;
  const wifiString = password 
    ? `WIFI:T:WPA;S:${ssid};P:${password};;`
    : `WIFI:T:nopass;S:${ssid};;`;

  const copyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Wifi className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-bold text-gray-900">WLAN</h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">
        Verbinde dich mit dem Event-WLAN für schnellere Uploads:
      </p>

      {/* Network Name */}
      <div className="bg-gray-50 rounded-xl p-3 mb-3">
        <p className="text-xs text-gray-500 mb-1">Netzwerkname (SSID)</p>
        <p className="font-medium text-gray-900">{ssid}</p>
      </div>

      {/* Password with copy */}
      {password && (
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Passwort</p>
              <p className="font-medium text-gray-900 font-mono">{password}</p>
            </div>
            <button
              onClick={copyPassword}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Passwort kopieren"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Toggle */}
      <button
        onClick={() => setShowQR(!showQR)}
        className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
      >
        <QrCode className="w-4 h-4" />
        {showQR ? 'QR-Code ausblenden' : 'Mit QR-Code verbinden'}
      </button>

      {/* QR Code Display */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <QRCodeSVG value={wifiString} size={180} />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Scanne den QR-Code mit deiner Kamera-App
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InfoTab({
  event,
  hostName,
}: InfoTabProps) {
  const [activeTab, setActiveTab] = useState<'event' | 'betreiber'>('event');
  const designConfig = (event.designConfig as any) || {};
  const schedule = designConfig.schedule || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
      {/* Tab Switcher */}
      <div className="flex bg-gray-100 rounded-full p-1 mb-6">
        <button
          onClick={() => setActiveTab('event')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
            activeTab === 'event'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Event Info
        </button>
        <button
          onClick={() => setActiveTab('betreiber')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
            activeTab === 'betreiber'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Betreiber
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'event' ? (
          <motion.div
            key="event"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Event Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              {/* Title with Heart */}
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
              </div>

              {/* Host Name */}
              {hostName && (
                <p className="text-gray-600 mb-4">{hostName}</p>
              )}

              {/* Description */}
              {(event as any).profileDescription && (
                <p className="text-gray-600 leading-relaxed mb-6">
                  {(event as any).profileDescription}
                </p>
              )}

              {/* Datum */}
              {event.dateTime && (
                <div className="flex items-start gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Datum</p>
                    <p className="text-gray-600">
                      {new Date(event.dateTime).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Location */}
              {event.locationName && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-gray-600">{event.locationName}</p>
                    <a
                      href={event.locationGoogleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-sm mt-1"
                    >
                      In Google Maps öffnen
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Tagesablauf Card */}
            {schedule && schedule.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-bold text-gray-900">Tagesablauf</h3>
                </div>

                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

                  {/* Timeline Items */}
                  <div className="space-y-4">
                    {schedule.map((item: { time: string; title: string; description?: string }, index: number) => (
                      <div key={index} className="flex gap-4 relative">
                        {/* Icon Circle */}
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 z-10 text-red-500">
                          {getTimelineIcon(item.title)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          <p className="text-gray-500 text-sm">{item.time} Uhr</p>
                          {item.description && (
                            <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WLAN Card */}
            {designConfig.wifiSsid && (
              <WifiCard ssid={designConfig.wifiSsid} password={designConfig.wifiPassword} />
            )}

            {/* Kontakt Card */}
            {(designConfig.contactPhone || designConfig.contactEmail) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Kontakt</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Bei Fragen zum Event erreichst du uns hier:
                </p>
                <div className="space-y-2">
                  {designConfig.contactPhone && (
                    <a
                      href={`tel:${designConfig.contactPhone}`}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-900">{designConfig.contactPhone}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </a>
                  )}
                  {designConfig.contactEmail && (
                    <a
                      href={`mailto:${designConfig.contactEmail}`}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-900">{designConfig.contactEmail}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="betreiber"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* App Info Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📸</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Gästefotos</h3>
                  <p className="text-sm text-gray-500">Die Event-Foto-App</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Mit Gästefotos können alle Gäste ihre Fotos und Videos teilen. 
                Der Gastgeber erhält alle Erinnerungen an einem Ort.
              </p>

              <a
                href="https://gästefotos.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-sm font-medium"
              >
                Mehr erfahren
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Support Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Support</h3>
              <p className="text-gray-600 text-sm mb-4">
                Brauchst du Hilfe? Wir sind für dich da!
              </p>
              <div className="space-y-2">
                <a
                  href="https://wa.me/436641234567?text=Hallo%2C%20ich%20brauche%20Hilfe%20mit%20G%C3%A4stefotos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium">WhatsApp Support</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
                <a
                  href="mailto:support@gaestefotos.com"
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-900">E-Mail Support</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
              </div>
            </div>

            {/* Legal Links Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Rechtliches</h3>
              <div className="space-y-2">
                <a
                  href="/impressum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-red-500 text-sm"
                >
                  Impressum
                </a>
                <a
                  href="/datenschutz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-red-500 text-sm"
                >
                  Datenschutzerklärung
                </a>
                <a
                  href="/agb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-red-500 text-sm"
                >
                  Nutzungsbedingungen (AGB)
                </a>
                <a
                  href="/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-red-500 text-sm"
                >
                  Cookie-Richtlinie
                </a>
              </div>
            </div>

            {/* Version Info */}
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">
                Version 2.0 • Made with ❤️ in Vienna
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
