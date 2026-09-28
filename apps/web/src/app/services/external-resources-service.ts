export type ExternalResourceSource = "CACHOLA" | "ORANGO";

export type ExternalLearningResource = {
  id: string;
  source: ExternalResourceSource;
  title: string;
  resourceType: string;
  section: string | null;
  area: string | null;
  url: string | null;
  coverUrl: string | null;
  directLinkAvailable: boolean;
};

type ExternalResourcesResponse = {
  resources: ExternalLearningResource[];
};

type ListExternalResourcesParams = {
  source?: ExternalResourceSource;
  limit?: number;
  area?: string;
  type?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getOptionalAccessToken() {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem("rhconnect:access-token") ??
    window.localStorage.getItem("rhconnect:accessToken") ??
    ""
  );
}

function buildExternalResourcesUrl(params: ListExternalResourcesParams) {
  const baseUrl = `${API_BASE_URL.replace(/\/+$/, "")}/`;

  const url = new URL(
    "candidate/materials/external-resources",
    baseUrl,
  );

  if (params.limit) {
    url.searchParams.set("limit", String(params.limit));
  }

  if (params.area) {
    url.searchParams.set("area", params.area);
  }

  if (params.type) {
    url.searchParams.set("type", params.type);
  }

  if (params.source) {
    url.searchParams.set("source", params.source);
  }

  return url;
}

export async function listExternalResources(params: ListExternalResourcesParams = {}) {
  const token = getOptionalAccessToken();
  const response = await fetch(buildExternalResourcesUrl(params), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os recursos externos.");
  }

  const data = await response.json() as ExternalResourcesResponse;
  return Array.isArray(data.resources) ? data.resources : [];
}
