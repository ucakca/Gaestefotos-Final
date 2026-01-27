#!/bin/bash
# Fix Prisma Schema - Move GuestGroup before Event

cd /root/gaestefotos-app-v2/packages/backend

# Extract GuestGroup model (lines 36-50)
sed -n '36,50p' prisma/schema.prisma > /tmp/guestgroup.txt

# Delete GuestGroup from current position
sed -i '36,50d' prisma/schema.prisma

# Insert GuestGroup after User model (after line 34, now shifted)
# After deleting 15 lines, line 34 becomes the target
sed -i '34 r /tmp/guestgroup.txt' prisma/schema.prisma

echo "✓ GuestGroup model moved before Event model"
echo "Running prisma generate..."

npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Generate successful!"
else
    echo "❌ Prisma Generate failed"
    exit 1
fi
