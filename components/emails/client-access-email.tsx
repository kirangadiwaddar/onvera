import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface ClientAccessEmailProps {
  url: string
  password?: string | null
}

export function ClientAccessEmail({ url, password }: ClientAccessEmailProps) {
  const previewText = "Your secure client access link"

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={hero}>
            <Img
              src="https://onvera.vercel.app/onvera-logo.png"
              alt="Onvera"
              height="24"
              style={logo}
            />
            <Text style={eyebrow}>Client Access</Text>
            <Heading style={title}>Your client workspace is ready.</Heading>
            <Text style={subtitle}>
              Use this space to upload files, complete the checklist, and keep everything in one place for the project.
            </Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi there,</Text>
            <Text style={bodyText}>
              We’ve opened your client workspace. From there you can upload assets, add notes, and finish the checklist
              so the team can get started right away.
            </Text>
            <Section style={spacerMd} />

            <Section style={buttonWrap}>
              <Button href={url} style={button}>
                Open client access
              </Button>
            </Section>
            <Section style={spacerMd} />

            <Section style={panel}>
            <Text style={panelLabel}>Direct access link</Text>
            <Text style={helperText}>
              If the button does not open, copy and paste this secure link into your browser.
            </Text>
              <Section style={spacerSm} />
              <Section style={linkBox}>
                <Text style={linkText}>{url}</Text>
              </Section>
            </Section>
            <Section style={spacerMd} />

            <Section style={metaGrid}>
              <Section style={metaItem}>
                <Text style={metaKey}>Access password</Text>
                <Text style={metaValue}>{password || "Not required"}</Text>
              </Section>
            </Section>
            <Section style={spacerLg} />

            <Hr style={divider} />
            <Section style={spacerLg} />

            <Text style={footerText}>
              If you have any questions, just contact your project creator.
            </Text>

            <Section style={spacerSm} />
            <Text style={signature}>— Team Onvera</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  margin: 0,
  padding: "32px 16px",
  backgroundColor: "#f5f3ff",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  color: "#111827",
}

const container = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  border: "1px solid #ede9fe",
  borderRadius: "24px",
  overflow: "hidden" as const,
  boxShadow: "0 20px 60px rgba(76, 29, 149, 0.08)",
}

const hero = {
  padding: "36px 40px 28px",
  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.10) 0%, rgba(196, 181, 253, 0.18) 100%)",
  borderBottom: "1px solid #ede9fe",
}

const logo = {
  display: "block",
  marginBottom: "28px",
}

const eyebrow = {
  display: "inline-block",
  fontSize: "12px",
  lineHeight: "1",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "#7c3aed",
  background: "rgba(124, 58, 237, 0.08)",
  border: "1px solid rgba(124, 58, 237, 0.14)",
  borderRadius: "999px",
  padding: "8px 12px",
  marginBottom: "16px",
  fontWeight: 700,
}

const title = {
  margin: 0,
  fontSize: "40px",
  lineHeight: "1.08",
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#111827",
}

const subtitle = {
  margin: "16px 0 0",
  fontSize: "18px",
  lineHeight: "1.6",
  color: "#5b6170",
  maxWidth: "480px",
}

const content = {
  padding: "40px",
}

const greeting = {
  margin: 0,
  fontSize: "16px",
  lineHeight: "1.75",
  color: "#111827",
  fontWeight: 600,
}

const bodyText = {
  margin: 0,
  fontSize: "16px",
  lineHeight: "1.75",
  color: "#4b5563",
}

const buttonWrap = {
  margin: 0,
}

const button = {
  display: "inline-block",
  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "16px",
  fontWeight: 700,
  padding: "16px 28px",
  borderRadius: "999px",
  boxShadow: "0 12px 28px rgba(124, 58, 237, 0.22)",
}

const panel = {
  margin: 0,
  background: "#faf7ff",
  border: "1px solid #ede9fe",
  borderRadius: "18px",
  padding: "20px",
}

const panelLabel = {
  margin: "0 0 10px",
  fontSize: "12px",
  lineHeight: "1",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "#7c3aed",
  fontWeight: 800,
}

const helperText = {
  margin: 0,
  fontSize: "16px",
  lineHeight: "1.75",
  color: "#4b5563",
}

const linkBox = {
  padding: "14px 16px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #ddd6fe",
}

const linkText = {
  margin: 0,
  color: "#6d28d9",
  fontSize: "14px",
  wordBreak: "break-all" as const,
}

const metaGrid = {
  width: "100%",
  margin: 0,
}

const metaItem = {
  background: "#fcfbff",
  border: "1px solid #ede9fe",
  borderRadius: "16px",
  padding: "16px",
}

const metaKey = {
  margin: "0 0 8px",
  fontSize: "12px",
  lineHeight: "1",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  fontWeight: 700,
}

const metaValue = {
  margin: 0,
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#111827",
  fontWeight: 600,
}

const divider = {
  height: "1px",
  backgroundColor: "#ede9fe",
  margin: 0,
}

const footerText = {
  margin: 0,
  fontSize: "14px",
  lineHeight: "1.7",
  color: "#6b7280",
}

const signature = {
  margin: 0,
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#111827",
  fontWeight: 600,
}

const spacerSm = {
  height: "12px",
}

const spacerMd = {
  height: "20px",
}

const spacerLg = {
  height: "28px",
}
