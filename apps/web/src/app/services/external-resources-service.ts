export type ExternalLearningResource = {
  id: string;
  title: string;
  resourceType: string;
  section: string | null;
  area: string | null;
  url: string | null;
  coverUrl: string | null;
  directLinkAvailable: boolean;
};

type ExternalResourcesResponse = {
  source: string;
  resources: ExternalLearningResource[];
};

type ListCacholaResourcesParams = {
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

function buildCacholaResourcesUrl(params: ListCacholaResourcesParams) {
  const url = new URL("/candidate/materials/external-resources", API_BASE_URL);

  if (params.limit) {
    url.searchParams.set("limit", String(params.limit));
  }

  if (params.area) {
    url.searchParams.set("area", params.area);
  }

  if (params.type) {
    url.searchParams.set("type", params.type);
  }

  return url;
}

export async function listCacholaResources(params: ListCacholaResourcesParams = {}) {
  const token = getOptionalAccessToken();
  const response = await fetch(buildCacholaResourcesUrl(params), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os recursos da Cachola.");
  }

  const data = await response.json() as ExternalResourcesResponse;
  return Array.isArray(data.resources) ? data.resources : [];
}
