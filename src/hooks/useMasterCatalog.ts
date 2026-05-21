import { useCallback, useEffect, useState } from "react";
import * as api from "../api/client";
import type { BlockMaster, SectionMaster } from "../types/master";
import { parseBlockMaster, parseSectionMaster } from "../lib/masterCatalog";
import { buildBlockMasters } from "../lib/masterCatalog";

type State = {
  blockMasters: BlockMaster[];
  sectionMasters: SectionMaster[];
  loading: boolean;
  error: string | null;
};

export function useMasterCatalog(): State & { reload: () => Promise<void> } {
  const [blockMasters, setBlockMasters] = useState<BlockMaster[]>([]);
  const [sectionMasters, setSectionMasters] = useState<SectionMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [blockRes, sectionRes] = await Promise.all([
        api.listMasters("blocks"),
        api.listMasters("sections"),
      ]);
      const blocks = blockRes.items
        .map((item) => parseBlockMaster(item.master))
        .filter((item): item is BlockMaster => item !== null);
      const sections = sectionRes.items
        .map((item) => parseSectionMaster(item.master))
        .filter((item): item is SectionMaster => item !== null);
      if (blocks.length === 0 && sections.length === 0) {
        setBlockMasters(buildBlockMasters());
        setSectionMasters([]);
        setError("未从 API 读到母版数据，已回退到内置 block 默认值。");
      } else {
        setBlockMasters(blocks.length ? blocks : buildBlockMasters());
        setSectionMasters(sections);
      }
    } catch (e) {
      setBlockMasters(buildBlockMasters());
      setSectionMasters([]);
      setError(e instanceof Error ? e.message : "加载母版失败，已回退到内置 block 默认值。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { blockMasters, sectionMasters, loading, error, reload };
}
