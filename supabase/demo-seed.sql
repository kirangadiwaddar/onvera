-- Demo workspace seed for owner UUID:
--   96d65547-a718-46f7-84ad-6dfabdac5573
--
-- Notes:
-- - Assumes this UUID already exists in auth.users.
-- - Non-destructive: no deletes, no temp tables, no notifications.
-- - Compatible with both schema variants:
--   1. current repo schema where public.teams.template_id was removed
--   2. older/live schema where public.teams.template_id still exists and is NOT NULL
-- - All seeded timestamps are before 2026-03-01.

begin;

insert into public.profiles (id, full_name, role, plan)
values (
  '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
  'Onvera Demo Workspace',
  'super_admin',
  'agency_pro'
)
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  plan = excluded.plan;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teams'
      and column_name = 'template_id'
  ) then
    insert into public.teams (
      slug,
      name,
      template_id,
      created_by,
      description,
      status,
      lead,
      members,
      created_at
    )
    values
      (
        'demo-web-development-team',
        'Web Development Team',
        'web-development',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Responsible for building and maintaining web-based applications and client websites.',
        'active',
        '{
          "id": 1,
          "name": "James Wilson",
          "role": "Tech Lead",
          "email": "james.wilson@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/men/32.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 2,
            "name": "Olivia Brown",
            "role": "Frontend Developer",
            "email": "olivia.brown@demo.onvera.app",
            "image": ""
          },
          {
            "id": 3,
            "name": "Ethan Davis",
            "role": "Backend Developer",
            "email": "ethan.davis@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/45.jpg"
          }
        ]'::jsonb,
        '2026-01-15T10:00:00Z'::timestamptz
      ),
      (
        'demo-mobile-app-team',
        'Mobile App Team',
        'app-development',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Handles iOS and Android mobile application development and optimization.',
        'active',
        '{
          "id": 4,
          "name": "Sophia Martinez",
          "role": "Mobile Lead",
          "email": "sophia.martinez@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/women/68.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 5,
            "name": "Noah Clark",
            "role": "React Native Developer",
            "email": "noah.clark@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/21.jpg"
          },
          {
            "id": 6,
            "name": "Emma Ross",
            "role": "Mobile QA Engineer",
            "email": "emma.ross@demo.onvera.app",
            "image": ""
          }
        ]'::jsonb,
        '2026-02-01T09:30:00Z'::timestamptz
      ),
      (
        'demo-branding-team',
        'Branding Team',
        'branding',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Focuses on visual identity, brand strategy, and creative direction.',
        'active',
        '{
          "id": 7,
          "name": "Sarah Johnson",
          "role": "Creative Director",
          "email": "sarah.johnson@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/women/42.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 8,
            "name": "Mia Thompson",
            "role": "Brand Designer",
            "email": "mia.thompson@demo.onvera.app",
            "image": ""
          },
          {
            "id": 9,
            "name": "Lucas Reed",
            "role": "Visual Designer",
            "email": "lucas.reed@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/54.jpg"
          }
        ]'::jsonb,
        '2026-02-10T11:15:00Z'::timestamptz
      ),
      (
        'demo-growth-marketing-team',
        'Growth Marketing Team',
        'digital-marketing',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Runs campaign strategy, lifecycle marketing, SEO and paid acquisition work.',
        'active',
        '{
          "id": 10,
          "name": "Priya Nair",
          "role": "Growth Lead",
          "email": "priya.nair@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/women/47.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 11,
            "name": "Daniel Brooks",
            "role": "Paid Media Strategist",
            "email": "daniel.brooks@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/36.jpg"
          },
          {
            "id": 12,
            "name": "Ava Collins",
            "role": "Lifecycle Marketer",
            "email": "ava.collins@demo.onvera.app",
            "image": ""
          }
        ]'::jsonb,
        '2026-02-12T08:45:00Z'::timestamptz
      ),
      (
        'demo-product-ops-team',
        'Product Ops Team',
        'saas-platform',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Coordinates delivery workflows, QA, implementation and product operations.',
        'active',
        '{
          "id": 13,
          "name": "Leo Grant",
          "role": "Product Ops Lead",
          "email": "leo.grant@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/men/29.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 14,
            "name": "Marcus Lee",
            "role": "Solutions Analyst",
            "email": "marcus.lee@demo.onvera.app",
            "image": ""
          },
          {
            "id": 15,
            "name": "Nina Patel",
            "role": "QA Specialist",
            "email": "nina.patel@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/women/59.jpg"
          }
        ]'::jsonb,
        '2026-02-14T10:20:00Z'::timestamptz
      ),
      (
        'demo-client-success-team',
        'Client Success Team',
        'web-development',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Manages onboarding handoff, implementation communication and account support.',
        'active',
        '{
          "id": 16,
          "name": "Omar Haddad",
          "role": "Client Success Lead",
          "email": "omar.haddad@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/men/51.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 17,
            "name": "Chloe Bennett",
            "role": "Implementation Specialist",
            "email": "chloe.bennett@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/women/40.jpg"
          },
          {
            "id": 18,
            "name": "Hannah Price",
            "role": "Support Strategist",
            "email": "hannah.price@demo.onvera.app",
            "image": ""
          }
        ]'::jsonb,
        '2026-02-18T12:10:00Z'::timestamptz
      )
    on conflict (slug) do update
    set
      name = excluded.name,
      template_id = excluded.template_id,
      created_by = excluded.created_by,
      description = excluded.description,
      status = excluded.status,
      lead = excluded.lead,
      members = excluded.members,
      created_at = excluded.created_at;
  else
    insert into public.teams (
      slug,
      name,
      created_by,
      description,
      status,
      lead,
      members,
      created_at
    )
    values
      (
        'demo-web-development-team',
        'Web Development Team',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Responsible for building and maintaining web-based applications and client websites.',
        'active',
        '{
          "id": 1,
          "name": "James Wilson",
          "role": "Tech Lead",
          "email": "james.wilson@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/men/32.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 2,
            "name": "Olivia Brown",
            "role": "Frontend Developer",
            "email": "olivia.brown@demo.onvera.app",
            "image": ""
          },
          {
            "id": 3,
            "name": "Ethan Davis",
            "role": "Backend Developer",
            "email": "ethan.davis@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/45.jpg"
          }
        ]'::jsonb,
        '2026-01-15T10:00:00Z'::timestamptz
      ),
      (
        'demo-mobile-app-team',
        'Mobile App Team',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Handles iOS and Android mobile application development and optimization.',
        'active',
        '{
          "id": 4,
          "name": "Sophia Martinez",
          "role": "Mobile Lead",
          "email": "sophia.martinez@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/women/68.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 5,
            "name": "Noah Clark",
            "role": "React Native Developer",
            "email": "noah.clark@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/21.jpg"
          },
          {
            "id": 6,
            "name": "Emma Ross",
            "role": "Mobile QA Engineer",
            "email": "emma.ross@demo.onvera.app",
            "image": ""
          }
        ]'::jsonb,
        '2026-02-01T09:30:00Z'::timestamptz
      ),
      (
        'demo-branding-team',
        'Branding Team',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Focuses on visual identity, brand strategy, and creative direction.',
        'active',
        '{
          "id": 7,
          "name": "Sarah Johnson",
          "role": "Creative Director",
          "email": "sarah.johnson@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/women/42.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 8,
            "name": "Mia Thompson",
            "role": "Brand Designer",
            "email": "mia.thompson@demo.onvera.app",
            "image": ""
          },
          {
            "id": 9,
            "name": "Lucas Reed",
            "role": "Visual Designer",
            "email": "lucas.reed@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/54.jpg"
          }
        ]'::jsonb,
        '2026-02-10T11:15:00Z'::timestamptz
      ),
      (
        'demo-growth-marketing-team',
        'Growth Marketing Team',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Runs campaign strategy, lifecycle marketing, SEO and paid acquisition work.',
        'active',
        '{
          "id": 10,
          "name": "Priya Nair",
          "role": "Growth Lead",
          "email": "priya.nair@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/women/47.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 11,
            "name": "Daniel Brooks",
            "role": "Paid Media Strategist",
            "email": "daniel.brooks@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/men/36.jpg"
          },
          {
            "id": 12,
            "name": "Ava Collins",
            "role": "Lifecycle Marketer",
            "email": "ava.collins@demo.onvera.app",
            "image": ""
          }
        ]'::jsonb,
        '2026-02-12T08:45:00Z'::timestamptz
      ),
      (
        'demo-product-ops-team',
        'Product Ops Team',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Coordinates delivery workflows, QA, implementation and product operations.',
        'active',
        '{
          "id": 13,
          "name": "Leo Grant",
          "role": "Product Ops Lead",
          "email": "leo.grant@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/men/29.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 14,
            "name": "Marcus Lee",
            "role": "Solutions Analyst",
            "email": "marcus.lee@demo.onvera.app",
            "image": ""
          },
          {
            "id": 15,
            "name": "Nina Patel",
            "role": "QA Specialist",
            "email": "nina.patel@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/women/59.jpg"
          }
        ]'::jsonb,
        '2026-02-14T10:20:00Z'::timestamptz
      ),
      (
        'demo-client-success-team',
        'Client Success Team',
        '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid,
        'Manages onboarding handoff, implementation communication and account support.',
        'active',
        '{
          "id": 16,
          "name": "Omar Haddad",
          "role": "Client Success Lead",
          "email": "omar.haddad@demo.onvera.app",
          "image": "https://randomuser.me/api/portraits/men/51.jpg",
          "memberType": "team_lead",
          "isLead": true
        }'::jsonb,
        '[
          {
            "id": 17,
            "name": "Chloe Bennett",
            "role": "Implementation Specialist",
            "email": "chloe.bennett@demo.onvera.app",
            "image": "https://randomuser.me/api/portraits/women/40.jpg"
          },
          {
            "id": 18,
            "name": "Hannah Price",
            "role": "Support Strategist",
            "email": "hannah.price@demo.onvera.app",
            "image": ""
          }
        ]'::jsonb,
        '2026-02-18T12:10:00Z'::timestamptz
      )
    on conflict (slug) do update
    set
      name = excluded.name,
      created_by = excluded.created_by,
      description = excluded.description,
      status = excluded.status,
      lead = excluded.lead,
      members = excluded.members,
      created_at = excluded.created_at;
  end if;
