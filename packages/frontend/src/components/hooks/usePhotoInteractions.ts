'use client';

import { useState } from 'react';
import api from '@/lib/api';

const REACTIONS: Array<{ key: string; label: string }> = [
  { key: 'heart', label: '❤️' },
  { key: 'laugh', label: '😂' },
  { key: 'wow', label: '😮' },
  { key: 'fire', label: '🔥' },
  { key: 'clap', label: '👏' },
];

const REACTION_KEYS = new Set(REACTIONS.map((r) => r.key));

export { REACTIONS, REACTION_KEYS };

export function usePhotoInteractions() {
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string | null>>({});
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [customReactionInput, setCustomReactionInput] = useState('');
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadLikeCount = async (photoId: string) => {
    try {
      const response = await api.get(`/photos/${photoId}/likes`);
      setLikeCounts((prev) => ({
        ...prev,
        [photoId]: response.data.likeCount || 0,
      }));
      const liked = response.data?.liked ?? response.data?.isLiked;
      if (liked) {
        setLikedPhotos((prev) => new Set(prev).add(photoId));
      }

      const rt = typeof response.data?.reactionType === 'string' ? response.data.reactionType : null;
      setMyReactions((prev) => ({ ...prev, [photoId]: rt }));
      if (response.data?.reactionCounts && typeof response.data.reactionCounts === 'object') {
        setReactionCounts((prev) => ({ ...prev, [photoId]: response.data.reactionCounts }));
      }
    } catch (err) {
      void err;
    }
  };

  const toggleLike = async (photoId: string, reactionType?: string) => {
    try {
      const response = await api.post(`/photos/${photoId}/like`, reactionType ? { reactionType } : undefined);
      setLikedPhotos((prev) => {
        const newSet = new Set(prev);
        if (response.data.liked) {
          newSet.add(photoId);
        } else {
          newSet.delete(photoId);
        }
        return newSet;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [photoId]: response.data.likeCount || 0,
      }));

      const rt = typeof response.data?.reactionType === 'string' ? response.data.reactionType : null;
      setMyReactions((prev) => ({ ...prev, [photoId]: rt }));
      if (response.data?.reactionCounts && typeof response.data.reactionCounts === 'object') {
        setReactionCounts((prev) => ({ ...prev, [photoId]: response.data.reactionCounts }));
      }

      // Clear input if we just sent a custom emoji reaction.
      if (reactionType && !REACTION_KEYS.has(reactionType)) {
        setCustomReactionInput('');
      }
    } catch (err) {
      void err;
    }
  };

  const loadComments = async (photoId: string) => {
    if (loadingComments.has(photoId) || comments[photoId]) {
      return; // Already loading or loaded
    }

    try {
      setLoadingComments((prev) => new Set(prev).add(photoId));
      const response = await api.get(`/photos/${photoId}/comments`);
      setComments((prev) => ({
        ...prev,
        [photoId]: response.data.comments || [],
      }));
    } catch (err) {
      void err;
    } finally {
      setLoadingComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const submitComment = async (photoId: string) => {
    if (!commentText.trim() || !authorName.trim()) {
      return;
    }

    try {
      setSubmittingComment(true);
      setCommentError(null);
      const response = await api.post(`/photos/${photoId}/comments`, {
        comment: commentText.trim(),
        authorName: authorName.trim(),
      });

      const created = response.data?.comment;
      const status = String(created?.status || '').toUpperCase();

      if (status === 'PENDING') {
        setCommentNotice('Wird nach Freigabe sichtbar.');
        setCommentText('');
        setAuthorName('');
        setTimeout(() => setCommentNotice(null), 3500);
        return;
      }

      setComments((prev) => ({
        ...prev,
        [photoId]: [...(prev[photoId] || []), created],
      }));

      setCommentText('');
      setAuthorName('');
    } catch (err: any) {
      setCommentError(err?.response?.data?.error || err?.message || 'Fehler beim Erstellen des Kommentars');
    } finally {
      setSubmittingComment(false);
    }
  };

  const resetNotices = () => {
    setCommentNotice(null);
    setCommentError(null);
  };

  return {
    likedPhotos,
    likeCounts,
    myReactions,
    reactionCounts,
    customReactionInput,
    setCustomReactionInput,
    comments,
    commentText,
    setCommentText,
    authorName,
    setAuthorName,
    loadingComments,
    submittingComment,
    commentNotice,
    commentError,
    loadLikeCount,
    toggleLike,
    loadComments,
    submitComment,
    resetNotices,
  };
}
