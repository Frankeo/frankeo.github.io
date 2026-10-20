import { collectionFields, profileFields, safeURL, sortedProjects, validateCV } from "./cv.js";
import { DRIVE_SCOPE, DriveBackup } from "./drive.js";

const $ = (id) => document.getElementById(id);
const LOCAL_KEY = "curriculum.cv.v1";
const CLIENT_KEY = "curriculum.googleClientId";
const drive = new DriveBackup();
let cv;
let published;
let backupTimer;
let uploading = false;
let session = 0;
let pending = [];
let googleScript;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(text, url, className) {
  const anchor = node("a", text, className);
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}

function section(number, title) {
  const wrapper = node("section", undefined, "cv-section");
  const heading = node("h2", undefined, "section-label");
  heading.append(node("span", number, "section-number"), document.createTextNode(title));
  const content = node("div");
  wrapper.append(heading, content);
  $("curriculum").append(wrapper);
  return content;
}

function render() {
  const main = $("curriculum");
  main.replaceChildren();
  document.title = `${cv.name} — Curriculum & selected work`;
  const hero = node("section", undefined, "hero");
  hero.append(node("p", "Curriculum / Selected work", "eyebrow"), node("h1", cv.name), node("p", cv.headline, "headline"));
  const contact = node("div", undefined, "contact");
  if (cv.location) contact.append(node("span", cv.location));
  if (cv.email) contact.append(link(cv.email, `mailto:${encodeURIComponent(cv.email)}`));
  if (safeURL(cv.website)) contact.append(link(cv.website, safeURL(cv.website)));
  hero.append(contact);
  main.append(hero);
  const about = section("01", "About");
  about.append(node("p", cv.summary, "summary"));
  if (cv.skills.length) {
    const skills = node("ul", undefined, "tags");
    cv.skills.forEach((skill) => skills.append(node("li", skill)));
    about.append(skills);
  }
  const experience = section("02", "Experience");
  if (!cv.experience.length) experience.append(node("p", "Experience will be added here.", "empty"));
  for (const item of cv.experience) {
    const entry = node("article", undefined, "entry");
    entry.append(node("h3", item.role), node("p", [item.organization, item.period].filter(Boolean).join(" · "), "meta"), node("p", item.description));
    experience.append(entry);
  }
  for (const [key, number, title] of [
    ["companyProjects", "03", "on-the-edge"],
    ["personalProjects", "04", "Personal projects"],
  ]) {
    const content = section(number, title);
    if (!cv[key].length) content.append(node("p", "Selected projects coming soon.", "empty"));
    for (const item of sortedProjects(cv[key])) {
      const entry = node("article", undefined, "entry");
      entry.append(node("h3", item.name), node("p", [item.date, item.technologies].filter(Boolean).join(" · "), "meta"), node("p", item.description));
      if (safeURL(item.url)) entry.append(link("View project ↗", safeURL(item.url), "project-link"));
      content.append(entry);
    }
  }
}

const labels = {
  name: "Name", headline: "Headline", location: "Location", email: "Email",
  website: "Website", summary: "About you", skills: "Skills (comma-separated)",
  role: "Role", organization: "Organization", period: "Period (e.g. 2023 – present)",
  description: "Description", url: "Project URL", technologies: "Technologies", date: "Date",
};

function field(key, value, collection, index) {
  const label = node("label", labels[key] || key);
  const multiline = ["summary", "description"].includes(key);
  if (multiline) label.className = "wide";
  const input = document.createElement(multiline ? "textarea" : "input");
  if (!multiline) input.type = key === "date" ? "month" : key === "email" ? "email" : ["website", "url"].includes(key) ? "url" : "text";
  input.value = value;
  input.maxLength = 20000;
  input.dataset.field = key;
  if (collection) {
    input.dataset.collection = collection;
    input.dataset.index = index;
  }
  if (key === "name" && !collection) input.required = true;
  label.append(input);
  return label;
}

