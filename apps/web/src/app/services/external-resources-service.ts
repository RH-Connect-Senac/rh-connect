export type ExternalResourceSource = "CACHOLA" | "ORANGO";

export type ExternalResourceCategory = {
  code: string;
  name: string;
  slug: string;
};

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
  categories: ExternalResourceCategory[];
};

export type ExternalResourcesPagination = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};

type ExternalResourcesResponse = {
  resources: ExternalLearningResource[];
  pagination?: ExternalResourcesPagination;
};

type ExternalResourceCategoriesResponse = {
  categories: ExternalResourceCategory[];
};

type ListExternalResourcesParams = {
  source?: ExternalResourceSource;
  limit?: number;
  offset?: number;
  area?: string;
  type?: string;
  category?: string;
  search?: string;
};

type ListExternalResourceCategoriesParams = {
  source: ExternalResourceSource;
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

  if (params.category) {
    url.searchParams.set("category", params.category);
  }

  // Busca textual no backend (título, área e tipo). Vazio/só espaços não é enviado.
  const search = params.search?.trim();
  if (search) {
    url.searchParams.set("search", search);
  }

  // `offset` é enviado sempre que definido numericamente — inclusive 0 — já
  // que 0 é um valor válido e explícito (primeira página), não "ausente".
  if (typeof params.offset === "number") {
    url.searchParams.set("offset", String(params.offset));
  }

  return url;
}

function isValidExternalResourcesPagination(value: unknown): value is ExternalResourcesPagination {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ExternalResourcesPagination).limit === "number" &&
    typeof (value as ExternalResourcesPagination).offset === "number" &&
    typeof (value as ExternalResourcesPagination).total === "number" &&
    typeof (value as ExternalResourcesPagination).hasMore === "boolean"
  );
}

function buildExternalResourceCategoriesUrl(params: ListExternalResourceCategoriesParams) {
  const baseUrl = `${API_BASE_URL.replace(/\/+$/, "")}/`;

  const url = new URL(
    "candidate/materials/external-resources/categories",
    baseUrl,
  );

  url.searchParams.set("source", params.source);

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

  // Defensivo: se a API não vier com `pagination` (ou vier num formato
  // inesperado), a tela não deve quebrar — só perde a paginação real e
  // volta a se comportar como se não houvesse mais páginas.
  return {
    resources: Array.isArray(data.resources) ? data.resources : [],
    pagination: isValidExternalResourcesPagination(data.pagination) ? data.pagination : null,
  };
}

export async function listExternalResourceCategories(params: ListExternalResourceCategoriesParams) {
  const token = getOptionalAccessToken();
  const response = await fetch(buildExternalResourceCategoriesUrl(params), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar as categorias dos recursos externos.");
  }

  const data = await response.json() as ExternalResourceCategoriesResponse;
  return Array.isArray(data.categories) ? data.categories : [];
}
