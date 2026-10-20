export const collectionFields = {
  experience: ["role", "organization", "period", "description"],
  companyProjects: ["name", "description", "url", "technologies", "date"],
  personalProjects: ["name", "description", "url", "technologies", "date"],
};

export const profileFields = ["name", "headline", "location", "email", "website", "summary"];

export function validateCV(value, { allowEmptyName = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CV data must be a JSON object.");
  }
  const result = {};
  const text = (item) => {
    if (typeof item !== "string" || item.length > 20000) {
      throw new Error("CV fields must be text, up to 20,000 characters each.");
    }
    return item;
  };
  for (const field of profileFields) result[field] = text(value[field]);
  if (!allowEmptyName && !result.name.trim()) throw new Error("A name is required.");
  if (!Array.isArray(value.skills) || value.skills.length > 100) {
    throw new Error("Skills must be an array of up to 100 text entries.");
  }
  result.skills = value.skills.map(text);
  for (const [collection, fields] of Object.entries(collectionFields)) {
    if (!Array.isArray(value[collection]) || value[collection].length > 100) {
      throw new Error(`${collection} must be an array of up to 100 entries.`);
    }
    result[collection] = value[collection].map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`Invalid entry in ${collection}.`);
      }
      return Object.fromEntries(fields.map((field) => [field, text(item[field] ?? "")]));
    });
  }
  return result;
}

export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function sortedProjects(projects) {
  return [...projects].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
