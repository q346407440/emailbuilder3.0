import { useCallback, useMemo, useState } from "react";
import { Button, Switch, Table } from "@shoplazza/sds";
import type { TableColumnsType, TablePaginationConfig } from "@shoplazza/sds";
import { CrmOpsShell } from "../components/crmOps/CrmOpsShell";
import { goToEmailCampaignCreate } from "../lib/appNavigation";
import {
  EMAIL_CAMPAIGN_MOCK_ROWS,
  EMAIL_CAMPAIGN_TOTAL,
  formatCampaignCount,
  type EmailCampaignRow,
} from "../lib/emailCampaignMockData";

const PAGE_SIZE_OPTIONS = ["20", "50", "100"] as const;

export function EmailCampaignPage() {
  const [rows, setRows] = useState(EMAIL_CAMPAIGN_MOCK_ROWS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const toggleEnabled = useCallback((id: string, checked: boolean) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, enabled: checked } : row)));
  }, []);

  const columns = useMemo((): TableColumnsType<EmailCampaignRow> => {
    return [
      { title: "活动ID", dataIndex: "id", key: "id", width: 200, ellipsis: true },
      { title: "邮件名称", dataIndex: "name", key: "name", ellipsis: true },
      { title: "更新时间", dataIndex: "updatedAt", key: "updatedAt", width: 176 },
      {
        title: "目标店铺数",
        dataIndex: "targetShops",
        key: "targetShops",
        width: 108,
        align: "right",
        render: (value: number) => formatCampaignCount(value),
      },
      {
        title: "目标邮件数",
        dataIndex: "targetEmails",
        key: "targetEmails",
        width: 108,
        align: "right",
        render: (value: number) => formatCampaignCount(value),
      },
      {
        title: "已发送店铺数",
        dataIndex: "sentShops",
        key: "sentShops",
        width: 120,
        align: "right",
        render: (value: number) => formatCampaignCount(value),
      },
      {
        title: "已发送邮件数",
        dataIndex: "sentEmails",
        key: "sentEmails",
        width: 120,
        align: "right",
        render: (value: number) => formatCampaignCount(value),
      },
      {
        title: "邮件打开率",
        dataIndex: "openRate",
        key: "openRate",
        width: 108,
        render: (value: string | null) => value ?? <span className="crm-ops__cell-muted">--</span>,
      },
      {
        title: "邮件点击率",
        dataIndex: "clickRate",
        key: "clickRate",
        width: 108,
        render: (value: string | null) => value ?? <span className="crm-ops__cell-muted">--</span>,
      },
      {
        title: "",
        key: "actions",
        width: 72,
        render: () => (
          <Button type="link" className="crm-ops__table-link">
            编辑
          </Button>
        ),
      },
      {
        title: "",
        key: "enabled",
        width: 72,
        render: (_value, record) => (
          <Switch checked={record.enabled} onChange={(checked) => toggleEnabled(record.id, checked)} />
        ),
      },
    ];
  }, [toggleEnabled]);

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total: EMAIL_CAMPAIGN_TOTAL,
    showSizeChanger: true,
    pageSizeOptions: [...PAGE_SIZE_OPTIONS],
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
    onChange: (nextPage, nextSize) => {
      setPage(nextPage);
      if (nextSize && nextSize !== pageSize) {
        setPageSize(nextSize);
      }
    },
  };

  return (
    <CrmOpsShell activeNav="emailCampaign">
      <div className="crm-ops__page-head">
        <h4 className="crm-ops__page-title">商家邮件</h4>
        <Button type="primary" onClick={goToEmailCampaignCreate}>
          创建邮件
        </Button>
      </div>

      <Table<EmailCampaignRow>
        className="crm-ops__campaign-table"
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={pagination}
      />
    </CrmOpsShell>
  );
}
