#!/bin/bash
# V0 Integration Script - Saubere Integration der v0 Components

SOURCE="/root/gaestefotos-app-v2/packages/frontend/src/app/e2/[slug]/page.tsx"
TARGET="/root/gaestefotos-app-v2/packages/frontend/src/app/e3/[slug]/page.tsx"

# 1. Clean start - copy e2 to e3
cp "$SOURCE" "$TARGET"
echo "✓ Copied clean e2 version to e3"

# 2. Add v0 component imports after StoriesBar line
sed -i '/import StoriesBar/a\
import StickyHeader from '\''@/components/e3/StickyHeader'\'';\
import JumpToTop from '\''@/components/e3/JumpToTop'\'';\
import UploadFAB from '\''@/components/e3/UploadFAB'\'';\
import QRCodeShare from '\''@/components/e3/QRCodeShare'\'';\
import SlideshowMode from '\''@/components/e3/SlideshowMode'\'';' "$TARGET"
echo "✓ Added v0 component imports"

# 3. Add useScrollHeader hook import after useGuestEventData line
sed -i '/import { useGuestEventData }/a\
import { useScrollHeader } from '\''@/hooks/useScrollHeader'\'';' "$TARGET"
echo "✓ Added useScrollHeader import"

# 4. Add state variables after selectedAlbum line
sed -i '/const \[selectedAlbum, setSelectedAlbum\] = useState<string \| null>(null);/a\
  const [qrCodeOpen, setQrCodeOpen] = useState(false);\
  const [slideshowOpen, setSlideshowOpen] = useState(false);' "$TARGET"
echo "✓ Added v0 state variables"

# 5. Add useScrollHeader hook after loadMoreRef line
sed -i '/const loadMoreRef = useRef<HTMLDivElement \| null>(null);/a\
  const { isHeaderVisible, showJumpToTop, scrollToTop } = useScrollHeader(300);' "$TARGET"
echo "✓ Added useScrollHeader hook"

# 6. Replace opening div with main + StickyHeader
sed -i 's|  return (|  return (|' "$TARGET"
sed -i 's|    <div className="min-h-screen bg-app-bg">|    <main className="relative min-h-screen bg-app-bg">\
      <StickyHeader\
        hostAvatar={event?.designConfig?.profileImage || '\''/placeholder.svg'\''}\
        eventTitle={event?.title || '\'''\''}\
        hostName={hostName || '\''Host'\''}\
        isVisible={isHeaderVisible \&\& !loading}\
        onScrollToTop={scrollToTop}\
        onSlideshow={() => setSlideshowOpen(true)}\
        onShare={() => setQrCodeOpen(true)}\
      />\
      <div className="min-h-screen bg-app-bg">|' "$TARGET"
echo "✓ Added StickyHeader"

# 7. Add v0 components before final closing tags
sed -i 's|    </div>|    </div>\
\
    <JumpToTop\
      isVisible={showJumpToTop \&\& !loading}\
      onClick={scrollToTop}\
    />\
\
    <UploadFAB\
      isVisible={!loading \&\& !uploadDisabled \&\& !isStorageLocked}\
      onUploadPhoto={() => {}}\
      onTakePhoto={() => {}}\
    />\
\
    <QRCodeShare\
      eventUrl={typeof window !== '\''undefined'\'' ? window.location.origin + '\''/e3/'\'' + slug : '\'''\''}\
      eventTitle={event?.title || '\'''\''}\
      isOpen={qrCodeOpen}\
      onClose={() => setQrCodeOpen(false)}\
    />\
\
    <SlideshowMode\
      photos={filteredPhotos}\
      isOpen={slideshowOpen}\
      onClose={() => setSlideshowOpen(false)}\
    />\
  </main>|' "$TARGET"
echo "✓ Added v0 components before closing"

echo ""
echo "✅ V0 Integration complete!"
echo "Lines in file: $(wc -l < "$TARGET")"
