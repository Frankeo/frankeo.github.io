const API = "https://www.googleapis.com";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

export class DriveBackup {
  constructor(fetcher = (...args) => globalThis.fetch(...args)) {
    this.fetcher = fetcher;
    this.disconnect();
  }

  connect(token, expiresIn) {
    this.token = token;
    this.expiresAt = Date.now() + Number(expiresIn) * 1000 - 30000;
  }

  disconnect() {
    this.token = null;
    this.expiresAt = 0;
  }

  get connected() {
    return Boolean(this.token) && Date.now() < this.expiresAt;
  }

  async request(path, options = {}) {
    if (!this.connected) throw new Error("Connect Google Drive again to continue backing up.");
    const response = await this.fetcher(`${API}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: "Bearer " + this.token },
    });
    if (!response.ok) {
      if (response.status === 401) this.disconnect();
      throw new Error(`Google Drive request failed (${response.status}). Reconnect or try again.`);
    }
    return response.json();
  }

  async save(cv) {
    const boundary = "curriculum_" + crypto.randomUUID();
    const metadata = { name: "curriculum-backup.json", parents: ["appDataFolder"], mimeType: "application/json" };
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`,
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(cv)}`,
      `--${boundary}--`,
    ].join("\r\n");
    return this.request("/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
  }

  async latest() {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      q: "name = 'curriculum-backup.json' and trashed = false",
      orderBy: "createdTime desc",
      pageSize: "1",
      fields: "files(id)",
    });
    const { files } = await this.request(`/drive/v3/files?${params}`);
    if (!files?.length) throw new Error("No CV backup found for this Google account and application.");
    return this.request(`/drive/v3/files/${encodeURIComponent(files[0].id)}?alt=media`);
  }
}
