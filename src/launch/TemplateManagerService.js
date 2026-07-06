const TEMPLATE_KEY = 'dfarm_launch_templates';

const DEFAULT_TEMPLATES = [
  'Shift Report',
  'Pay-in',
  'Bank Transfer',
  'MaeManee',
  'CRM',
  'Debtor',
  'Future Document'
].map((name) => ({
  templateId: name.toUpperCase().replaceAll(' ', '_'),
  name,
  version: '1.0',
  status: 'ACTIVE',
  detectionRule: `${name} local template rule`,
  updatedAt: new Date().toISOString()
}));

function readTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_KEY)) || DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export class TemplateManagerService {
  list() {
    return readTemplates();
  }

  save(template) {
    const saved = {
      templateId: template.templateId || `TPL-${Date.now()}`,
      name: template.name || 'Future Document',
      version: template.version || '1.0',
      status: template.status || 'ACTIVE',
      detectionRule: template.detectionRule || '',
      updatedAt: new Date().toISOString()
    };
    const next = this.list().some((item) => item.templateId === saved.templateId)
      ? this.list().map((item) => (item.templateId === saved.templateId ? saved : item))
      : [saved, ...this.list()];
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next));
    return saved;
  }
}

export const templateManagerService = new TemplateManagerService();
