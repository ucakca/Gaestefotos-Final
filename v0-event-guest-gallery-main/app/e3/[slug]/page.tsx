"use client";

import { useState, useCallback, useEffect } from "react";
import { EventHero } from "@/components/event/event-hero";
import { AlbumFilter } from "@/components/event/album-filter";
import { PhotoGrid } from "@/components/event/photo-grid";
import { PhotoLightbox } from "@/components/event/photo-lightbox";
import { BottomNav } from "@/components/event/bottom-nav";
import { UploadFAB } from "@/components/event/upload-fab";
import { UploadModal } from "@/components/event/upload-modal";
import { ChallengesTab } from "@/components/event/tabs/challenges-tab";
import { GuestbookTab } from "@/components/event/tabs/guestbook-tab";
import { InfoTab } from "@/components/event/tabs/info-tab";
import { StoryViewer, type StoryGroup } from "@/components/event/story-viewer";
import {
  PhotoSkeleton,
  HeroSkeleton,
  AlbumFilterSkeleton,
} from "@/components/event/photo-skeleton";
import { PullToRefreshIndicator } from "@/components/event/pull-to-refresh";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { StickyHeader, useScrollHeader } from "@/components/event/sticky-header";
import { JumpToTop } from "@/components/event/jump-to-top";
import { QRCodeShare } from "@/components/event/qr-code-share";
import { SlideshowMode } from "@/components/event/slideshow-mode";


// Demo data
const demoEvent = {
  coverImage:
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
  hostAvatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
  hostName: "Sarah & Max",
  eventTitle: "Unsere Hochzeit",
  welcomeMessage:
    "Wir freuen uns so sehr, diesen besonderen Tag mit euch zu feiern! Teilt eure schönsten Momente mit uns und lasst uns gemeinsam unvergessliche Erinnerungen schaffen.",
  location: "Schloss Schönbrunn, Schönbrunner Schloßstraße 47, 1130 Wien",
  date: "15. März 2025",
  guestCount: 124,
  photoCount: 456,
  schedule: [
    { time: "14:00", title: "Trauung in der Schlosskapelle" },
    { time: "15:30", title: "Sektempfang im Garten" },
    { time: "17:00", title: "Fotosession" },
    { time: "18:30", title: "Abendessen" },
    { time: "21:00", title: "Eröffnungstanz" },
    { time: "22:00", title: "Party & Tanz" },
  ],
  dressCode: "Festlich elegant - Farben: Alles außer Weiß",
  wishlistUrl: "https://www.amazon.de/wedding/sarah-max",
};

// Demo stories
const demoStoryGroups: StoryGroup[] = [
  {
    userId: "host",
    userName: "Sarah & Max",
    userAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    isViewed: false,
    stories: [
      {
        id: "s1",
        type: "image",
        src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1080&q=80",
        userName: "Sarah & Max",
        userAvatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
        createdAt: "vor 2 Std.",
        duration: 5,
        likes: 42,
        isLiked: false,
      },
      {
        id: "s2",
        type: "image",
        src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1080&q=80",
        userName: "Sarah & Max",
        userAvatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
        createdAt: "vor 1 Std.",
        duration: 5,
        likes: 38,
        isLiked: true,
      },
      {
        id: "s3",
        type: "image",
        src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1080&q=80",
        userName: "Sarah & Max",
        userAvatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
        createdAt: "vor 30 Min.",
        duration: 5,
        likes: 25,
        isLiked: false,
      },
    ],
  },
  {
    userId: "guest1",
    userName: "Anna M.",
    userAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    isViewed: false,
    stories: [
      {
        id: "s4",
        type: "image",
        src: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1080&q=80",
        userName: "Anna M.",
        userAvatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
        createdAt: "vor 45 Min.",
        duration: 5,
        likes: 15,
        isLiked: false,
      },
    ],
  },
];

// Event info for Info Tab
const eventInfo = {
  title: "Unsere Hochzeit",
  hostName: "Sarah & Max",
  date: "15. März 2025",
  location: "Schloss Schönbrunn, Wien",
  locationUrl: "https://maps.google.com/?q=Schloss+Schönbrunn+Wien",
  description:
    "Wir freuen uns so sehr, diesen besonderen Tag mit euch zu feiern! Teilt eure schönsten Momente mit uns und lasst uns gemeinsam unvergessliche Erinnerungen schaffen.",
  schedule: [
    {
      time: "14:00",
      title: "Empfang",
      icon: "users",
      description: "Sektempfang im Garten",
    },
    {
      time: "15:00",
      title: "Trauung",
      icon: "calendar",
      description: "Zeremonie in der Orangerie",
    },
    {
      time: "17:00",
      title: "Dinner",
      icon: "food",
      description: "Festliches Abendessen",
    },
    {
      time: "20:00",
      title: "Party",
      icon: "music",
      description: "Tanzen bis in die Nacht",
    },
  ],
  contactPhone: "+43 123 456 789",
  contactEmail: "sarah.max@hochzeit.at",
  wishlistUrl: "https://amazon.de/wishlist/example",
};

