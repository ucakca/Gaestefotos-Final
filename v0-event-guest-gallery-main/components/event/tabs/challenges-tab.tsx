"use client";

import { Trophy, Camera, Users, Heart, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  points: number;
  progress: number;
  total: number;
  isCompleted: boolean;
}

const challenges: Challenge[] = [
  {
    id: "1",
    title: "Fotograf des Tages",
    description: "Lade 5 Fotos hoch",
    icon: Camera,
    points: 50,
    progress: 3,
    total: 5,
    isCompleted: false,
  },
  {
    id: "2",
    title: "Social Butterfly",
    description: "Erscheine auf 10 Fotos",
    icon: Users,
    points: 75,
    progress: 10,
    total: 10,
    isCompleted: true,
  },
  {
    id: "3",
    title: "Like-Sammler",
    description: "Sammle 25 Likes auf deine Fotos",
    icon: Heart,
    points: 100,
    progress: 18,
    total: 25,
    isCompleted: false,
  },
  {
    id: "4",
    title: "Story-Star",
    description: "Erstelle 3 Stories",
    icon: Star,
    points: 60,
    progress: 1,
    total: 3,
    isCompleted: false,
  },
];

export function ChallengesTab() {
  const totalPoints = challenges.reduce(
    (acc, c) => acc + (c.isCompleted ? c.points : 0),
    0
  );

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary">{totalPoints} Punkte</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Foto Challenges</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sammle Punkte und werde zum Event-Star!
        </p>
      </div>

      {/* Challenges List */}
      <div className="space-y-3">
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          const progressPercent = (challenge.progress / challenge.total) * 100;

          return (
            <Card
              key={challenge.id}
              className={cn(
                "transition-all",
                challenge.isCompleted && "bg-primary/5 border-primary/20"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
                      challenge.isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate">{challenge.title}</h3>
                      <Badge
                        variant={challenge.isCompleted ? "default" : "secondary"}
                        className="flex-shrink-0"
                      >
                        +{challenge.points}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {challenge.description}
                    </p>

                    <div className="mt-3 space-y-1.5">
                      <Progress value={progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {challenge.progress} / {challenge.total}
                        {challenge.isCompleted && (
                          <span className="ml-2 text-primary font-medium">
                            Abgeschlossen!
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
