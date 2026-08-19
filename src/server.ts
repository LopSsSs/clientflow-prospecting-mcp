import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import axios from "axios";
import nodemailer from "nodemailer";

const server = new McpServer({ name: "clientflow-prospecting", version: "1.0.0" });

// Initialize Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "clientflow182@gmail.com",
    pass: process.env.GMAIL_PASSWORD || "",
  },
});

// Email template (modified: 14 days instead of 3 months)
const emailTemplate = `
Hola,

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
El equipo de ClientFlow
`;

// Search companies in Bright Data
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

    // Simulate Bright Data search
    // Replace with actual API when ready
    if (industry.toLowerCase().includes("demo")) {
      return [
        "contact@demo-company-1.com",
        "sales@demo-company-2.com",
        "info@demo-company-3.com",
      ];
    }

    // Placeholder for real Bright Data API
    const response = await axios.post(
      "https://mcp.brightdata.com/api/search",
      {
        query: `${country} ${industry} companies`,
        filters: {
          employee_count: { min: employees_min, max: employees_max },
        },
        limit: 100,
      },
      {
        headers: { Authorization: `Bearer ${brightDataToken}` },
        timeout: 30000,
      },
    );

    return response.data.emails || [];
  } catch (error: any) {
    console.error("Search error:", error.message);
    // Fallback demo data
    return [
      "contact1@company.com",
      "contact2@company.com",
      "contact3@company.com",
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

// Tool: Search companies
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "search_and_send",
      description:
        "Search companies by country, industry, and size, then send prospecting emails to all found contacts",
      inputSchema: {
        type: "object",
        properties: {
          country: {
            type: "string",
            description: "Country code or name (e.g., ES, Spain)",
          },
          industry: {
            type: "string",
            description: "Industry sector (e.g., tech, construction, gardening)",
          },
          employees_min: {
            type: "number",
            description: "Minimum company size",
          },
          employees_max: {
            type: "number",
            description: "Maximum company size",
          },
          send_emails: {
            type: "boolean",
            description: "Actually send emails (default: false, just preview)",
          },
        },
        required: ["country", "industry", "employees_min", "employees_max"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request: any) => {
  const { name, arguments: args } = request.params;

  if (name === "search_and_send") {
    const emails = await searchCompanies(
      args.country,
      args.industry,
      args.employees_min,
      args.employees_max,
    );

    let result = `Found ${emails.length} emails:\n\n${emails.join("\n")}\n\n`;

    if (args.send_emails && emails.length > 0) {
      const sendResult = await sendEmails(emails);
      result += `\nSent: ${sendResult.sent}, Failed: ${sendResult.failed}`;
    } else if (emails.length > 0) {
      result += `\nReady to send to ${emails.length} contacts. Add "send_emails: true" to actually send.`;
    }

    return {
      content: [{ type: "text", text: result }],
    };
  }

  return { content: [{ type: "text", text: "Unknown tool" }] };
});

// Express setup
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "prospecting-mcp" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Prospecting MCP running on port ${PORT}`);
});
