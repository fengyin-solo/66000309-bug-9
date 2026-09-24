import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FEAModel, FEAResult } from '../types';
import {
  solve as feaSolve,
  presetCantileverBeam,
  presetBridgeTruss,
  presetSimpleFrame,
  jetColormap,
} from '../utils/fea-solver';
import {
  HEATMAP_MODES,
  NOT_COMPUTED_LABEL,
  type HeatmapMode,
} from '../utils/heatmap';

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
  // 未计算（含刚切换算例、结果被清空）时一律返回 null，由 UI 统一显示「未计算」，
  // 不用 0 或横杠兜底，避免零值伪装成真实结果。
  const maxStress = computed<number | null>(() =>
    result.value ? result.value.maxStress : null
  );

  const maxDisplacement = computed<number | null>(() =>
    result.value ? result.value.maxDisplacement : null
  );

  // 当前热力图口径的元数据（中文名 / 单位 / 取值方式），三处显示都从这里取
  const heatmapMeta = computed(() => HEATMAP_MODES[heatmapMode.value]);
  const heatmapLabel = computed(() => heatmapMeta.value.label);

  // 当前口径下各单元的着色数值；未计算时为 null
  const heatmapValues = computed<number[] | null>(() => {
    if (!result.value) return null;
    return heatmapMeta.value.values(result.value, model.value.elements);
  });

  // 当前口径下的最大值（SI 单位）；未计算时为 null
  const heatmapMax = computed<number | null>(() => {
    const values = heatmapValues.value;
    if (!values || values.length === 0) return null;
    return Math.max(...values);
  });

  // 图例顶端 / 底部读数共用的展示文本；未计算时统一为「未计算」
  const heatmapMaxText = computed(() => {
    if (heatmapMax.value === null) return NOT_COMPUTED_LABEL;
    const display = heatmapMeta.value.toDisplay(heatmapMax.value);
    return `${heatmapMeta.value.format(display)} ${heatmapMeta.value.unit}`;
  });

  const elementColors = computed(() => {
    const colors = new Map<number, string>();
    const values = heatmapValues.value;
    if (!values || model.value.elements.length === 0) {
      for (const el of model.value.elements) {
        colors.set(el.id, '#6b7280');
      }
      return colors;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    for (let i = 0; i < model.value.elements.length; i++) {
      colors.set(
        model.value.elements[i].id,
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
    heatmapMaxText,
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
