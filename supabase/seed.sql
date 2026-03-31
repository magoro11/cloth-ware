-- AdvanceReWear demo data seed

insert into public.users (id, auth_user_id, email, role)
values
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'buyer@advancerewear.com',
    'buyer'::public.user_role
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'seller@advancerewear.com',
    'seller'::public.user_role
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    'admin@advancerewear.com',
    'admin'::public.user_role
  )
on conflict (id) do nothing;

insert into public.profiles (user_id, full_name, bio)
values
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Sophia Miles',
    'Frequent event renter'
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Ava Laurent',
    'Luxury wardrobe curator'
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'Platform Admin',
    'Operations and trust'
  )
on conflict (user_id) do nothing;

insert into public.listings (
  id, seller_id, title, description, brand, category, size, condition,
  rental_price, buy_price, deposit_amount, availability_dates, images, status
)
values
  (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Silk Evening Dress',
    'Elegant silk gown with fitted waist and flowing hem for black-tie events.',
    'Dior',
    'Dress',
    'M',
    'EXCELLENT',
    12900,
    189000,
    35000,
    array[
      '[2026-03-01,2026-03-07]'::daterange,
      '[2026-03-15,2026-03-18]'::daterange
    ]::daterange[],
    array[
      'https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&auto=format&fit=crop'
    ]::text[],
    'approved'::public.listing_status
  ),
  (
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Tailored Black Tuxedo',
    'Sharp wool tuxedo with satin lapels and premium fit for evening occasions.',
    'Saint Laurent',
    'Suit',
    'L',
    'EXCELLENT',
    14900,
    220000,
    42000,
    array['[2026-03-10,2026-03-12]'::daterange]::daterange[],
    array[
      'https://images.unsplash.com/photo-1593032465171-8bd260f89f2f?q=80&w=1200&auto=format&fit=crop'
    ]::text[],
    'approved'::public.listing_status
  ),
  (
    'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Cashmere Long Coat',
    'Soft structured cashmere overcoat ideal for winter formalwear.',
    'Prada',
    'Coat',
    'S',
    'GOOD',
    9900,
    155000,
    28000,
    array['[2026-03-20,2026-03-24]'::daterange]::daterange[],
    array[
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop'
    ]::text[],
    'pending'::public.listing_status
  )
on conflict (id) do nothing;

insert into public.wishlists (user_id, listing_id)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
)
on conflict (user_id, listing_id) do nothing;
