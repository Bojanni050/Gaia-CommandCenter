import { GaiaComponent } from './types';

// V3-laagvolgorde voor de architectuurmatrix: harnas eerst, clients laatst.
export const LAYER_ORDER = ['harnas', 'geheugenpijp', 'capabilities', 'clients'] as const;

export const LAYER_META: Record<string, { title: string; subtitle: string }> = {
  harnas: {
    title: 'Harnas — Gaia Cloud',
    subtitle: 'Agency, SOUL, orkestratie en reflectie. Het model is vervangbaar.',
  },
  geheugenpijp: {
    title: 'Geheugenpijp',
    subtitle: 'Foundation (observation) → Hindsight (interpretation) → Logos (beoordeling). Eén richting.',
  },
  capabilities: {
    title: 'Capabilities',
    subtitle: 'Instrumenten onder Gaia\u2019s regie. Spreken nooit zelfstandig namens Gaia.',
  },
  clients: {
    title: 'Clients',
    subtitle: 'Presence en interface naar dezelfde Gaia. Geen instanties van haar.',
  },
};

export const EPISTEMIC_LABELS: Record<string, string> = {
  agency: 'agency',
  observation: 'observation',
  interpretation: 'interpretation',
  hypothesis: 'hypothesis',
  execution: 'executie',
  presence: 'presence',
};

export function layerOf(c: GaiaComponent): string {
  return c.layer || 'overig';
}

export function groupByLayer(components: GaiaComponent[]): { layer: string; items: GaiaComponent[] }[] {
  const groups = new Map<string, GaiaComponent[]>();
  for (const c of components) {
    const l = layerOf(c);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(c);
  }
  const ordered: { layer: string; items: GaiaComponent[] }[] = LAYER_ORDER.filter((l) => groups.has(l)).map((l) => ({
    layer: l,
    items: groups.get(l)!,
  }));
  for (const [l, items] of groups) {
    if (!(LAYER_ORDER as readonly string[]).includes(l)) ordered.push({ layer: l, items });
  }
  return ordered;
}
