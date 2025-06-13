import { ModelRegistry } from '../../ai/ModelRegistry'

describe('ModelRegistry', () => {
  it('should create, update, activate, rollback, and delete model versions', () => {
    const registry = new ModelRegistry();
    const modelA = registry.createModel({ name: 'TestModel', version: '1.0.0', active: true });
    expect(registry.listModels().length).toBe(1);

    registry.updateModel(modelA.id, { score: 0.95 });
    expect(registry.getModel(modelA.id)?.score).toBe(0.95);

    const modelB = registry.createModel({ name: 'TestModel', version: '1.1.0', active: false });
    registry.activateModel(modelB.id);
    expect(registry.getModel(modelB.id)?.active).toBe(true);

    registry.rollbackModel(modelA.id);
    expect(registry.getModel(modelA.id)?.active).toBe(true);

    registry.deleteModel(modelB.id);
    expect(registry.listModels().length).toBe(1);
  });
});