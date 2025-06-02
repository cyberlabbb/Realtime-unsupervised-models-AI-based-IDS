import React, { useState } from "react";
import { Paper, Tabs, Tab } from "@mui/material";
import AlertTable from "../components/AlertTable";
import BatchTable from "../components/BatchTable";
import PacketTable from "../components/PacketTable";

const Statistics = ({ alerts, batches, packets }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Paper elevation={4} sx={{ p: 2 }}>
      <Tabs
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Alerts" />
        <Tab label="Traffic Batches" />
        <Tab label="Captured Packets" disabled={!packets.length} />
      </Tabs>

      {activeTab === 0 && <AlertTable alerts={alerts} />}
      {activeTab === 1 && <BatchTable batches={batches} />}
      {activeTab === 2 && <PacketTable packets={packets} />}
    </Paper>
  );
};

export default Statistics;
