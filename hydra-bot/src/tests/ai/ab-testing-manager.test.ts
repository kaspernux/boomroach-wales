import { ABTestingManager } from "../../../../src/ai/ABTestingManager";

describe("ABTestingManager", () => {
  const campaignId = "test-campaign";
  const versions = ["v1", "v2"];
  const trafficSplit = { v1: 0.5, v2: 0.5 };

  let manager: ABTestingManager;

  beforeEach(() => {
    manager = new ABTestingManager();
  });

  it("should start a new campaign", () => {
    manager.startCampaign(campaignId, versions, trafficSplit);
    const campaigns = manager.listCampaigns();
    expect(campaigns.length).toBe(1);
    expect(campaigns[0].id).toBe(campaignId);
    expect(campaigns[0].isActive).toBe(true);
  });

  it("should not allow duplicate campaign IDs", () => {
    manager.startCampaign(campaignId, versions, trafficSplit);
    expect(() =>
      manager.startCampaign(campaignId, versions, trafficSplit)
    ).toThrow("Campaign already exists");
  });

  it("should route signals according to traffic split", () => {
    manager.startCampaign(campaignId, versions, trafficSplit);
    const counts = { v1: 0, v2: 0 };
    for (let i = 0; i < 1000; i++) {
      const version = manager.routeSignal(campaignId);
      counts[version]++;
    }
    // Both versions should have been routed to, roughly equally
    expect(counts.v1).toBeGreaterThan(400);
    expect(counts.v2).toBeGreaterThan(400);
  });

  it("should record results and generate a report", () => {
    manager.startCampaign(campaignId, versions, trafficSplit);
    manager.recordResult(campaignId, {
      modelVersion: "v1",
      success: true,
      latencyMs: 100,
      timestamp: new Date(),
    });
    manager.recordResult(campaignId, {
      modelVersion: "v2",
      success: false,
      latencyMs: 200,
      timestamp: new Date(),
    });
    manager.recordResult(campaignId, {
      modelVersion: "v1",
      success: false,
      latencyMs: 150,
      timestamp: new Date(),
    });

    const report = manager.generateReport(campaignId);
    expect(report.summary.v1.total).toBe(2);
    expect(report.summary.v1.successRate).toBeCloseTo(0.5);
    expect(report.summary.v1.avgLatency).toBe(125);
    expect(report.summary.v2.total).toBe(1);
    expect(report.summary.v2.successRate).toBe(0);
    expect(report.summary.v2.avgLatency).toBe(200);
  });

  it("should stop a campaign", () => {
    manager.startCampaign(campaignId, versions, trafficSplit);
    manager.stopCampaign(campaignId);
    const campaigns = manager.listCampaigns();
    expect(campaigns[0].isActive).toBe(false);
    expect(campaigns[0].stoppedAt).toBeInstanceOf(Date);
  });

  it("should throw if routing or recording on inactive campaign", () => {
    manager.startCampaign(campaignId, versions, trafficSplit);
    manager.stopCampaign(campaignId);
    expect(() => manager.routeSignal(campaignId)).toThrow();
    expect(() =>
      manager.recordResult(campaignId, {
        modelVersion: "v1",
        success: true,
        latencyMs: 100,
        timestamp: new Date(),
      })
    ).toThrow();
  });
});