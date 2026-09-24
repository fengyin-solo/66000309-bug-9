import type { Element, FEAResult } from '../types';

// 热力图口径的唯一表示来源：侧栏、底部读数、图例都从这里取名与取值，
// 避免中文名 / 英文枚举名 / 大写英文各写一套。

export type HeatmapMode = 'stress' | 'strain' | 'force';

// 尚未求解（或刚切换算例、结果被清空）时各处统一展示的说明
export const NOT_COMPUTED_LABEL = '未计算';

export interface HeatmapMeta {
  /** 页面上唯一使用的口径名称（中文） */
  label: string;
  /** 图例使用的单位 */
  unit: string;
  /** 按当前口径取各单元用于着色的数值（绝对值，SI 单位） */
  values: (result: FEAResult, elements: Element[]) => number[];
  /** SI 值换算成展示单位下的数字 */
  toDisplay: (siValue: number) => number;
  /** 展示数值的格式化（图例顶端 / 底部读数共用） */
  format: (displayValue: number) => string;
}

export const HEATMAP_MODES: Record<HeatmapMode, HeatmapMeta> = {
  stress: {
    label: '应力',
    unit: 'MPa',
    values: (result) => result.stresses.map(Math.abs),
    toDisplay: (v) => v / 1e6,
    format: (v) => v.toExponential(2),
  },
  strain: {
    label: '应变',
    unit: '%',
    values: (result) => result.strains.map(Math.abs),
    toDisplay: (v) => v * 100,
    format: (v) => v.toExponential(2),
  },
  force: {
    label: '轴力',
    unit: 'kN',
    values: (_result, elements) => elements.map((e) => Math.abs(e.force)),
    toDisplay: (v) => v / 1000,
    format: (v) => v.toExponential(2),
  },
};

export const HEATMAP_MODE_LIST: { mode: HeatmapMode; label: string }[] = [
  { mode: 'stress', label: HEATMAP_MODES.stress.label },
  { mode: 'strain', label: HEATMAP_MODES.strain.label },
  { mode: 'force', label: HEATMAP_MODES.force.label },
];