function renderEditor() {
  const form = $("cv-form");
  form.replaceChildren();
  profileFields.forEach((key) => form.append(field(key, cv[key])));
  form.append(field("skills", cv.skills.join(", ")));
  for (const [collection, fields] of Object.entries(collectionFields)) {
    const group = node("fieldset");
    group.append(node("legend", { experience: "Experience", companyProjects: "on-the-edge projects", personalProjects: "Personal projects" }[collection]));
    cv[collection].forEach((item, index) => {
      const entry = node("div", undefined, "edit-entry");
      fields.forEach((key) => entry.append(field(key, item[key], collection, index)));
      const remove = node("button", "Remove entry", "remove");
      remove.type = "button";
      remove.addEventListener("click", () => {
        cv[collection].splice(index, 1);
        changed();
        renderEditor();
      });
      entry.append(remove);
      group.append(entry);
    });
    const add = node("button", "Add entry");
    add.type = "button";
    add.disabled = cv[collection].length >= 100;
    add.addEventListener("click", () => {
      cv[collection].push(Object.fromEntries(fields.map((key) => [key, ""])));
      changed();
      renderEditor();
      $("cv-form").querySelectorAll(`[data-collection="${collection}"][data-field="${fields[0]}"]`).item(cv[collection].length - 1).focus();
    });
    group.append(add);
    form.append(group);
  }
}

function persist(options) {
  const snapshot = validateCV(cv, options);
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot));
    $("local-status").textContent = "Saved in this browser. Not yet published to the website.";
  } catch {
    $("local-status").textContent = "Browser storage is unavailable or full. Download your CV data to keep your changes.";
  }
  return snapshot;
}

function changed() {
  render();
  clearTimeout(backupTimer);
  backupTimer = null;
  try {
    const snapshot = persist({ allowEmptyName: true });
    if (!snapshot.name.trim()) {
      $("local-status").textContent += " Enter a name before JSON export or Drive backup.";
      return;
    }
    if (drive.token) {
      $("drive-status").textContent = "Changes saved locally. Waiting to back up…";
      backupTimer = setTimeout(() => {
        backupTimer = null;
        enqueue(snapshot);
      }, 1000);
    }
  } catch (error) {
    $("local-status").textContent = `${error.message} This edit has not been saved.`;
  }
}

function updateDriveButtons() {
  $("backup").disabled = !drive.connected;
  $("restore").disabled = !drive.connected;
  $("disconnect").hidden = !drive.token;
  $("connect").textContent = drive.token ? "Reconnect Drive" : "Connect Drive";
}

function enqueue(snapshot) {
  pending.push(snapshot);
  flush();
}

async function flush() {
  if (uploading) return;
  const currentSession = session;
  uploading = true;
  try {
    while (pending.length && currentSession === session) {
      $("drive-status").textContent = `Backing up to Google Drive (${pending.length} pending)…`;
      await drive.save(pending[0]);
      if (currentSession !== session) return;
      pending.shift();
    }
    if (currentSession === session) $("drive-status").textContent = "Saved to Google Drive as a private revision.";
  } catch (error) {
    if (currentSession === session) $("drive-status").textContent = `${error.message} Changes remain in this browser; reconnect or use Back up now to retry.`;
  } finally {
    uploading = false;
    updateDriveButtons();
    if (currentSession !== session && pending.length && drive.connected) flush();
  }
}

function loadGoogle() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        googleScript = null;
        reject(new Error("Could not load Google sign-in. Check your connection and try again."));
      };
      document.head.append(script);
    });
  }
  return googleScript;
}

function setEditor(open) {
  $("editor").hidden = !open;
  $("edit-toggle").setAttribute("aria-expanded", String(open));
  if (open) $("cv-form").querySelector("input").focus();
  else $("edit-toggle").focus();
}

