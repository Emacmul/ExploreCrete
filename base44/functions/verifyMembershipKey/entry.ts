import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// WC Key Manager stores keys as order line item meta.
// We search for the key across orders using the WooCommerce REST API.
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

  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const normalizedKey = membershipKey.trim().toUpperCase();

  // WC Key Manager exposes a dedicated endpoint to validate a key
  // Try the wcfm/wc-key-manager style endpoint first, then fall back to order meta search
  
  // Approach: search orders where meta key _wc_key_manager_key = the provided key
  // WC REST API v3 supports meta_query via: /orders?meta_key=_wc_key_manager_key&meta_value=KEY
  const searchUrl = `${siteUrl}/wp-json/wc/v3/orders?meta_key=_wc_key_manager_key&meta_value=${encodeURIComponent(normalizedKey)}&per_page=5`;

  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('WooCommerce API error:', response.status, errText);
    return Response.json({ valid: false, error: 'Failed to reach WooCommerce API' }, { status: 502 });
  }

  const orders = await response.json();

  if (!Array.isArray(orders) || orders.length === 0) {
    return Response.json({ valid: false, tier: null });
  }

  // Found at least one order containing this key — now determine the tier from the product
  // We look at line items for a product name that maps to a membership tier
  const order = orders[0];
  const lineItems = order.line_items || [];

  let tier = null;

  for (const item of lineItems) {
    const productName = (item.name || '').toLowerCase();
    // Map product names to tiers — adjust these strings to match your actual product names
    if (productName.includes('wayfinder')) {
      tier = 'wayfinder';
    } else if (productName.includes('pathfinder')) {
      tier = 'pathfinder';
    } else if (productName.includes('explorer')) {
      tier = 'explorer';
    } else if (productName.includes('wanderer')) {
      tier = 'wanderer';
    }
    if (tier) break;
  }

  // If we found the key in an order but couldn't determine tier from product name,
  // also check order meta directly
  if (!tier) {
    const allMeta = order.meta_data || [];
    const tierMeta = allMeta.find(m => m.key === '_membership_tier' || m.key === 'membership_tier');
    if (tierMeta) {
      tier = tierMeta.value.toLowerCase();
    }
  }

  // Default to 'explorer' if key is valid but tier is unresolvable
  if (!tier) tier = 'explorer';

  return Response.json({ valid: true, tier });
});