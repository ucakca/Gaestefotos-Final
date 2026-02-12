'use client';

import { motion } from 'framer-motion';
import { Trophy, Users, CheckCircle, Clock, Share2, Bomb, Landmark, Swords, BookOpen, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * ChallengesTab - v0-Style Challenges Tab
 * 
 * Displays active challenges for the event.
 * Supports game types: PHOTO, PHOTOBOMB, STATUE, TEAM_BATTLE, COVER_SHOOT
 */

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type?: 'PHOTO' | 'PHOTOBOMB' | 'STATUE' | 'TEAM_BATTLE' | 'COVER_SHOOT';
  gameConfig?: any;
  icon?: string;
  deadline?: string;
  participantCount?: number;
  isCompleted?: boolean;
  isActive?: boolean;
  categoryId?: string | null;
  completions?: any[];
}

const TYPE_CONFIG: Record<string, { icon: any; gradient: string; badge: string; badgeColor: string }> = {
  PHOTOBOMB: { icon: Bomb, gradient: 'from-red-500 to-pink-500', badge: 'Spiel', badgeColor: 'bg-red-100 text-red-700' },
  STATUE: { icon: Landmark, gradient: 'from-purple-500 to-indigo-500', badge: 'Spiel', badgeColor: 'bg-purple-100 text-purple-700' },
  TEAM_BATTLE: { icon: Swords, gradient: 'from-blue-500 to-cyan-500', badge: 'Team', badgeColor: 'bg-blue-100 text-blue-700' },
  COVER_SHOOT: { icon: BookOpen, gradient: 'from-emerald-500 to-teal-500', badge: 'Spiel', badgeColor: 'bg-emerald-100 text-emerald-700' },
  PHOTO: { icon: Camera, gradient: 'from-yellow-500 to-orange-500', badge: '', badgeColor: '' },
};

export interface ChallengesTabProps {
  challenges: Challenge[];
  eventId: string;
  onChallengeClick?: (challenge: Challenge) => void;
}

export default function ChallengesTab({
  challenges,
  eventId,
  onChallengeClick,
}: ChallengesTabProps) {
  const activeChallenges = challenges.filter((c) => c.isActive);
  const gameChallenges = activeChallenges.filter((c) => c.type && c.type !== 'PHOTO');
  const photoChallenges = activeChallenges.filter((c) => !c.type || c.type === 'PHOTO');

  if (activeChallenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-4"
        >
          <Trophy className="w-12 h-12 text-yellow-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-app-fg mb-2">Keine Challenges</h3>
        <p className="text-app-muted max-w-sm">
          Aktuell gibt es keine aktiven Challenges für dieses Event.
        </p>
      </div>
    );
  }

  const renderChallengeCard = (challenge: Challenge, index: number) => {
    const typeConfig = TYPE_CONFIG[challenge.type || 'PHOTO'] || TYPE_CONFIG.PHOTO;
    const Icon = typeConfig.icon;
    const completionCount = challenge.completions?.length || challenge.participantCount || 0;

    return (
      <motion.div
        key={challenge.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        className="bg-app-card border border-app-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onChallengeClick?.(challenge)}
      >
        <div className="p-5">
          <div className="flex items-start gap-4 mb-3">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center shadow-sm`}>
              <Icon className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-app-fg truncate">
                  {challenge.title}
                </h3>
                {typeConfig.badge && (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${typeConfig.badgeColor} whitespace-nowrap`}>
                    {typeConfig.badge}
                  </span>
                )}
              </div>
              <p className="text-app-muted text-sm line-clamp-2">
                {challenge.description}
              </p>
            </div>

            {challenge.isCompleted && (
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            )}
          </div>

          {/* Game-specific hints */}
          {challenge.type === 'PHOTOBOMB' && challenge.gameConfig?.requiredPhotos && (
            <div className="mb-3 text-xs text-app-muted bg-app-bg rounded-lg px-3 py-2">
              Ziel: Tauche in <strong>{challenge.gameConfig.requiredPhotos} Fotos</strong> anderer Gäste auf!
            </div>
          )}
          {challenge.type === 'STATUE' && challenge.gameConfig?.suggestions && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(challenge.gameConfig.suggestions as string[]).slice(0, 3).map((s: string, i: number) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                  {s}
                </span>
              ))}
            </div>
          )}
          {challenge.type === 'TEAM_BATTLE' && challenge.gameConfig?.teams && (
            <div className="mb-3 flex gap-2">
              {(challenge.gameConfig.teams as Array<{ name: string; color: string }>).map((team, i) => (
                <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: team.color }}>
                  {team.name}
                </span>
              ))}
            </div>
          )}
          {challenge.type === 'COVER_SHOOT' && challenge.gameConfig?.overlays && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(challenge.gameConfig.overlays as Array<{ name: string; color: string; textColor: string }>).slice(0, 4).map((mag, i) => (
                <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: mag.color, color: mag.textColor }}>
                  {mag.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-app-muted">
            {challenge.deadline && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  Bis {new Date(challenge.deadline).toLocaleDateString('de-DE')}
                </span>
              </div>
            )}

            {completionCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{completionCount} Teilnehmer</span>
              </div>
            )}
          </div>

          {!challenge.isCompleted && (
            <div className="mt-4 pt-3 border-t border-app-border flex items-center gap-3">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onChallengeClick?.(challenge);
                }}
              >
                Jetzt mitmachen
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  const shareUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}${window.location.pathname}?tab=challenges&challenge=${challenge.id}`
                    : '';
                  const shareText = `Mach mit bei der Challenge "${challenge.title}"!`;
                  
                  if (navigator.share) {
                    navigator.share({
                      title: challenge.title,
                      text: shareText,
                      url: shareUrl,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Einladen
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-app-fg mb-2">Event Challenges</h2>
        <p className="text-app-muted">
          Nimm an den Challenges teil und gewinne tolle Preise!
        </p>
      </div>

      {/* Game Challenges Section */}
      {gameChallenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-app-muted uppercase tracking-wider">Spiele</h3>
          {gameChallenges.map((c, i) => renderChallengeCard(c, i))}
        </div>
      )}

      {/* Photo Challenges Section */}
      {photoChallenges.length > 0 && (
        <div className="space-y-3">
          {gameChallenges.length > 0 && (
            <h3 className="text-sm font-bold text-app-muted uppercase tracking-wider mt-6">Foto-Challenges</h3>
          )}
          {photoChallenges.map((c, i) => renderChallengeCard(c, i + gameChallenges.length))}
        </div>
      )}
    </div>
  );
}
