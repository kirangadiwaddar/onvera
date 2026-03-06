import { Section } from "./types"

/* =====================================================
   GLOBAL DEFAULT SECTIONS
===================================================== */

const docs: Section = {
  id: "docs",
  title: "Documents",
  dynamic: true,
  fieldType: "url",
  items: [],
}

const spreadsheets: Section = {
  id: "spreadsheets",
  title: "Spreadsheets",
  dynamic: true,
  fieldType: "url",
  items: [],
}

const driveLinks: Section = {
  id: "drive-links",
  title: "Drive / Dropbox Links",
  dynamic: true,
  fieldType: "url",
  items: [],
}

/* =====================================================
   DEFAULT SECTION INJECTOR
===================================================== */

const withDefaults = (sections: Section[]): Section[] => {
  return [
    ...sections,
    docs,
    spreadsheets,
    driveLinks,
  ]
}

/* =====================================================
   TEMPLATE STRUCTURE
===================================================== */

export const templateStructure: Record<string, Section[]> = {

  /* =====================================================
     1️⃣ Web Development
  ===================================================== */

  "web-development": withDefaults([

    {
      id: "branding",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Brand Logo", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", fieldType: "upload" },
        { id: "fonts", label: "Fonts", fieldType: "upload" },
      ],
    },

    {
      id: "access",
      title: "Access",
      items: [
        { id: "hosting", label: "Hosting Access", fieldType: "textarea" },
        { id: "domain", label: "Domain Access", fieldType: "textarea" },
        { id: "cms", label: "CMS Access", fieldType: "textarea" },
      ],
    },

  ]),

  /* =====================================================
     2️⃣ UI / UX Experience
  ===================================================== */

  "ui/ux-experience": withDefaults([

    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", fieldType: "upload" },
        { id: "design-system", label: "Existing Design System", fieldType: "upload" },
      ],
    },

    {
      id: "product-info",
      title: "Product Information",
      dynamic: true,
      fieldType: "text",
      items: [],
    },

    {
      id: "research",
      title: "Research & References",
      dynamic: true,
      fieldType: "url",
      items: [],
    },

  ]),

  /* =====================================================
     3️⃣ App Development
  ===================================================== */

  "app-development": withDefaults([

    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", fieldType: "upload" },
      ],
    },

    {
      id: "product-scope",
      title: "Product Scope",
      dynamic: true,
      fieldType: "text",
      items: [],
    },

    {
      id: "technical-access",
      title: "Technical Access",
      items: [
        { id: "repo", label: "Git Repository Access", fieldType: "textarea" },
        { id: "api-docs", label: "API Documentation", fieldType: "textarea" },
      ],
    },

  ]),

  /* =====================================================
     4️⃣ SaaS Platform
  ===================================================== */

  "saas-platform": withDefaults([

    {
      id: "branding",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", fieldType: "upload" },
       { id: "guidelines", label: "Brand Guidelines", fieldType: "upload" },
      ],
    },

    {
      id: "cloud-access",
      title: "Hosting & Cloud Access",
      items: [
        { id: "hosting", label: "Cloud Hosting Access", fieldType: "textarea" },
        { id: "analytics", label: "Analytics Access", fieldType: "textarea" },
      ],
    },

    {
      id: "product-documentation",
      title: "Product Documentation",
      dynamic: true,
      fieldType: "url",
      items: [],
    },

  ]),

  /* =====================================================
     5️⃣ E-Commerce
  ===================================================== */

  "ecommerce": withDefaults([

    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", fieldType: "upload" },
      ],
    },

    {
      id: "product-data",
      title: "Product Data",
      dynamic: true,
      fieldType: "text",
      items: [],
    },

    {
      id: "store-access",
      title: "Store Access",
      items: [
        { id: "platform", label: "Shopify / WooCommerce Access", fieldType: "textarea" },
        { id: "payment", label: "Payment Gateway Access", fieldType: "textarea" },
      ],
    },

  ]),

  /* =====================================================
     6️⃣ Digital Marketing
  ===================================================== */

  "digital-marketing": withDefaults([

    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", fieldType: "upload" },
      ],
    },

    {
      id: "platform-access",
      title: "Platform Access",
      items: [
        { id: "facebook", label: "Facebook Ads Access", fieldType: "textarea" },
        { id: "google-ads", label: "Google Ads Access", fieldType: "textarea" },
        { id: "analytics", label: "Google Analytics Access", fieldType: "textarea" },
      ],
    },

    {
      id: "campaign-details",
      title: "Campaign Details",
      dynamic: true,
      fieldType: "text",
      items: [],
    },

  ]),

  /* =====================================================
     7️⃣ Branding
  ===================================================== */

  "branding": withDefaults([

    {
      id: "brand-discovery",
      title: "Brand Discovery",
      dynamic: true,
      fieldType: "text",
      items: [],
    },

    {
      id: "references",
      title: "References & Inspiration",
      dynamic: true,
      fieldType: "url",
      items: [],
    },

  ]),

}