/**
 * Marketing Schema
 * Raw data schema for Marketing Spend sheet
 * Phase 7C - PHINOX BOS v5
 */

const MktSchema = (function() {
  'use strict';

  const SHEET_NAME = 'Marketing Spend';

  const SCHEMA = Object.freeze({
    id: 1,
    date: 2,
    platform: 3,
    channel: 4,
    campaignId: 5,
    campaignName: 6,
    currency: 7,
    spend: 8,
    impressions: 9,
    reach: 10,
    clicks: 11,
    leads: 12,
    conversions: 13,
    attributedRevenue: 14,
    creativeCost: 15,
    agencyCost: 16,
    otherCost: 17,
    notes: 18,
    createdAt: 19,
    createdBy: 20
  });

  const PLATFORM = Object.freeze({
    META: 'Meta',
    GOOGLE: 'Google',
    TIKTOK: 'TikTok',
    LINKEDIN: 'LinkedIn',
    OTHER: 'Other'
  });

  const CHANNEL = Object.freeze({
    PAID_SOCIAL: 'Paid Social',
    SEARCH: 'Search',
    DISPLAY: 'Display',
    VIDEO: 'Video',
    EMAIL: 'Email',
    AFFILIATE: 'Affiliate',
    OTHER: 'Other'
  });

  const VALIDATION = Object.freeze({
    date: { required: true, type: 'date' },
    platform: { required: true, allowed: Object.values(PLATFORM) },
    channel: { allowed: Object.values(CHANNEL) },
    currency: { required: true, type: 'string', minLength: 1, maxLength: 3 },
    spend: { required: true, type: 'number', min: 0 },
    impressions: { type: 'number', min: 0 },
    reach: { type: 'number', min: 0 },
    clicks: { type: 'number', min: 0 },
    leads: { type: 'number', min: 0 },
    conversions: { type: 'number', min: 0 },
    attributedRevenue: { type: 'number', min: 0 },
    creativeCost: { type: 'number', min: 0 },
    agencyCost: { type: 'number', min: 0 },
    otherCost: { type: 'number', min: 0 }
  });

  function getDefaultRecord() {
    return {
      currency: 'EGP',
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      attributedRevenue: 0,
      creativeCost: 0,
      agencyCost: 0,
      otherCost: 0
    };
  }

  function getHeaders() {
    return ['id','date','platform','channel','campaignId','campaignName','currency','spend','impressions','reach','clicks','leads','conversions','attributedRevenue','creativeCost','agencyCost','otherCost','notes','createdAt','createdBy'];
  }

  function getWidths() {
    return [22, 15, 12, 12, 20, 25, 8, 12, 12, 12, 12, 10, 10, 15, 12, 12, 12, 25, 20, 25];
  }

  return {
    SHEET_NAME: SHEET_NAME,
    SCHEMA: SCHEMA,
    PLATFORM: PLATFORM,
    CHANNEL: CHANNEL,
    VALIDATION: VALIDATION,
    getDefaultRecord: getDefaultRecord,
    getHeaders: getHeaders,
    getWidths: getWidths
  };
})();
