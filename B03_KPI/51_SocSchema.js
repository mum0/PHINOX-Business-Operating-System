/**
 * Social Media Schema
 * Raw data schema for Social Media Performance sheet
 * Phase 7C - PHINOX BOS v5
 */

const SocSchema = (function() {
  'use strict';

  const SHEET_NAME = 'Social Media Performance';

  const SCHEMA = Object.freeze({
    id: 1,
    date: 2,
    platform: 3,
    followers: 4,
    followerGrowth: 5,
    reach: 6,
    impressions: 7,
    engagements: 8,
    likes: 9,
    comments: 10,
    shares: 11,
    saves: 12,
    videoViews: 13,
    watchTime: 14,
    profileVisits: 15,
    linkClicks: 16,
    leads: 17,
    purchases: 18,
    attributedRevenue: 19,
    notes: 20,
    createdAt: 21,
    createdBy: 22
  });

  const PLATFORM = Object.freeze({
    INSTAGRAM: 'Instagram',
    FACEBOOK: 'Facebook',
    TIKTOK: 'TikTok',
    YOUTUBE: 'YouTube',
    LINKEDIN: 'LinkedIn',
    OTHER: 'Other'
  });

  const VALIDATION = Object.freeze({
    date: { required: true, type: 'date' },
    platform: { required: true, allowed: Object.values(PLATFORM) },
    followers: { type: 'number', min: 0 },
    followerGrowth: { type: 'number' },
    reach: { type: 'number', min: 0 },
    impressions: { type: 'number', min: 0 },
    engagements: { type: 'number', min: 0 },
    likes: { type: 'number', min: 0 },
    comments: { type: 'number', min: 0 },
    shares: { type: 'number', min: 0 },
    saves: { type: 'number', min: 0 },
    videoViews: { type: 'number', min: 0 },
    watchTime: { type: 'number', min: 0 },
    profileVisits: { type: 'number', min: 0 },
    linkClicks: { type: 'number', min: 0 },
    leads: { type: 'number', min: 0 },
    purchases: { type: 'number', min: 0 },
    attributedRevenue: { type: 'number', min: 0 }
  });

  function getDefaultRecord() {
    return {
      followers: 0,
      followerGrowth: 0,
      reach: 0,
      impressions: 0,
      engagements: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      videoViews: 0,
      watchTime: 0,
      profileVisits: 0,
      linkClicks: 0,
      leads: 0,
      purchases: 0,
      attributedRevenue: 0
    };
  }

  function getHeaders() {
    return ['id','date','platform','followers','followerGrowth','reach','impressions','engagements','likes','comments','shares','saves','videoViews','watchTime','profileVisits','linkClicks','leads','purchases','attributedRevenue','notes','createdAt','createdBy'];
  }

  function getWidths() {
    return [22, 15, 12, 12, 12, 12, 12, 12, 10, 10, 10, 10, 12, 12, 12, 12, 10, 10, 15, 25, 20, 25];
  }

  return {
    SHEET_NAME: SHEET_NAME,
    SCHEMA: SCHEMA,
    PLATFORM: PLATFORM,
    VALIDATION: VALIDATION,
    getDefaultRecord: getDefaultRecord,
    getHeaders: getHeaders,
    getWidths: getWidths
  };
})();
