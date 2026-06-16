import type { SectionMaster } from "../types/master";

export type SectionCatalogItem = {
  masterId: string;
  name: string;
};

export function toSectionCatalogItems(masters: SectionMaster[]): SectionCatalogItem[] {
  return masters.map((m) => ({
    masterId: m.masterId,
    name: m.name,
  }));
}