$("edit-toggle").addEventListener("click", () => setEditor($("editor").hidden));
$("close-editor").addEventListener("click", () => setEditor(false));
$("print").addEventListener("click", () => window.print());
$("cv-form").addEventListener("submit", (event) => event.preventDefault());
$("cv-form").addEventListener("input", ({ target }) => {
  const { field: key, collection, index } = target.dataset;
  if (!key) return;
  if (collection) cv[collection][index][key] = target.value;
  else cv[key] = key === "skills" ? target.value.split(",").map((skill) => skill.trim()).filter(Boolean) : target.value;
  changed();
});
$("download").addEventListener("click", () => {
  try {
    const url = URL.createObjectURL(new Blob([JSON.stringify(validateCV(cv), null, 2) + "\n"], { type: "application/json" }));
    const anchor = node("a");
    anchor.href = url;
    anchor.download = "cv.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    $("local-status").textContent = error.message;
  }
});
$("import").addEventListener("change", async ({ target }) => {
  const file = target.files[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error("Please import a CV JSON file smaller than 1 MB.");
    const imported = validateCV(JSON.parse(await file.text()));
    if (!confirm("Replace the CV in this browser with the imported data?")) return;
    cv = imported;
    changed();
    renderEditor();
  } catch {
    $("local-status").textContent = "Import failed. Use a valid CV JSON file (under 1 MB) exported by this site.";
  } finally {
    target.value = "";
  }
});
$("reset").addEventListener("click", () => {
  if (!published || !confirm("Replace your browser draft with the published CV?")) return;
  cv = structuredClone(published);
  changed();
  renderEditor();
});
$("connect").addEventListener("click", async () => {
  const requestSession = session;
  const clientId = $("client-id").value.trim();
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    $("drive-status").textContent = "Enter your Google web application OAuth client ID. See the README for setup.";
    return;
  }
  $("connect").disabled = true;
  $("drive-status").textContent = "Opening Google sign-in…";
  try {
    await loadGoogle();
    if (requestSession !== session) return;
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (requestSession !== session) {
          if (response.access_token) google.accounts.oauth2.revoke(response.access_token, () => {});
          return;
        }
        $("connect").disabled = false;
        if (response.error || !response.access_token || !google.accounts.oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
          $("drive-status").textContent = "Drive access was not granted. Local saving still works.";
          return;
        }
        drive.connect(response.access_token, response.expires_in);
        try { localStorage.setItem(CLIENT_KEY, clientId); } catch { /* Optional convenience only. */ }
        updateDriveButtons();
        $("drive-status").textContent = "Connected. New edits will be backed up automatically. Back up now to save this draft, or restore your latest backup.";
        if (pending.length) flush();
      },
      error_callback: () => {
        if (requestSession !== session) return;
        $("connect").disabled = false;
        $("drive-status").textContent = "Sign-in was closed or blocked. Allow the popup and try again.";
      },
    });
    client.requestAccessToken();
  } catch (error) {
    if (requestSession !== session) return;
    $("connect").disabled = false;
    $("drive-status").textContent = error.message;
  }
});
$("backup").addEventListener("click", () => {
  try {
    clearTimeout(backupTimer);
    backupTimer = null;
    enqueue(persist());
  } catch (error) {
    $("drive-status").textContent = error.message;
  }
});
$("restore").addEventListener("click", async () => {
  if (uploading || pending.length || backupTimer) {
    $("drive-status").textContent = "Wait for pending backups to finish before restoring.";
    return;
  }
  if (!confirm("Replace your browser CV with the latest Google Drive backup?")) return;
  const currentSession = session;
  const before = JSON.stringify(cv);
  $("restore").disabled = true;
  try {
    const restored = validateCV(await drive.latest());
    if (currentSession !== session) return;
    if (JSON.stringify(cv) !== before) throw new Error("The CV changed during restore. Please try again.");
    cv = restored;
    changed();
    renderEditor();
    $("drive-status").textContent = "Restored the latest Google Drive backup.";
  } catch (error) {
    if (currentSession === session) $("drive-status").textContent = error.message;
  } finally {
    updateDriveButtons();
  }
});
$("disconnect").addEventListener("click", () => {
  if (pending.length && !confirm("Disconnect with unsent backups? Your latest CV will remain saved locally.")) return;
  session++;
  clearTimeout(backupTimer);
  backupTimer = null;
  pending = [];
  const token = drive.token;
  drive.disconnect();
  $("connect").disabled = false;
  if (token && globalThis.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
  updateDriveButtons();
  $("drive-status").textContent = "Disconnected. Changes will only be saved in this browser.";
});

async function init() {
  let draft;
  let storageMessage = "";
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) draft = validateCV(JSON.parse(saved), { allowEmptyName: true });
    $("client-id").value = localStorage.getItem(CLIENT_KEY) || "";
  } catch {
    storageMessage = "Could not read your saved draft. Browser storage may be unavailable or the draft invalid.";
  }
  try {
    const response = await fetch("./cv.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load the published CV.");
    published = validateCV(await response.json());
  } catch {
    if (!draft) {
      $("loading").textContent = "Could not load the curriculum. Please refresh or check that cv.json is available.";
      return;
    }
    $("reset").disabled = true;
  }
  cv = draft || structuredClone(published);
  render();
  renderEditor();
  $("local-status").textContent = storageMessage || (draft ? "Loaded your private browser draft." : "Showing the published CV. Edit to create a private browser draft.");
  $("edit-toggle").disabled = false;
  $("print").disabled = false;
}

init();
