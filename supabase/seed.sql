-- AdvanceReWear demo data seed

insert into public.users (id, email, role)
values
  ('11111111-1111-1111-1111-111111111111', 'buyer@advancerewear.com', 'buyer'),
  ('22222222-2222-2222-2222-222222222222', 'seller@advancerewear.com', 'seller'),
  ('33333333-3333-3333-3333-333333333333', 'admin@advancerewear.com', 'admin')
on conflict (id) do nothing;

insert into public.profiles (user_id, full_name, bio)
values
  ('11111111-1111-1111-1111-111111111111', 'Sophia Miles', 'Frequent event renter'),
  ('22222222-2222-2222-2222-222222222222', 'Ava Laurent', 'Luxury wardrobe curator'),
  ('33333333-3333-3333-3333-333333333333', 'Platform Admin', 'Operations and trust')
on conflict (user_id) do nothing;

insert into public.listings (
  id, seller_id, title, description, brand, category, size, condition,
  rental_price, buy_price, deposit_amount, availability_dates, images, status
)
values
  (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '22222222-2222-2222-2222-222222222222',
    'Silk Evening Dress',
    'Elegant silk gown with fitted waist and flowing hem for black-tie events.',
    'Dior',
    'Dress',
    'M',
    'EXCELLENT',
    12900,
    189000,
    35000,
    array['[2026-03-01,2026-03-07]'::daterange, '[2026-03-15,2026-03-18]'::daterange],
    array[
      'https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&auto=format&fit=crop'
    ],
    'approved'
  ),
  (
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '22222222-2222-2222-2222-222222222222',
    'Tailored Black Tuxedo',
    'Sharp wool tuxedo with satin lapels and premium fit for evening occasions.',
    'Saint Laurent',
    'Suit',
    'L',
    'EXCELLENT',
    14900,
    220000,
    42000,
    array['[2026-03-10,2026-03-12]'::daterange],
    array[
      'https://images.unsplash.com/photo-1593032465171-8bd260f89f2f?q=80&w=1200&auto=format&fit=crop'
    ],
    'approved'
  ),
  (
    'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '22222222-2222-2222-2222-222222222222',
    'Cashmere Long Coat',
    'Soft structured cashmere overcoat ideal for winter formalwear.',
    'Prada',
    'Coat',
    'S',
    'GOOD',
    9900,
    155000,
    28000,
    array['[2026-03-20,2026-03-24]'::daterange],
    array[
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop'
    ],
    'pending'
  )
on conflict (id) do nothing;

insert into public.wishlists (user_id, listing_id)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
on conflict (user_id, listing_id) do nothing;
