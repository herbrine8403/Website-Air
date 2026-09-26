/**
 * Minecraft Java Edition 正式版本列表（最新正式版 ~ 1.1，不含快照/预发布版）
 * 按发布时间倒序排列（最新在前）
 *
 * 数据来源：
 * - https://minecraft.fandom.com/wiki/Java_Edition_version_history
 * - https://zh.minecraft.wiki/w/Java%E7%89%88%E7%89%88%E6%9C%AC%E8%AE%B0%E5%BD%95
 * - https://feedback.minecraft.net/hc/en-us/sections/360001186971-Release-Changelogs
 */

export interface McVersion {
  /** 版本号，如 "1.21.8" */
  v: string;
  /** 发布日期（YYYY-MM-DD），用于排序展示 */
  date: string;
  /** 所属主更新代号（可选，便于分组展示） */
  drop?: string;
}

/**
 * 全部正式版列表（最新 ~ 1.1），按发布时间倒序。
 * 注意：1.7.10 / 1.8.9 / 1.12.2 等长青版本被启动器社区广泛使用，已全部包含。
 */
export const MC_VERSIONS: McVersion[] = [
  // ===== 26.x 系列（2026，年度版本号） =====
  { v: '26.2', date: '2026-06-16', drop: 'Chaos Cubed 混沌立方' },
  { v: '26.1.2', date: '2026-04-22', drop: '小鬼当家' },
  { v: '26.1.1', date: '2026-04-20', drop: '小鬼当家' },
  { v: '26.1', date: '2026-03-24', drop: '小鬼当家' },

  // ===== 1.21.x 系列 Tricky Trials 巧妙试炼（2024-2025） =====
  { v: '1.21.9', date: '2025-09-23', drop: 'The Copper Age 铜之纪元' },
  { v: '1.21.8', date: '2025-07-15', drop: 'Tricky Trials' },
  { v: '1.21.7', date: '2025-06-30', drop: 'Chase the Skies 追逐天空' },
  { v: '1.21.6', date: '2025-06-17', drop: 'Chase the Skies 追逐天空' },
  { v: '1.21.5', date: '2025-03-25', drop: 'Spring to Life 春意盎然' },
  { v: '1.21.4', date: '2024-12-03', drop: 'The Garden Awakens 苍园觉醒' },
  { v: '1.21.3', date: '2024-10-23', drop: 'Bundles of Bravery 勇气捆束' },
  { v: '1.21.2', date: '2024-10-22', drop: 'Bundles of Bravery 勇气捆束' },
  { v: '1.21.1', date: '2024-08-08', drop: 'Tricky Trials' },
  { v: '1.21', date: '2024-06-13', drop: 'Tricky Trials 巧妙试炼' },

  // ===== 1.20.x 系列 Trails & Tales 足迹与故事（2023-2024） =====
  { v: '1.20.6', date: '2024-04-29', drop: 'Trails & Tales' },
  { v: '1.20.5', date: '2024-04-23', drop: 'Trails & Tales' },
  { v: '1.20.4', date: '2023-12-07', drop: 'Trails & Tales' },
  { v: '1.20.3', date: '2023-12-05', drop: 'Trails & Tales' },
  { v: '1.20.2', date: '2023-09-21', drop: 'Trails & Tales' },
  { v: '1.20.1', date: '2023-06-12', drop: 'Trails & Tales' },
  { v: '1.20', date: '2023-06-07', drop: 'Trails & Tales 足迹与故事' },

  // ===== 1.19.x 系列 The Wild Update 荒野更新（2022-2023） =====
  { v: '1.19.4', date: '2023-03-14', drop: 'The Wild Update' },
  { v: '1.19.3', date: '2022-12-07', drop: 'The Wild Update' },
  { v: '1.19.2', date: '2022-08-05', drop: 'The Wild Update' },
  { v: '1.19.1', date: '2022-07-27', drop: 'The Wild Update' },
  { v: '1.19', date: '2022-06-07', drop: 'The Wild Update 荒野更新' },

  // ===== 1.18.x 系列 Caves & Cliffs Part II 洞穴与悬崖 第二部分（2021-2022） =====
  { v: '1.18.2', date: '2022-02-28', drop: 'Caves & Cliffs II' },
  { v: '1.18.1', date: '2021-12-10', drop: 'Caves & Cliffs II' },
  { v: '1.18', date: '2021-11-30', drop: 'Caves & Cliffs II 洞穴与悬崖' },

  // ===== 1.17.x 系列 Caves & Cliffs Part I 洞穴与悬崖 第一部分（2021） =====
  { v: '1.17.1', date: '2021-07-06', drop: 'Caves & Cliffs I' },
  { v: '1.17', date: '2021-06-08', drop: 'Caves & Cliffs I 洞穴与悬崖' },

  // ===== 1.16.x 系列 Nether Update 下界更新（2020-2021） =====
  { v: '1.16.5', date: '2021-01-15', drop: 'Nether Update' },
  { v: '1.16.4', date: '2020-11-02', drop: 'Nether Update' },
  { v: '1.16.3', date: '2020-09-10', drop: 'Nether Update' },
  { v: '1.16.2', date: '2020-08-11', drop: 'Nether Update' },
  { v: '1.16.1', date: '2020-06-24', drop: 'Nether Update' },
  { v: '1.16', date: '2020-06-23', drop: 'Nether Update 下界更新' },

  // ===== 1.15.x 系列 Buzzy Bees 嗡嗡蜂群（2019-2020） =====
  { v: '1.15.2', date: '2020-01-21', drop: 'Buzzy Bees' },
  { v: '1.15.1', date: '2019-12-17', drop: 'Buzzy Bees' },
  { v: '1.15', date: '2019-12-10', drop: 'Buzzy Bees 嗡嗡蜂群' },

  // ===== 1.14.x 系列 Village & Pillage 村庄与掠夺（2019） =====
  { v: '1.14.4', date: '2019-07-19', drop: 'Village & Pillage' },
  { v: '1.14.3', date: '2019-06-24', drop: 'Village & Pillage' },
  { v: '1.14.2', date: '2019-05-27', drop: 'Village & Pillage' },
  { v: '1.14.1', date: '2019-05-13', drop: 'Village & Pillage' },
  { v: '1.14', date: '2019-04-23', drop: 'Village & Pillage 村庄与掠夺' },

  // ===== 1.13.x 系列 Update Aquatic 水域更新（2018） =====
  { v: '1.13.2', date: '2018-10-22', drop: 'Update Aquatic' },
  { v: '1.13.1', date: '2018-08-22', drop: 'Update Aquatic' },
  { v: '1.13', date: '2018-07-18', drop: 'Update Aquatic 水域更新' },

  // ===== 1.12.x 系列 World of Color 缤纷世界（2017） =====
  { v: '1.12.2', date: '2017-09-18', drop: 'World of Color' },
  { v: '1.12.1', date: '2017-08-03', drop: 'World of Color' },
  { v: '1.12', date: '2017-06-07', drop: 'World of Color 缤纷世界' },

  // ===== 1.11.x 系列 Exploration Update 探险更新（2016） =====
  { v: '1.11.2', date: '2016-12-21', drop: 'Exploration Update' },
  { v: '1.11.1', date: '2016-12-20', drop: 'Exploration Update' },
  { v: '1.11', date: '2016-11-14', drop: 'Exploration Update 探险更新' },

  // ===== 1.10.x 系列 Frostburn Update 霜灼更新（2016） =====
  { v: '1.10.2', date: '2016-06-23', drop: 'Frostburn Update' },
  { v: '1.10.1', date: '2016-06-22', drop: 'Frostburn Update' },
  { v: '1.10', date: '2016-06-08', drop: 'Frostburn Update 霜灼更新' },

  // ===== 1.9.x 系列 Combat Update 战斗更新（2016） =====
  { v: '1.9.4', date: '2016-05-10', drop: 'Combat Update' },
  { v: '1.9.3', date: '2016-05-03', drop: 'Combat Update' },
  { v: '1.9.2', date: '2016-03-30', drop: 'Combat Update' },
  { v: '1.9.1', date: '2016-03-30', drop: 'Combat Update' },
  { v: '1.9', date: '2016-02-29', drop: 'Combat Update 战斗更新' },

  // ===== 1.8.x 系列 Bountiful Update 丰收更新（2014-2015） =====
  { v: '1.8.9', date: '2015-12-09', drop: 'Bountiful Update' },
  { v: '1.8.8', date: '2015-07-01', drop: 'Bountiful Update' },
  { v: '1.8.7', date: '2015-04-02', drop: 'Bountiful Update' },
  { v: '1.8.6', date: '2015-03-25', drop: 'Bountiful Update' },
  { v: '1.8.5', date: '2015-03-20', drop: 'Bountiful Update' },
  { v: '1.8.4', date: '2015-04-17', drop: 'Bountiful Update' },
  { v: '1.8.3', date: '2015-02-20', drop: 'Bountiful Update' },
  { v: '1.8.2', date: '2015-02-19', drop: 'Bountiful Update' },
  { v: '1.8.1', date: '2014-11-24', drop: 'Bountiful Update' },
  { v: '1.8', date: '2014-09-02', drop: 'Bountiful Update 丰收更新' },

  // ===== 1.7.x 系列 The Update that Changed the World 改变世界的更新（2013-2014） =====
  { v: '1.7.10', date: '2014-06-26', drop: 'Changed the World' },
  { v: '1.7.9', date: '2014-04-14', drop: 'Changed the World' },
  { v: '1.7.8', date: '2014-04-09', drop: 'Changed the World' },
  { v: '1.7.7', date: '2014-04-09', drop: 'Changed the World' },
  { v: '1.7.6', date: '2014-04-09', drop: 'Changed the World' },
  { v: '1.7.5', date: '2014-02-26', drop: 'Changed the World' },
  { v: '1.7.4', date: '2013-12-09', drop: 'Changed the World' },
  { v: '1.7.3', date: '2013-12-06', drop: 'Changed the World' },
  { v: '1.7.2', date: '2013-10-25', drop: 'Changed the World 改变世界的更新' },

  // ===== 1.6.x 系列 Horse Update 马匹更新（2013） =====
  { v: '1.6.4', date: '2013-09-19', drop: 'Horse Update' },
  { v: '1.6.3', date: '2013-09-19', drop: 'Horse Update' },
  { v: '1.6.2', date: '2013-07-05', drop: 'Horse Update' },
  { v: '1.6.1', date: '2013-07-01', drop: 'Horse Update' },
  { v: '1.6', date: '2013-07-01', drop: 'Horse Update 马匹更新' },

  // ===== 1.5.x 系列 Redstone Update 红石更新（2013） =====
  { v: '1.5.2', date: '2013-05-02', drop: 'Redstone Update' },
  { v: '1.5.1', date: '2013-03-21', drop: 'Redstone Update' },
  { v: '1.5', date: '2013-03-13', drop: 'Redstone Update 红石更新' },

  // ===== 1.4.x 系列 Pretty Scary Update 恐怖更新（2012） =====
  { v: '1.4.7', date: '2012-12-28', drop: 'Pretty Scary Update' },
  { v: '1.4.6', date: '2012-12-20', drop: 'Pretty Scary Update' },
  { v: '1.4.5', date: '2012-12-19', drop: 'Pretty Scary Update' },
  { v: '1.4.4', date: '2012-12-14', drop: 'Pretty Scary Update' },
  { v: '1.4.3', date: '2012-11-30', drop: 'Pretty Scary Update' },
  { v: '1.4.2', date: '2012-10-25', drop: 'Pretty Scary Update' },
  { v: '1.4.1', date: '2012-10-25', drop: 'Pretty Scary Update' },
  { v: '1.4', date: '2012-10-19', drop: 'Pretty Scary Update 恐怖更新' },

  // ===== 1.3.x 系列（2012） =====
  { v: '1.3.2', date: '2012-08-16', drop: '1.3' },
  { v: '1.3.1', date: '2012-08-01', drop: '1.3' },
  { v: '1.3', date: '2012-08-01', drop: '1.3' },

  // ===== 1.2.x 系列（2012） =====
  { v: '1.2.5', date: '2012-03-30', drop: '1.2' },
  { v: '1.2.4', date: '2012-03-22', drop: '1.2' },
  { v: '1.2.3', date: '2012-03-16', drop: '1.2' },
  { v: '1.2.2', date: '2012-03-01', drop: '1.2' },
  { v: '1.2.1', date: '2012-03-01', drop: '1.2' },
  { v: '1.2', date: '2012-03-01', drop: '1.2' },

  // ===== 1.1（2012） =====
  { v: '1.1', date: '2012-01-12', drop: '1.1' },
];

/** 仅版本号字符串数组（保持倒序），便于不关心日期的场景直接使用 */
export const MC_VERSION_STRINGS: string[] = MC_VERSIONS.map((x) => x.v);

/**
 * 按主更新代号分组的版本列表，用于 UI 分组展示。
 * 每组中的版本仍保持发布时间倒序。
 */
export interface McVersionGroup {
  /** 主更新名称（含中文译名，首次发布的版本） */
  label: string;
  /** 该主更新下的所有正式版本（倒序） */
  versions: McVersion[];
}

export const MC_VERSION_GROUPS: McVersionGroup[] = (() => {
  const groups: McVersionGroup[] = [];
  let current: McVersionGroup | null = null;
  for (const item of MC_VERSIONS) {
    if (!current || current.label !== item.drop) {
      // 新分组
      current = { label: item.drop || '其他', versions: [] };
      groups.push(current);
    }
    current.versions.push(item);
  }
  return groups;
})();
