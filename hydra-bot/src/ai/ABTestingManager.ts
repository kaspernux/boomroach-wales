/**
 * ABTestingManager.ts
 * Permet l’A/B testing de modèles IA en production.
 */

type ModelVersion = string;

interface ABTestCampaign {
    id: string;
    modelVersions: ModelVersion[];
    trafficSplit: Record<ModelVersion, number>; // e.g. { "v1": 0.5, "v2": 0.5 }
    isActive: boolean;
    results: ABTestResult[];
    startedAt: Date;
    stoppedAt?: Date;
}

interface ABTestResult {
    modelVersion: ModelVersion;
    success: boolean;
    latencyMs: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

interface ABTestReport {
    campaignId: string;
    summary: Record<ModelVersion, {
        total: number;
        successRate: number;
        avgLatency: number;
    }>;
}

export class ABTestingManager {
    private campaigns: Map<string, ABTestCampaign> = new Map();

    /**
     * Démarre une nouvelle campagne d’A/B testing.
     */
    startCampaign(
        id: string,
        modelVersions: ModelVersion[],
        trafficSplit: Record<ModelVersion, number>
    ): void {
        if (this.campaigns.has(id)) throw new Error('Campaign already exists');
        if (Object.values(trafficSplit).reduce((a, b) => a + b, 0) !== 1)
            throw new Error('Traffic split must sum to 1');
        this.campaigns.set(id, {
            id,
            modelVersions,
            trafficSplit,
            isActive: true,
            results: [],
            startedAt: new Date(),
        });
    }

    /**
     * Arrête une campagne d’A/B testing.
     */
    stopCampaign(id: string): void {
        const campaign = this.campaigns.get(id);
        if (!campaign) throw new Error('Campaign not found');
        campaign.isActive = false;
        campaign.stoppedAt = new Date();
    }

    /**
     * Route un signal vers une version de modèle selon la répartition du trafic.
     */
    routeSignal(id: string): ModelVersion {
        const campaign = this.campaigns.get(id);
        if (!campaign || !campaign.isActive) throw new Error('Active campaign not found');
        const rand = Math.random();
        let acc = 0;
        for (const version of campaign.modelVersions) {
            acc += campaign.trafficSplit[version];
            if (rand < acc) return version;
        }
        // fallback
        return campaign.modelVersions[campaign.modelVersions.length - 1];
    }

    /**
     * Collecte les résultats d’un signal traité.
     */
    recordResult(id: string, result: ABTestResult): void {
        const campaign = this.campaigns.get(id);
        if (!campaign || !campaign.isActive) throw new Error('Active campaign not found');
        campaign.results.push(result);
    }

    /**
     * Génère un rapport comparatif pour une campagne.
     */
    generateReport(id: string): ABTestReport {
        const campaign = this.campaigns.get(id);
        if (!campaign) throw new Error('Campaign not found');
        const summary: ABTestReport['summary'] = {};
        for (const version of campaign.modelVersions) {
            const results = campaign.results.filter(r => r.modelVersion === version);
            const total = results.length;
            const successRate = total ? results.filter(r => r.success).length / total : 0;
            const avgLatency = total ? results.reduce((a, b) => a + b.latencyMs, 0) / total : 0;
            summary[version] = { total, successRate, avgLatency };
        }
        return { campaignId: id, summary };
    }

    /**
     * Liste toutes les campagnes.
     */
    listCampaigns(): ABTestCampaign[] {
        return Array.from(this.campaigns.values());
    }
}