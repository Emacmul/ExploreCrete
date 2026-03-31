import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Uses WC Key Manager's Software API (?wckm-api=validate) to verify a membership key.
// Invalid keys return "-1" with status 400. Valid keys return JSON with product info.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { membershipKey } = await req.json();
  if (!membershipKey || typeof membershipKey !== 'string') {
    return Response.json({ error: 'Missing membershipKey' }, { status: 400 });
  }

  const siteUrl = Deno.env.get('WC_SITE_URL');
  const consumerKey = Deno.env.get('WC_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('WC_CONSUMER_SECRET');

  const normalizedKey = membershipKey.trim().toUpperCase();

  const validateUrl = `${siteUrl}/?wckm-api=validate&key=${encodeURIComponent(normalizedKey)}`;

  const response = await fetch(validateUrl, {
    headers: {
      'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
    },
  });

  const text = await response.text();
  console.log('WCKM API status:', response.status, '| response:', text);

  // Invalid key returns "-1" or non-200 status
  if (!response.ok || text.trim() === '-1') {
    return Response.json({ valid: false, tier: null });
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.log('Could not parse JSON, raw:', text);
    return Response.json({ valid: false, error: 'Unexpected response from server' }, { status: 502 });
  }

  // Key is valid — determine tier from product name
  const productName = (data.product_name || data.product || data.name || '').toLowerCase();
  let tier = null;
  if (productName.includes('wayfinder')) tier = 'wayfinder';
  else if (productName.includes('pathfinder')) tier = 'pathfinder';
  else if (productName.includes('explorer')) tier = 'explorer';
  else if (productName.includes('wanderer')) tier = 'wanderer';

  // Also check a dedicated tier field if present
  if (!tier && data.tier) tier = data.tier.toLowerCase();

  // Default to explorer if key valid but tier unresolvable
  if (!tier) tier = 'explorer';

  return Response.json({ valid: true, tier, productName, rawData: data });
});