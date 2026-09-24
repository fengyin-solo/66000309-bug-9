import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FEAModel, FEAResult, HeatmapMode } from '../types';
import {
  solve as feaSolve,
  presetCantileverBeam,
  presetBridgeTruss,
  presetSimpleFrame,
  jetColormap,
} from '../utils/fea-solver';

// 热力图口径的唯一表示来源：中文名、单位、显示值换算
export const HEATMAP_MODES: {
  value: HeatmapMode;
  label: string;
  unit: string;
}[] = [
  { value: 'stress', label: '应力', unit: 'MPa' },
  { value: 'strain', label: '应变', unit: '%' },
  { value: 'force', label: '轴力', unit: 'kN' },
];

export const useFEAStore = defineStore('fea', () => {
  const model = ref<FEAModel>({ nodes: [], elements: [], loads: [] });
  const result = ref<FEAResult | null>(null);
  const selectedPreset = ref<string>('cantilever');
  const showDeformed = ref(false);
  const deformationScale = ref(10);
  const selectedElement = ref<number | null>(null);
  const heatmapMode = ref<HeatmapMode>('stress');

  // ─── Actions ──────────────────────────────────────────────────────────────
  function loadPreset(name: string) {
    selectedPreset.value = name;
    result.value = null;
    selectedElement.value = null;
    switch (name) {
      case 'cantilever':
        model.value = presetCantileverBeam();
        break;
      case 'bridge':
        model.value = presetBridgeTruss();
        break;
      case 'frame':
        model.value = presetSimpleFrame();
        break;
      default:
        model.value = presetCantileverBeam();
    }
  }

  function solve() {
    result.value = feaSolve(model.value);
  }

  function toggleDeformed() {
    showDeformed.value = !showDeformed.value;
  }

  function selectElement(id: number | null) {
    selectedElement.value = id;
  }

  function setHeatmapMode(mode: HeatmapMode) {
    heatmapMode.value = mode;
  }

  function addLoad(nodeId: number, fx: number, fy: number) {
    model.value.loads.push({ nodeId, fx, fy });
  }

  function toggleFixed(nodeId: number) {
    const node = model.value.nodes.find((n) => n.id === nodeId);
    if (node) node.fixed = !node.fixed;
  }

  // ─── Computed ─────────────────────────────────────────────────────────────
  const maxStress = computed(() => {
    if (!result.value) return 0;
    return result.value.maxStress;
  });

  const maxDisplacement = computed(() => {
    if (!result.value) return 0;
    return result.value.maxDisplacement;
  });

  // 当前热力图口径的中文名（侧栏 / 底部 / 图例共用这一个名称）
  const heatmapLabel = computed(
    () => HEATMAP_MODES.find((m) => m.value === heatmapMode.value)!.label
  );

  const heatmapUnit = computed(
    () => HEATMAP_MODES.find((m) => m.value === heatmapMode.value)!.unit
  );

  // 是否已有可用的计算结果；未计算 / 刚换算例时统一据此显示「未计算」
  const hasResult = computed(
    () => result.value !== null && model.value.elements.length > 0
  );

  // 当前口径下各单元（按 elements 顺序）的显示值，已换算到展示单位
  const heatmapValues = computed<number[]>(() => {
    const elements = model.value.elements;
    if (!hasResult.value) return elements.map(() => 0);
    switch (heatmapMode.value) {
      case 'stress':
        return result.value!.stresses.map((v) => v / 1e6);
      case 'strain':
        return result.value!.strains.map((v) => v * 100);
      case 'force':
        return elements.map((e) => e.force / 1000);
    }
  });

  const heatmapMax = computed(() =>
    Math.max(0, ...heatmapValues.value.map(Math.abs))
  );

  function elementHeatmapValue(id: number): number | null {
    if (!hasResult.value) return null;
    const idx = model.value.elements.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    return heatmapValues.value[idx];
  }

  const elementColors = computed(() => {
    const colors = new Map<number, string>();
    const elements = model.value.elements;

    if (!hasResult.value) {
      for (const el of elements) {
        colors.set(el.id, '#6b7280');
      }
      return colors;
    }

    const values = heatmapValues.value.map(Math.abs);
    const min = Math.min(...values);
    const max = Math.max(...values);

    for (let i = 0; i < elements.length; i++) {
      colors.set(
        elements[i].id,
        jetColormap(values[i], min, max)
      );
    }
    return colors;
  });

  return {
    model,
    result,
    selectedPreset,
    showDeformed,
    deformationScale,
    selectedElement,
    heatmapMode,
    maxStress,
    maxDisplacement,
    heatmapLabel,
    heatmapUnit,
    hasResult,
    heatmapValues,
    heatmapMax,
    elementHeatmapValue,
    elementColors,
    loadPreset,
    solve,
    toggleDeformed,
    selectElement,
    setHeatmapMode,
    addLoad,
    toggleFixed,
  };
});
