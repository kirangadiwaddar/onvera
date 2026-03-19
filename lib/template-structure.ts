import { Section } from "./types"

const brandingSection = (): Section => ({
  id: "branding",
  title: "Branding",
  items: [],
  dynamic: true,
})

const baseTemplates: Record<string, Section[]> = {
  // =====================================================
  // 1️⃣ Web Development
  // =====================================================
  "web-development": [
    {
      id: "branding",
      title: "Branding",
      items: [
        { id: "logo", label: "Brand Logo", type: "predefined", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", type: "predefined", fieldType: "upload" },
        { id: "fonts", label: "Fonts", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "access",
      title: "Access",
      items: [
        { id: "hosting", label: "Hosting Access", type: "predefined", fieldType: "textarea" },
        { id: "domain", label: "Domain Access", type: "predefined", fieldType: "textarea" },
        { id: "cms", label: "CMS Access", type: "predefined", fieldType: "textarea" },
      ],
    },
    {
      id: "docs",
      title: "Docs",
      items: [],
      dynamic: true,
    },
    {
      id: "drive-links",
      title: "Drive Links",
      items: [],
      dynamic: true,
    },
  ],

  // =====================================================
  // 2️⃣ UI/UX Experience
  // =====================================================
  "ui/ux-experience": [
    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", type: "predefined", fieldType: "upload" },
        { id: "design-system", label: "Existing Design System", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "product-info",
      title: "Product Information",
      items: [],
      dynamic: true,
    },
    {
      id: "research",
      title: "Research & References",
      items: [],
      dynamic: true,
    },
  ],

  // =====================================================
  // 3️⃣ App Development
  // =====================================================
  "app-development": [
    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", type: "predefined", fieldType: "upload" },
        { id: "app-icon", label: "App Icon Assets", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "product-scope",
      title: "Product Scope",
      items: [],
      dynamic: true,
    },
    {
      id: "technical-access",
      title: "Technical Access",
      items: [
        { id: "repo", label: "Git Repository Access", type: "predefined", fieldType: "textarea" },
        { id: "api-docs", label: "API Documentation", type: "predefined", fieldType: "textarea" },
      ],
    },
  ],

  // =====================================================
  // 4️⃣ SaaS Platform
  // =====================================================
  "saas-platform": [
    {
      id: "branding",
      title: "Branding",
      items: [
        { id: "logo", label: "Logo", type: "predefined", fieldType: "upload" },
        { id: "guidelines", label: "Brand Guidelines", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "product-documentation",
      title: "Product Documentation",
      items: [],
      dynamic: true,
    },
    {
      id: "cloud-access",
      title: "Hosting & Cloud Access",
      items: [
        { id: "hosting", label: "Cloud Hosting Access", type: "predefined", fieldType: "textarea" },
        { id: "analytics", label: "Analytics Access", type: "predefined", fieldType: "textarea" },
      ],
    },
  ],

  // =====================================================
  // 5️⃣ E-Commerce
  // =====================================================
  "ecommerce": [
    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", type: "predefined", fieldType: "upload" },
        { id: "product-photos", label: "Product Photography Folder", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "product-data",
      title: "Product Data",
      items: [],
      dynamic: true,
    },
    {
      id: "store-access",
      title: "Store Access",
      items: [
        { id: "platform", label: "Shopify / WooCommerce Access", type: "predefined", fieldType: "textarea" },
        { id: "payment", label: "Payment Gateway Access", type: "predefined", fieldType: "textarea" },
      ],
    },
  ],

  // =====================================================
  // 6️⃣ Digital Marketing
  // =====================================================
  "digital-marketing": [
    {
      id: "brand-assets",
      title: "Brand Assets",
      items: [
        { id: "logo", label: "Logo", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "platform-access",
      title: "Platform Access",
      items: [
        { id: "facebook", label: "Facebook Ads Access", type: "predefined", fieldType: "textarea" },
        { id: "google-ads", label: "Google Ads Access", type: "predefined", fieldType: "textarea" },
        { id: "analytics", label: "Google Analytics Access", type: "predefined", fieldType: "textarea" },
      ],
    },
    {
      id: "campaign-details",
      title: "Campaign Details",
      items: [],
      dynamic: true,
    },
  ],

  // =====================================================
  // 7️⃣ Branding
  // =====================================================
  "branding": [
    {
      id: "brand-discovery",
      title: "Brand Discovery",
      items: [],
      dynamic: true,
    },
    {
      id: "existing-assets",
      title: "Existing Assets",
      items: [
        { id: "existing-logo", label: "Existing Logo (if any)", type: "predefined", fieldType: "upload" },
      ],
    },
    {
      id: "references",
      title: "References & Inspiration",
      items: [],
      dynamic: true,
    },
  ],
}

const withBranding = (templates: Record<string, Section[]>) =>
  Object.fromEntries(
    Object.entries(templates).map(([key, sections]) => {
      if (key === "branding") {
        return [key, sections]
      }
      const filtered = sections.filter((section) => section.id !== "branding")
      return [key, [brandingSection(), ...filtered]]
    }),
  )

export const templateStructure: Record<string, Section[]> = withBranding(baseTemplates)
