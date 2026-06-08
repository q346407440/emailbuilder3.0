import type { SectionMaster } from "../types/master";
import { countSectionContentBlocks } from "./sectionMasterOps";

export type SectionCatalogItem = {
  masterId: string;
  name: string;
  blockCount: number;
};

export function toSectionCatalogItems(masters: SectionMaster[]): SectionCatalogItem[] {
  return masters.map((m) => ({
    masterId: m.masterId,
    name: m.name,
    blockCount: countSectionContentBlocks(m),
  }));
}
