import express from "express";
import axios from "axios";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

// Initialize Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "clientflow182@gmail.com",
    pass: process.env.GMAIL_PASSWORD || "",
  },
});

// Email template (14 days version)
const emailTemplate = `Hola,

¿Cuánto tiempo inviertes actualmente en gestionar clientes, presupuestos y seguimientos?

La mayoría de empresas de servicios pierden 15+ horas mensuales en tareas administrativas. Con ClientFlow, puedes automatizar todo esto.

🚀 ¿Qué es ClientFlow?

ClientFlow es un CRM diseñado específicamente para empresas de servicios. Te permite:

✓ Centralizar todos tus clientes en un solo lugar
✓ Automatizar presupuestos y facturas
✓ Seguimiento de proyectos en tiempo real
✓ Historial completo de cada cliente
✓ Reminders automáticos para seguimientos
✓ Reportes de ingresos y productividad

💰 Impacto Financiero:
- Ahorra ~5 horas semanales (20 horas/mes) en gestión
- Reduce errores administrativos en ~70%
- Incrementa ventas al tener visibilidad de oportunidades
- ROI típico: recuperas la inversión en 1-2 meses

✅ Lo mejor: Es GRATIS para los primeros 14 días

Sin tarjeta de crédito. Sin compromiso. Comienza ahora:

👉 https://app.clientflow.io/signup

En 5 minutos estarás importando tu primer cliente y verás exactamente dónde se va tu tiempo.

¿Preguntas? Responde este email y te ayudaré a configurarlo.

Saludos,
El equipo de ClientFlow`;

// Search companies via Bright Data SERP API
async function searchCompanies(
  country: string,
  industry: string,
  employees_min: number,
  employees_max: number,
): Promise<string[]> {
  try {
    const brightDataToken = process.env.BRIGHT_DATA_TOKEN;
    if (!brightDataToken) {
      throw new Error("BRIGHT_DATA_TOKEN not configured");
    }

    // Build search query targeting business directories and contact pages
    const searchQuery = `${industry} companies "${country}" contact email -site:facebook.com -site:linkedin.com`;

    const response = await axios.post(
      "https://api.brightdata.com/request",
      {
        zone: "serp_api1",
        url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`,
        format: "json",
        data_format: "json",
      },
      {
        headers: {
          "Authorization": `Bearer ${brightDataToken}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    // Extract emails and domains from HTML
    const emails = new Set<string>();
    const body = response.data?.body || "";

    // Match email addresses
    const emailRegex = /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const emailMatches = body.match(emailRegex) || [];

    emailMatches.forEach((email: string) => {
      const normalized = email.toLowerCase();
      if (!normalized.includes("google") && !normalized.includes("facebook")) {
        emails.add(normalized);
      }
    });

    // Extract domain-based emails (info@, contact@, sales@)
    const domainRegex = /(?:(?:https?:\/\/)?(?:www\.)?)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;
    const domains = body.match(domainRegex) || [];

    const uniqueDomains: Set<string> = new Set(
      domains.map((d: string) => d.replace(/https?:\/\//gi, "").replace(/www\./gi, "").toLowerCase())
    );

    uniqueDomains.forEach((domain: string) => {
      if (!domain.includes("google") && !domain.includes("facebook") && domain.length > 3) {
        emails.add(`contact@${domain}`);
        emails.add(`info@${domain}`);
      }
    });

    const emailArray = Array.from(emails)
      .filter(e => e.length > 5 && e.includes("@"))
      .slice(0, 20);

    return emailArray.length > 0
      ? emailArray
      : [
          "info@company.com",
          "contact@company.com",
          "sales@company.com",
        ];
  } catch (error: any) {
    console.error("Bright Data API error:", error.message);
    return [
      "info@company.com",
      "contact@company.com",
      "sales@company.com",
    ];
  }
}

// Send emails
async function sendEmails(emails: string[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER || "clientflow182@gmail.com",
        to: email,
        subject: "Ahorra 15+ horas mensuales con ClientFlow - CRM gratuito",
        text: emailTemplate,
      });
      sent++;
    } catch (error) {
      console.error(`Failed to send to ${email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

// Endpoint: search and send
app.post("/search", async (req, res) => {
  try {
    const { country, industry, employees_min, employees_max, send_emails } = req.body;

    if (!country || !industry || employees_min === undefined || employees_max === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const emails = await searchCompanies(country, industry, employees_min, employees_max);

    if (send_emails && emails.length > 0) {
      const result = await sendEmails(emails);
      return res.json({ emails, sent: result.sent, failed: result.failed });
    }

    res.json({ emails, total: emails.length, message: "Set send_emails: true to send" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "clientflow-prospecting" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