// Operator info for Info Tab
const operatorInfo = {
  companyName: "Gästefotos GmbH",
  address: "Musterstraße 1\n1010 Wien\nÖsterreich",
  uid: "ATU12345678",
  registrationNumber: "FN 123456a",
  email: "support@gaestefotos.at",
  phone: "+43 1 234 5678",
};

// Albums with icons (icon key defined by host in dashboard)
const demoAlbums = [
  { id: "all", name: "Alle Fotos", count: 156, icon: "images" },
  { id: "ceremony", name: "Trauung", count: 42, icon: "church" },
  { id: "party", name: "Feier", count: 78, icon: "party" },
  { id: "dancing", name: "Tanzen", count: 36, icon: "music" },
];

const demoPhotos = [
  {
    id: "1",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    width: 600,
    height: 400,
    likes: 24,
    isLiked: true,
    uploaderName: "Anna M.",
    uploadedAt: "vor 2 Stunden",
    isOwner: false,
    comments: [
      {
        id: "c1",
        userName: "Lisa W.",
        text: "Wunderschön!",
        createdAt: "vor 1 Stunde",
      },
      {
        id: "c2",
        userName: "Thomas K.",
        text: "Das Licht ist perfekt eingefangen",
        createdAt: "vor 30 Min",
      },
    ],
  },
  {
    id: "2",
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    width: 600,
    height: 800,
    likes: 18,
    isLiked: false,
    isOwner: false,
    comments: [],
  },
  {
    id: "3",
    src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80",
    width: 600,
    height: 450,
    likes: 32,
    isLiked: false,
    isOwner: true,
    comments: [],
  },
  {
    id: "4",
    src: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80",
    width: 600,
    height: 900,
    likes: 15,
    isLiked: true,
    isOwner: false,
    comments: [],
  },
  {
    id: "5",
    src: "https://images.unsplash.com/photo-1606216794074-730e3918a45a?w=600&q=80",
    width: 600,
    height: 400,
    likes: 21,
    isLiked: false,
    isOwner: false,
    comments: [],
  },
  {
    id: "6",
    src: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80",
    width: 600,
    height: 600,
    likes: 28,
    isLiked: false,
    isOwner: false,
    comments: [],
  },
  {
    id: "7",
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    width: 600,
    height: 750,
    likes: 19,
    isLiked: true,
    isOwner: false,
    comments: [],
  },
  {
    id: "8",
    src: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=600&q=80",
    width: 600,
    height: 400,
    likes: 35,
    isLiked: false,
    isOwner: false,
    comments: [],
  },
  {
    id: "9",
    src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80",
    width: 600,
    height: 500,
    likes: 12,
    isLiked: false,
    isOwner: false,
    comments: [],
  },
  {
    id: "10",
    src: "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=600&q=80",
    width: 600,
    height: 850,
    likes: 27,
    isLiked: false,
    isOwner: false,
    comments: [],
  },
];

type Tab = "feed" | "challenges" | "guestbook" | "info";

