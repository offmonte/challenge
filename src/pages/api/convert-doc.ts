import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { filename, base64, output } = req.body || {} as { filename?: string; base64?: string; output?: "docx" | "pdf" };
  if (!filename || !base64) return res.status(400).json({ error: "filename and base64 are required" });
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing CLOUDCONVERT_API_KEY" });

  const outFormat = output || "docx";

  try {
    const jobResp = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          import: {
            operation: "import/base64",
            file: base64,
            filename,
          },
          convert: {
            operation: "convert",
            input: "import",
            input_format: "doc",
            output_format: outFormat,
          },
          export: {
            operation: "export/url",
            input: "convert",
          },
        },
      }),
    });

    if (!jobResp.ok) {
      const t = await jobResp.text();
      return res.status(502).json({ error: "Failed to create job", detail: t });
    }
    const job = await jobResp.json();
    const jobId = job?.data?.id;
    if (!jobId) return res.status(502).json({ error: "Invalid job response" });

    // Poll until finished
    const start = Date.now();
    let url: string | null = null;
    while (Date.now() - start < 120000) {
      const poll = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}?include=tasks`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!poll.ok) break;
      const data = await poll.json();
      const tasks = data?.data?.tasks || [];
      const exportTask = tasks.find((t: any) => t.name === "export");
      const status = data?.data?.status;
      if (exportTask?.status === "finished" || status === "finished") {
        const files = exportTask.result?.files || [];
        url = files[0]?.url || null;
        break;
      }
      if (exportTask?.status === "error" || status === "error") break;
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (!url) return res.status(502).json({ error: "Conversion did not finish" });
    return res.status(200).json({ url, output: outFormat });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
