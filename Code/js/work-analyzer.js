
const WorkAnalyzer = (() => {
  const CODE_EXT = [".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".go", ".rs", ".html", ".css", ".json", ".md", ".txt", ".yml", ".yaml"];

  function isTextFile(name, mime) {
    if (mime && (mime.startsWith("text/") || mime.includes("json") || mime.includes("javascript"))) return true;
    const lower = (name || "").toLowerCase();
    return CODE_EXT.some((ext) => lower.endsWith(ext));
  }

  async function readFileText(file, maxBytes = 120000) {
    if (!isTextFile(file.name, file.type)) return "";
    const slice = file.size > maxBytes ? file.slice(0, maxBytes) : file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsText(slice);
    });
  }

  function analyzeContent(fileName, content) {
    const lines = content.split("\n").filter((l) => l.trim()).length;
    const chars = content.length;
    const lower = content.toLowerCase();
    const checks = {
      hasReadme: /readme|# project|# /i.test(content) || fileName.toLowerCase().includes("readme"),
      hasPackage: /package\.json|"dependencies"/i.test(content) || fileName.includes("package.json"),
      hasTests: /test|spec|jest|pytest|unittest/i.test(content) || /test|spec/.test(fileName),
      hasSrc: /src\/|function |class |def |import |export /i.test(content),
      hasConfig: /config|\.env|docker|ci|github actions/i.test(content),
      hasDocs: lines > 20 && (lower.includes("documentation") || lower.includes("install")),
    };
    let score = 5;
    if (chars > 200) score += 8;
    if (chars > 2000) score += 10;
    if (lines > 30) score += 7;
    if (checks.hasReadme) score += 8;
    if (checks.hasPackage) score += 10;
    if (checks.hasTests) score += 12;
    if (checks.hasSrc) score += 15;
    if (checks.hasConfig) score += 6;
    if (checks.hasDocs) score += 5;
    score = Math.min(25, score);

    const findings = [];
    if (checks.hasSrc) findings.push("Source code or implementation detected");
    if (checks.hasTests) findings.push("Test-related content found");
    if (checks.hasReadme) findings.push("Documentation present");
    if (checks.hasPackage) findings.push("Dependency/manifest file included");
    if (chars < 50) findings.push("Very small file — limited evidence of work");
    if (!findings.length) findings.push("File uploaded; review manually for revival impact");

    const summary = `[AI_WORK_SCAN] ${fileName}: ${findings.join(". ")}. Estimated contribution: +${score}% toward revival.`;

    return {
      score,
      lines,
      chars,
      checks,
      findings,
      summary,
      scannedAt: Date.now(),
    };
  }

  async function analyzeFile(file) {
    const content = await readFileText(file);
    if (!content) {
      return {
        score: 3,
        lines: 0,
        chars: 0,
        findings: ["Binary or non-text file — counted as asset upload only"],
        summary: `[AI_WORK_SCAN] ${file.name}: Binary/asset file stored for claimer review.`,
        scannedAt: Date.now(),
      };
    }
    return analyzeContent(file.name, content);
  }

  return { analyzeFile, isTextFile };
})();
