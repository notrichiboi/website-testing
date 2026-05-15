import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "bbs-studio-ultimate", capabilities: ["zip-import", "bedrock-linking", "bbs-export"] });
});

app.post("/api/projects/validate", (request, response) => {
  const assets = Array.isArray(request.body?.assets) ? request.body.assets : [];
  response.json({
    ok: true,
    assetCount: assets.length,
    hasManifest: assets.some((asset: { kind?: string }) => asset.kind === "manifest"),
    exportFormat: "zip"
  });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`BBS Studio Ultimate API listening on :${port}`));
