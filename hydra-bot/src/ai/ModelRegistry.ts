// src/ai/ModelRegistry.ts

export interface ModelMetadata {
    id: string;
    name: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    score?: number;
    tags?: string[];
    type?: string;
    active: boolean;
    history: ModelHistoryEntry[];
}

export interface ModelHistoryEntry {
    version: string;
    updatedAt: Date;
    metadata: Partial<ModelMetadata>;
}

export class ModelRegistry {
    private models: Map<string, ModelMetadata[]> = new Map();

    // Create a new model version
    createModel(model: Omit<ModelMetadata, 'createdAt' | 'updatedAt' | 'history'>): ModelMetadata {
        const now = new Date();
        const metadata: ModelMetadata = {
            ...model,
            createdAt: now,
            updatedAt: now,
            history: [],
        };
        if (!this.models.has(model.name)) {
            this.models.set(model.name, []);
        }
        this.models.get(model.name)!.push(metadata);
        return metadata;
    }

    // Read all versions of a model
    getModelVersions(name: string): ModelMetadata[] {
        return this.models.get(name) || [];
    }

    // Read a specific model version
    getModel(name: string, version: string): ModelMetadata | undefined {
        return this.models.get(name)?.find(m => m.version === version);
    }

    // Update a model version (stores previous state in history)
    updateModel(name: string, version: string, updates: Partial<Omit<ModelMetadata, 'createdAt' | 'history'>>): ModelMetadata | undefined {
        const models = this.models.get(name);
        if (!models) return undefined;
        const idx = models.findIndex(m => m.version === version);
        if (idx === -1) return undefined;
        const model = models[idx];
        // Save current state to history
        model.history.push({
            version: model.version,
            updatedAt: model.updatedAt,
            metadata: { ...model },
        });
        // Update fields
        Object.assign(model, updates, { updatedAt: new Date() });
        return model;
    }

    // Delete a model version
    deleteModel(name: string, version: string): boolean {
        const models = this.models.get(name);
        if (!models) return false;
        const idx = models.findIndex(m => m.version === version);
        if (idx === -1) return false;
        models.splice(idx, 1);
        if (models.length === 0) this.models.delete(name);
        return true;
    }

    // List all models
    listModels(): string[] {
        return Array.from(this.models.keys());
    }

    // List all versions with metadata for a model
    listModelVersions(name: string): ModelMetadata[] {
        return this.getModelVersions(name);
    }

    // Activate a model version
    activateModel(name: string, version: string): boolean {
        const models = this.models.get(name);
        if (!models) return false;
        models.forEach(m => m.active = false);
        const model = models.find(m => m.version === version);
        if (!model) return false;
        model.active = true;
        return true;
    }

    // Deactivate a model version
    deactivateModel(name: string, version: string): boolean {
        const model = this.getModel(name, version);
        if (!model) return false;
        model.active = false;
        return true;
    }

    // Rollback to a previous version (restores metadata from history)
    rollbackModel(name: string, version: string, rollbackToVersion: string): ModelMetadata | undefined {
        const model = this.getModel(name, version);
        if (!model) return undefined;
        const historyEntry = model.history.find(h => h.version === rollbackToVersion);
        if (!historyEntry) return undefined;
        Object.assign(model, historyEntry.metadata, { updatedAt: new Date() });
        return model;
    }

    // Restore a deleted model version (if you keep a deleted archive, not implemented here)
    // restoreModel(name: string, version: string): ModelMetadata | undefined { ... }
}