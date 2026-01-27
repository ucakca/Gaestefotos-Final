'use client';

import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, CheckCircle, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * ChallengesTab - v0-Style Challenges Tab
 * 
 * Displays active challenges for the event.
 * Simple card-based layout.
 */

export interface Challenge {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  participantCount?: number;
  isCompleted?: boolean;
  isActive?: boolean;
  categoryId?: string | null;
}

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
  // Filter active challenges
  const activeChallenges = challenges.filter((c) => c.isActive);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-app-fg mb-2">Event Challenges</h2>
        <p className="text-app-muted">
          Nimm an den Challenges teil und gewinne tolle Preise!
        </p>
      </div>

      {/* Challenge Cards */}
      {activeChallenges.map((challenge, index) => (
        <motion.div
          key={challenge.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onChallengeClick?.(challenge)}
        >
          {/* Challenge Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-app-fg mb-1">
                {challenge.title}
              </h3>
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

          {/* Challenge Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-app-muted">
            {challenge.deadline && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  Bis {new Date(challenge.deadline).toLocaleDateString('de-DE')}
                </span>
              </div>
            )}

            {(challenge.participantCount || 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{challenge.participantCount} Teilnehmer</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!challenge.isCompleted && (
            <div className="mt-4 pt-4 border-t border-app-border flex items-center gap-3">
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
                  const shareText = `Mach mit bei der Challenge "${challenge.title}"! 🏆`;
                  
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
        </motion.div>
      ))}
    </div>
  );
}