end $$;

with project_seed (
  slug,
  title,
  template_id,
  status,
  created_at,
  updated_at,
  avatar_src,
  team_slugs,
  extra_members,
  submissions
) as (
  values
    ('demo-digital-redesign-think-company','Digital Redesign for Think Company','web-development','completed','2026-01-15T09:00:00Z'::timestamptz,'2026-02-28T15:20:00Z'::timestamptz,'https://img.logo.dev/thinkcompany.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-branding-team']::text[],'[{"id":101,"name":"Robert Junior","role":"Client Consultant","email":"robert.junior@thinkco-demo.com","image":""}]'::jsonb,'{"__last_client_update":"2026-02-28T14:30:00Z"}'::jsonb),
    ('demo-cyber-duck-ux-optimization','Cyber-Duck UX Optimization','ui/ux-experience','ongoing','2026-02-10T11:00:00Z'::timestamptz,'2026-02-24T10:15:00Z'::timestamptz,'https://img.logo.dev/cyber-duck.co.uk?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-mobile-app-team','demo-branding-team']::text[],'[{"id":102,"name":"Johnson Perk","role":"Graphic Designer","email":"johnson.perk@cyberduck-demo.com","image":"https://randomuser.me/api/portraits/men/63.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-web-app-revamp-ramotion','Web App Revamp – Ramotion','app-development','onhold','2026-02-24T09:20:00Z'::timestamptz,'2026-02-26T13:40:00Z'::timestamptz,'https://img.logo.dev/ramotion.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-product-ops-team','demo-web-development-team']::text[],'[{"id":103,"name":"Elena Park","role":"Product Consultant","email":"elena.park@ramotion-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-ecommerce-build-thrive-agency','E-Commerce Build for Thrive Agency','ecommerce','overdue','2026-02-05T10:10:00Z'::timestamptz,'2026-02-20T12:00:00Z'::timestamptz,'https://img.logo.dev/thriveagency.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-growth-marketing-team']::text[],'[{"id":104,"name":"Claire Mason","role":"E-commerce Manager","email":"claire.mason@thrive-demo.com","image":"https://randomuser.me/api/portraits/women/34.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-seo-digital-growth-webfx','SEO & Digital Growth — WebFx','digital-marketing','waiting','2026-01-20T08:50:00Z'::timestamptz,'2026-02-11T11:25:00Z'::timestamptz,'https://img.logo.dev/webfx.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-growth-marketing-team']::text[],'[{"id":105,"name":"Arjun Mehta","role":"SEO Manager","email":"arjun.mehta@webfx-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-fullstack-portal-polcode','Fullstack Portal – Polcode','saas-platform','completed','2026-02-26T09:45:00Z'::timestamptz,'2026-02-28T09:45:00Z'::timestamptz,'https://img.logo.dev/polcode.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-product-ops-team']::text[],'[{"id":106,"name":"Victor Lee","role":"Platform Owner","email":"victor.lee@polcode-demo.com","image":"https://randomuser.me/api/portraits/men/75.jpg"}]'::jsonb,'{"__last_client_update":"2026-02-27T16:10:00Z"}'::jsonb),
    ('demo-lead-gen-campaign-orange-mantra','Lead Gen Campaign – OrangeMantra','digital-marketing','completed','2026-02-18T12:20:00Z'::timestamptz,'2026-02-25T14:15:00Z'::timestamptz,'https://img.logo.dev/orangemantra.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-growth-marketing-team']::text[],'[{"id":107,"name":"Lena Foster","role":"Campaign Manager","email":"lena.foster@orangemantra-demo.com","image":"https://randomuser.me/api/portraits/women/31.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-brand-refresh-gaumina','Brand Strategy Refresh – Gaumina','branding','waiting','2026-02-21T10:30:00Z'::timestamptz,'2026-02-23T08:30:00Z'::timestamptz,'https://img.logo.dev/gaumina.co.uk?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-branding-team']::text[],'[{"id":108,"name":"Marta Silva","role":"Brand Strategist","email":"marta.silva@gaumina-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-responsive-redesign-digitalsilk','Responsive Redesign – Digital Silk','web-development','overdue','2026-01-28T14:00:00Z'::timestamptz,'2026-02-17T17:40:00Z'::timestamptz,'https://img.logo.dev/digitalsilk.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-branding-team']::text[],'[{"id":109,"name":"Nora Blake","role":"Marketing Manager","email":"nora.blake@digitalsilk-demo.com","image":"https://randomuser.me/api/portraits/women/55.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-seo-content-campaign-ninehertz','SEO & Content Campaign – The NineHertz','digital-marketing','waiting','2026-02-25T10:00:00Z'::timestamptz,'2026-02-26T13:10:00Z'::timestamptz,'https://img.logo.dev/theninehertz.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-growth-marketing-team']::text[],'[{"id":110,"name":"Kiran Sethi","role":"Content Lead","email":"kiran.sethi@ninehertz-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-cms-platform-build-iprospect-india','CMS Platform Build – iProspect India','ecommerce','completed','2026-02-22T09:15:00Z'::timestamptz,'2026-02-27T18:00:00Z'::timestamptz,'https://img.logo.dev/iprospect.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-product-ops-team']::text[],'[{"id":111,"name":"Riya Kapoor","role":"Merchandising Lead","email":"riya.kapoor@iprospect-demo.com","image":"https://randomuser.me/api/portraits/women/24.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-mobile-site-optimization-rogue-media','Mobile Site Optimization – Rogue Media','web-development','waiting','2026-01-30T09:10:00Z'::timestamptz,'2026-02-09T09:10:00Z'::timestamptz,'https://img.logo.dev/rougemedia.co.uk?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-mobile-app-team','demo-web-development-team']::text[],'[{"id":112,"name":"Tom Avery","role":"Digital Producer","email":"tom.avery@rougemedia-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-ecommerce-redesign-nova-retail','E-commerce Redesign – Nova Retail','web-development','ongoing','2026-02-05T13:00:00Z'::timestamptz,'2026-02-26T16:40:00Z'::timestamptz,'https://img.logo.dev/novaretail.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-product-ops-team']::text[],'[{"id":113,"name":"Ella Wong","role":"Retail Ops Manager","email":"ella.wong@nova-demo.com","image":"https://randomuser.me/api/portraits/women/19.jpg"}]'::jsonb,'{"__last_client_update":"2026-02-26T15:55:00Z"}'::jsonb),
    ('demo-branding-revamp-orbit-creative','Branding Revamp – Orbit Creative','branding','completed','2026-01-18T10:45:00Z'::timestamptz,'2026-02-12T09:20:00Z'::timestamptz,'',array['demo-branding-team']::text[],'[{"id":114,"name":"Claire Mason","role":"Creative Partner","email":"claire.mason@orbit-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-crm-dashboard-integration-skyline','CRM Dashboard Integration – Skyline Corp','web-development','overdue','2026-01-12T08:15:00Z'::timestamptz,'2026-02-13T14:20:00Z'::timestamptz,'https://img.logo.dev/skylinecorp.com?token=pk_HZG90BK1TlaseL87Yh9Jng&retina=true',array['demo-web-development-team','demo-product-ops-team']::text[],'[{"id":115,"name":"Ben Carter","role":"RevOps Manager","email":"ben.carter@skyline-demo.com","image":"https://randomuser.me/api/portraits/men/41.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-landing-page-launch-zenith-labs','Landing Page Launch – Zenith Labs','digital-marketing','waiting','2026-02-01T10:05:00Z'::timestamptz,'2026-02-15T12:10:00Z'::timestamptz,'',array['demo-growth-marketing-team','demo-branding-team']::text[],'[{"id":116,"name":"Celia Moore","role":"Content Strategist","email":"celia.moore@zenith-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-mobile-app-ui-refresh-pixelworks','Mobile App UI Refresh – PixelWorks','app-development','ongoing','2026-02-08T09:40:00Z'::timestamptz,'2026-02-22T17:15:00Z'::timestamptz,'',array['demo-mobile-app-team','demo-branding-team']::text[],'[{"id":117,"name":"Harper Lane","role":"Product Designer","email":"harper.lane@pixelworks-demo.com","image":"https://randomuser.me/api/portraits/women/61.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-seo-optimization-greenleaf','SEO Optimization – GreenLeaf Co.','digital-marketing','completed','2026-01-25T12:00:00Z'::timestamptz,'2026-02-19T12:00:00Z'::timestamptz,'',array['demo-growth-marketing-team']::text[],'[{"id":118,"name":"Ishaan Rao","role":"Growth Analyst","email":"ishaan.rao@greenleaf-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-analytics-dashboard-quantum-tech','Analytics Dashboard – Quantum Tech','web-development','overdue','2026-01-28T16:30:00Z'::timestamptz,'2026-02-21T16:30:00Z'::timestamptz,'',array['demo-web-development-team','demo-product-ops-team']::text[],'[{"id":119,"name":"Devon Miles","role":"Analytics Lead","email":"devon.miles@quantum-demo.com","image":"https://randomuser.me/api/portraits/men/18.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-customer-onboarding-hub-studio-flux','Customer Onboarding Hub – Studio Flux','saas-platform','ongoing','2026-02-11T09:10:00Z'::timestamptz,'2026-02-25T11:45:00Z'::timestamptz,'https://logoipsum.com/logo/logo-29.svg',array['demo-client-success-team','demo-product-ops-team']::text[],'[{"id":120,"name":"Amelia Ford","role":"Implementation Manager","email":"amelia.ford@studioflux-demo.com","image":"https://randomuser.me/api/portraits/women/52.jpg"}]'::jsonb,'{"__last_client_update":"2026-02-25T10:50:00Z"}'::jsonb),
    ('demo-shopify-growth-sprint-helio-market','Shopify Growth Sprint – Helio Market','ecommerce','ongoing','2026-02-14T13:25:00Z'::timestamptz,'2026-02-27T10:05:00Z'::timestamptz,'https://logoipsum.com/logo/logo-30.svg',array['demo-growth-marketing-team','demo-web-development-team']::text[],'[{"id":121,"name":"Victor Lee","role":"Commerce Director","email":"victor.lee@heliomarket-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-product-launch-site-northstar-bio','Product Launch Site – Northstar Bio','web-development','waiting','2026-02-16T11:40:00Z'::timestamptz,'2026-02-23T12:05:00Z'::timestamptz,'https://logoipsum.com/logo/logo-31.svg',array['demo-branding-team','demo-web-development-team']::text[],'[{"id":122,"name":"Ivy Chen","role":"Launch Manager","email":"ivy.chen@northstar-demo.com","image":"https://randomuser.me/api/portraits/women/65.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-crm-migration-cedar-peak','CRM Migration – Cedar Peak','saas-platform','completed','2026-02-19T09:00:00Z'::timestamptz,'2026-02-28T18:10:00Z'::timestamptz,'https://logoipsum.com/logo/logo-32.svg',array['demo-product-ops-team','demo-web-development-team']::text[],'[{"id":123,"name":"Owen Hart","role":"Revenue Systems Lead","email":"owen.hart@cedarpeak-demo.com","image":"https://randomuser.me/api/portraits/men/67.jpg"}]'::jsonb,'{"__last_client_update":"2026-02-27T17:20:00Z"}'::jsonb),
    ('demo-creator-campaign-system-luma-house','Creator Campaign System – Luma House','digital-marketing','ongoing','2026-02-20T14:10:00Z'::timestamptz,'2026-02-27T16:25:00Z'::timestamptz,'https://logoipsum.com/logo/logo-33.svg',array['demo-growth-marketing-team','demo-client-success-team']::text[],'[{"id":124,"name":"Zoe Kim","role":"Partnerships Manager","email":"zoe.kim@lumahouse-demo.com","image":""}]'::jsonb,'{}'::jsonb),
    ('demo-mobile-checkout-refresh-drift-commerce','Mobile Checkout Refresh – Drift Commerce','app-development','onhold','2026-02-24T15:15:00Z'::timestamptz,'2026-02-28T10:30:00Z'::timestamptz,'https://logoipsum.com/logo/logo-34.svg',array['demo-mobile-app-team','demo-product-ops-team']::text[],'[{"id":125,"name":"Ryan Scott","role":"Commerce Product Manager","email":"ryan.scott@drift-demo.com","image":"https://randomuser.me/api/portraits/men/57.jpg"}]'::jsonb,'{}'::jsonb),
    ('demo-identity-system-pine-and-pixel','Identity System – Pine & Pixel','branding','completed','2026-02-27T08:40:00Z'::timestamptz,'2026-02-28T13:50:00Z'::timestamptz,'https://logoipsum.com/logo/logo-35.svg',array['demo-branding-team']::text[],'[{"id":126,"name":"Mila Hart","role":"Founder","email":"mila.hart@pinepixel-demo.com","image":""}]'::jsonb,'{}'::jsonb)
),
resolved_projects as (
  select
    p.slug,
    p.title,
    '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid as created_by,
    p.template_id,
    p.status,
    p.created_at,
    p.updated_at,
    p.avatar_src,
    coalesce(
      (
        select array_agg(t.id order by array_position(p.team_slugs, t.slug))
        from public.teams t
        where t.created_by = '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid
          and t.slug = any(p.team_slugs)
      ),
      '{}'::bigint[]
    ) as team_ids,
    p.extra_members,
    p.submissions
  from project_seed p
  join public.templates tpl
    on tpl.id = p.template_id
)
insert into public.projects (
  slug,
  title,
  created_by,
  template_id,
  status,
  created_at,
  updated_at,
  avatar_src,
  team_ids,
  extra_members,
  submissions
)
select
  slug,
  title,
  created_by,
  template_id,
  status,
  created_at,
  updated_at,
  avatar_src,
  team_ids,
  extra_members,
  submissions
from resolved_projects
on conflict (slug) do update
set
  title = excluded.title,
  created_by = excluded.created_by,
  template_id = excluded.template_id,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  avatar_src = excluded.avatar_src,
  team_ids = excluded.team_ids,
  extra_members = excluded.extra_members,
  submissions = excluded.submissions;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'last_client_update_at'
  ) then
    update public.projects
    set last_client_update_at = nullif(submissions ->> '__last_client_update', '')::timestamptz
    where created_by = '96d65547-a718-46f7-84ad-6dfabdac5573'::uuid
      and slug like 'demo-%'
      and submissions ? '__last_client_update';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'refresh_dashboard_stats_for_workspace'
      and pronamespace = 'public'::regnamespace
  ) then
    perform public.refresh_dashboard_stats_for_workspace('96d65547-a718-46f7-84ad-6dfabdac5573'::uuid);
  end if;
end $$;

commit;