export default function EventPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [activeAlbum, setActiveAlbum] = useState("all");
  const [photos, setPhotos] = useState(demoPhotos);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyGroups, setStoryGroups] = useState(demoStoryGroups);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  

  // Sticky header and scroll
  const { isHeaderVisible, showJumpToTop, scrollToTop } = useScrollHeader(300);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Pull to refresh
  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // In real app: fetch new photos from API
  };

  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: activeTab !== "feed",
  });

  const handlePhotoClick = useCallback(
    (photoId: string) => {
      const index = photos.findIndex((p) => p.id === photoId);
      if (index !== -1) {
        setLightboxIndex(index);
        setLightboxOpen(true);
      }
    },
    [photos]
  );

  const handleLike = useCallback((photoId: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              isLiked: !photo.isLiked,
              likes: photo.isLiked ? photo.likes - 1 : photo.likes + 1,
            }
          : photo
      )
    );
  }, []);

  const handleComment = useCallback(
    (photoId: string, comment: string, userName: string) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                comments: [
                  ...(photo.comments || []),
                  {
                    id: `c${Date.now()}`,
                    userName,
                    text: comment,
                    createdAt: "gerade eben",
                  },
                ],
              }
            : photo
        )
      );
    },
    []
  );

  const handleDownload = useCallback((photoId: string) => {
    const photo = demoPhotos.find((p) => p.id === photoId);
    if (photo) {
      // Create a temporary link to download
      const link = document.createElement("a");
      link.href = photo.src;
      link.download = `photo-${photoId}.jpg`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  const handleShare = useCallback(async (photoId: string) => {
    const photo = demoPhotos.find((p) => p.id === photoId);
    if (!photo) return;

    const shareUrl = `${window.location.origin}/photo/${photoId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Event Foto",
          text: "Schau dir dieses Foto an!",
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  }, []);

  const handleDelete = useCallback((photoId: string) => {
    if (confirm("Möchtest du dieses Foto wirklich löschen?")) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  }, []);

  const handleReport = useCallback((photoId: string) => {
    alert(`Foto ${photoId} wurde gemeldet. Danke für deine Mithilfe!`);
  }, []);

  const handleUpload = async (file: File, uploaderName?: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // In real app: upload to server
  };

  const handleViewStories = () => {
    setStoryViewerOpen(true);
  };

  const handleStoryLike = (storyId: string) => {
    setStoryGroups((prev) =>
      prev.map((group) => ({
        ...group,
        stories: group.stories.map((story) =>
          story.id === storyId
            ? {
                ...story,
                isLiked: !story.isLiked,
                likes: story.isLiked
                  ? (story.likes || 1) - 1
                  : (story.likes || 0) + 1,
              }
            : story
        ),
      }))
    );
  };

  const handleStoryReply = (storyId: string, message: string) => {
    // In real app: send reply to server
  };



  const eventUrl =
    typeof window !== "undefined"
      ? window.location.href
      : "https://gaestefotos.at/e/sarah-max-hochzeit";

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen bg-background pb-24 overflow-y-auto"
    >
      {/* Sticky Header (appears on scroll) */}
      <StickyHeader
        hostAvatar={demoEvent.hostAvatar}
        eventTitle={demoEvent.eventTitle}
        hostName={demoEvent.hostName}
        isVisible={isHeaderVisible && activeTab === "feed" && !isLoading}
        onScrollToTop={scrollToTop}
        onSlideshow={() => setSlideshowOpen(true)}
        onShare={() => setQrCodeOpen(true)}
      />

      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
      />

      {/* Content with pull offset */}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {activeTab === "feed" && (
          <>
            {isLoading ? (
              <>
                <HeroSkeleton />
                <AlbumFilterSkeleton />
                <PhotoSkeleton count={8} className="py-4" />
              </>
            ) : (
              <>
<EventHero
  coverImage={demoEvent.coverImage}
  hostAvatar={demoEvent.hostAvatar}
  hostName={demoEvent.hostName}
  eventTitle={demoEvent.eventTitle}
  welcomeMessage={demoEvent.welcomeMessage}
  location={demoEvent.location}
  date={demoEvent.date}
  guestCount={demoEvent.guestCount}
  photoCount={demoEvent.photoCount}
  hasActiveStory={storyGroups.some((g) => !g.isViewed)}
  schedule={demoEvent.schedule}
  dressCode={demoEvent.dressCode}
  wishlistUrl={demoEvent.wishlistUrl}
  dashboardUrl="/events3/demo-event"
  onAddStory={() => setUploadModalOpen(true)}
  onViewStories={handleViewStories}
  onShare={() => setQrCodeOpen(true)}
/>

                <AlbumFilter
                  albums={demoAlbums}
                  activeAlbum={activeAlbum}
                  onAlbumChange={setActiveAlbum}
                  className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b mt-2"
                />

                <PhotoGrid
                  photos={photos}
                  onPhotoClick={handlePhotoClick}
                  onLike={handleLike}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  onReport={handleReport}
                  className="py-4"
                />
              </>
            )}
          </>
        )}

        {activeTab === "challenges" && <ChallengesTab />}

        {activeTab === "guestbook" && <GuestbookTab />}

        {activeTab === "info" && (
          <InfoTab eventInfo={eventInfo} operatorInfo={operatorInfo} eventSlug="demo-event" />
        )}
      </div>

      {/* Story Viewer */}
      <StoryViewer
        storyGroups={storyGroups}
        isOpen={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        onLike={handleStoryLike}
        onReply={handleStoryReply}
      />

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={photos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
        onLike={handleLike}
        onComment={handleComment}
        onDownload={handleDownload}
        onShare={handleShare}
      />

      {/* QR Code Share Modal */}
      <QRCodeShare
        eventUrl={eventUrl}
        eventTitle={demoEvent.eventTitle}
        isOpen={qrCodeOpen}
        onClose={() => setQrCodeOpen(false)}
      />

      {/* Slideshow Mode */}
      <SlideshowMode
        photos={photos}
        isOpen={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
      />

      {/* Jump to Top Button */}
      <JumpToTop
        isVisible={showJumpToTop && activeTab === "feed" && !isLoading}
        onClick={scrollToTop}
      />

      {/* Upload FAB */}
      <UploadFAB
        isVisible={activeTab === "feed" && !isLoading}
        onUploadPhoto={() => setUploadModalOpen(true)}
        onTakePhoto={() => setUploadModalOpen(true)}
        onRecordVideo={() => setUploadModalOpen(true)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
