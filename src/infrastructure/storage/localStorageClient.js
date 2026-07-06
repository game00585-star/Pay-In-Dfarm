export class LocalStorageClient {
  constructor({ namespace = 'dfarm_architecture' } = {}) {
    this.namespace = namespace;
  }

  key(name) {
    return `${this.namespace}_${name}`;
  }

  read(name, fallback) {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const value = localStorage.getItem(this.key(name));
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  write(name, value) {
    if (typeof localStorage === 'undefined') return value;
    localStorage.setItem(this.key(name), JSON.stringify(value));
    return value;
  }

  remove(name) {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key(name));
  }
}

