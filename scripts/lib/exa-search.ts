export interface ExaSearchBody {
  query: string;
  type: "auto";
  numResults: number;
  category?: "news";
  startPublishedDate?: string;
  endPublishedDate?: string;
  text: true;
}

export interface ExaNewsResult {
  title: string;
  url: string;
  publishedDate?: string;
  published_date?: string;
  author?: string;
  text?: string;
}

export function buildExaNewsSearchBody(jobTitle: string): ExaSearchBody {
  return {
    query: `${jobTitle} career news 2024 2025`,
    type: "auto",
    category: "news",
    numResults: 5,
    startPublishedDate: "2024-01-01T00:00:00.000Z",
    endPublishedDate: "2025-12-31T23:59:59.999Z",
    text: true,
  };
}

export function buildExaPeopleSearchBody(jobTitle: string): ExaSearchBody {
  return {
    query: `famous ${jobTitle} professionals notable people`,
    type: "auto",
    numResults: 5,
    text: true,
  };
}

export function mapExaNewsResult(result: ExaNewsResult) {
  const summary = result.text?.substring(0, 300) ?? "";

  return {
    title: result.title,
    url: result.url,
    published_date: result.publishedDate ?? result.published_date,
    source: result.author || extractDomain(result.url),
    summary: summary ? `${summary}...` : "",
  };
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
