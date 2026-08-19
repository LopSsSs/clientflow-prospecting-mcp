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

// Search companies
async function searchCompanies(
  country: string,
  industry: string,
  employees_min: number,
  employees_max: number,
): Promise<string[]> {
  try {
    // Demo mode
    if (industry.toLowerCase().includes("demo")) {
      return [
        "contact@demo-company-1.com",
        "sales@demo-company-2.com",
        "info@demo-company-3.com",
      ];
    }

    // Fallback mock data
    return [
      `${industry.toLowerCase()}-1@company.es`,
      `${industry.toLowerCase()}-2@company.es`,
      `${industry.toLowerCase()}-3@company.es`,
    ];
  } catch (error) {
    console.error("Search error:", error);
    return [];
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
